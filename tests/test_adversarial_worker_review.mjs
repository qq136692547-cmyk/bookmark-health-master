import worker from "../webhook-worker/src/paddle-worker.js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load prod Ed25519 private key
const privKeyData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../private-keys/bhm_prod_ed25519_private.json"), "utf8"));
const webhookSecret = "pdl_whsec_adversarial_test_secret_987654";

// In-memory KV mock
class MockKV {
  constructor() {
    this.store = new Map();
  }
  async get(key) {
    return this.store.get(key) || null;
  }
  async put(key, val, options) {
    this.store.set(key, String(val));
  }
}

const mockKv = new MockKV();
const env = {
  PADDLE_WEBHOOK_SECRET: webhookSecret,
  ED25519_PRIVATE_KEY_B64: privKeyData.privateKeyPkcs8Base64,
  BHM_LICENSES_KV: mockKv
};

function generateSignatureHeader(body, secret, offsetSec = 0) {
  const ts = Math.floor(Date.now() / 1000) + offsetSec;
  const hash = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${hash}`;
}

async function runAdversarialWorkerTests() {
  console.log("================================================================================");
  console.log("   ADVERSARIAL STRESS TEST: Cloudflare Worker & Paddle Integration               ");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function assertTest(name, cond) {
    total++;
    if (cond) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      throw new Error(`Test failed: ${name}`);
    }
  }

  // 1. OPTIONS preflight
  const reqOptions = new Request("https://worker.test/webhook", {
    method: "OPTIONS",
    headers: { "Origin": "https://bhm-pro-ern.pages.dev", "Access-Control-Request-Headers": "Paddle-Signature" }
  });
  const resOptions = await worker.fetch(reqOptions, env);
  assertTest("OPTIONS returns 204", resOptions.status === 204);
  assertTest("OPTIONS header allows Paddle-Signature", resOptions.headers.get("Access-Control-Allow-Headers").includes("Paddle-Signature"));

  // 2. Webhook without signature header -> 401
  const reqNoSig = new Request("https://worker.test/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: "transaction.paid" })
  });
  const resNoSig = await worker.fetch(reqNoSig, env);
  assertTest("Missing signature returns 401 JSON", resNoSig.status === 401 && resNoSig.headers.get("content-type").includes("application/json"));

  // 3. Webhook with expired signature (>300s) -> 401
  const body1 = JSON.stringify({
    event_type: "transaction.paid",
    event_id: "evt_expired_1",
    data: { id: "txn_expired_1", status: "paid" }
  });
  const reqExpired = new Request("https://worker.test/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Paddle-Signature": generateSignatureHeader(body1, webhookSecret, -350)
    },
    body: body1
  });
  const resExpired = await worker.fetch(reqExpired, env);
  assertTest("Expired signature (-350s) returns 401", resExpired.status === 401);

  // 4. Webhook with tampered body -> 401
  const reqTampered = new Request("https://worker.test/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Paddle-Signature": generateSignatureHeader(body1, webhookSecret)
    },
    body: body1 + " " // modified payload
  });
  const resTampered = await worker.fetch(reqTampered, env);
  assertTest("Tampered body returns 401", resTampered.status === 401);

  // 5. Valid Webhook with transaction.paid -> 200 & mints license with sub and 9999999 quota
  const paidBody = JSON.stringify({
    event_type: "transaction.paid",
    event_id: "evt_valid_101",
    data: {
      id: "txn_order_2026_001",
      status: "paid",
      customer: { email: "alice@test.com" },
      custom_data: { tier: "LTD" },
      details: { totals: { total: 2490 } }
    }
  });
  const reqPaid = new Request("https://worker.test/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Paddle-Signature": generateSignatureHeader(paidBody, webhookSecret)
    },
    body: paidBody
  });
  const resPaid = await worker.fetch(reqPaid, env);
  const dataPaid = await resPaid.json();
  assertTest("transaction.paid returns 200 OK", resPaid.status === 200 && dataPaid.success === true);
  assertTest("transaction.paid mints valid key", typeof dataPaid.licenseKey === "string" && dataPaid.licenseKey.startsWith("BHM1."));

  // Check KV record
  const savedOrderStr = await mockKv.get("order:txn_order_2026_001");
  const savedOrder = JSON.parse(savedOrderStr);
  assertTest("KV order sub is clean email", savedOrder.payload.sub === "alice@test.com");
  assertTest("KV order maxCleanQuota is 9999999", savedOrder.payload.maxCleanQuota === 9999999);
  assertTest("KV order exp is 100yr into future", savedOrder.payload.exp > Date.now() / 1000 + 30000 * 86400);

  // 6. Idempotency test: Replaying the same webhook -> returns duplicated: true
  const reqReplay = new Request("https://worker.test/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Paddle-Signature": generateSignatureHeader(paidBody, webhookSecret)
    },
    body: paidBody
  });
  const resReplay = await worker.fetch(reqReplay, env);
  const dataReplay = await resReplay.json();
  assertTest("Replayed event_id returns 200 with duplicated: true", resReplay.status === 200 && dataReplay.duplicated === true);

  // 7. GET /license self-service retrieval
  const reqLookup = new Request("https://worker.test/license?order_id=txn_order_2026_001&email=alice@test.com");
  const resLookup = await worker.fetch(reqLookup, env);
  const dataLookup = await resLookup.json();
  assertTest("/license retrieves license key successfully", resLookup.status === 200 && dataLookup.success === true && dataLookup.licenseKey === dataPaid.licenseKey);

  // 8. GET /license with mismatched email -> 404
  const reqBadEmail = new Request("https://worker.test/license?order_id=txn_order_2026_001&email=eve@attacker.com");
  const resBadEmail = await worker.fetch(reqBadEmail, env);
  assertTest("/license with wrong email returns 404", resBadEmail.status === 404);

  // 9. POST /v1/licenses/verify before refund -> valid: true
  const reqVerifyActive = new Request("https://worker.test/v1/licenses/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ licenseKey: dataPaid.licenseKey })
  });
  const resVerifyActive = await worker.fetch(reqVerifyActive, env);
  const dataVerifyActive = await resVerifyActive.json();
  assertTest("POST /v1/licenses/verify reports active key valid: true", dataVerifyActive.valid === true && dataVerifyActive.revoked === false);

  // 10. Process refund webhook: adjustment.updated
  const refundBody = JSON.stringify({
    event_type: "adjustment.updated",
    event_id: "evt_refund_999",
    data: {
      id: "adj_999",
      action: "refund",
      transaction_id: "txn_order_2026_001"
    }
  });
  const reqRefund = new Request("https://worker.test/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Paddle-Signature": generateSignatureHeader(refundBody, webhookSecret)
    },
    body: refundBody
  });
  const resRefund = await worker.fetch(reqRefund, env);
  assertTest("Refund adjustment webhook succeeds", resRefund.status === 200);

  // 11. After refund: GET /license must return 403 Forbidden!
  const reqLookupRefunded = new Request("https://worker.test/license?order_id=txn_order_2026_001&email=alice@test.com");
  const resLookupRefunded = await worker.fetch(reqLookupRefunded, env);
  assertTest("GET /license after refund returns 403 Forbidden", resLookupRefunded.status === 403);

  // 12. After refund: POST /v1/licenses/verify must report revoked!
  const reqVerifyRevoked = new Request("https://worker.test/v1/licenses/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ licenseKey: dataPaid.licenseKey })
  });
  const resVerifyRevoked = await worker.fetch(reqVerifyRevoked, env);
  const dataVerifyRevoked = await resVerifyRevoked.json();
  assertTest("POST /v1/licenses/verify reports revoked: true", dataVerifyRevoked.valid === false && dataVerifyRevoked.revoked === true);

  // 13. Single Wash tier verification ($9.90 / 990 cents)
  const singleWashBody = JSON.stringify({
    event_type: "transaction.completed",
    event_id: "evt_single_wash_1",
    data: {
      id: "txn_single_001",
      status: "completed",
      customer: { email: "bob@test.com" },
      items: [{ price_id: "pri_01m708ecngjxf937bz9zcs9m6f" }],
      details: { totals: { total: 990 } }
    }
  });
  const reqSingle = new Request("https://worker.test/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Paddle-Signature": generateSignatureHeader(singleWashBody, webhookSecret)
    },
    body: singleWashBody
  });
  const resSingle = await worker.fetch(reqSingle, env);
  const dataSingle = await resSingle.json();
  assertTest("Single Wash $9.90 issues SINGLE_WASH tier", dataSingle.tier === "SINGLE_WASH");
  const singleOrder = JSON.parse(await mockKv.get("order:txn_single_001"));
  assertTest("Single Wash quota is 500", singleOrder.payload.maxCleanQuota === 500);

  console.log("\n================================================================================");
  console.log(`🎉 ALL ${passed}/${total} ADVERSARIAL STRESS CHECKS PASSED (100%)!`);
  console.log("================================================================================\n");
}

runAdversarialWorkerTests().catch(err => {
  console.error("Adversarial worker test failed:", err);
  process.exit(1);
});
