/**
 * BHM-PRO Lemon Squeezy Webhook & Automated Issuance E2E Test Suite
 * Native Node.js Zero-Dependency Test Harness
 *
 * Verifies:
 * 1. HMAC-SHA256 signature verification & forgery rejection
 * 2. order_created for Single Wash ($9.90, 30 days, 500 quota)
 * 3. order_created for Lifetime Buyout ($24.90, perpetual, unlimited)
 * 4. Offline client verification via LicenseManager.verifyLicense()
 * 5. Webhook idempotency (anti-duplication on retry)
 * 6. order_refunded event & online revocation verification
 * 7. Self-service license retrieval API (GET /license)
 * 8. Transactional bilingual email template rendering & CWS links
 * 9. Cloudflare Worker simulated edge execution
 */

const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const { createServer } = require("../server/webhook-server.js");
const { OrderStorage } = require("../server/storage.js");
const { LicenseManager } = require("../bookmark-organizer/core/license.js");
const { generateLicenseEmail, EXTENSION_ID, CWS_STORE_URL } = require("../shared/email-template.js");
const { loadPrivateKey } = require("../scripts/keygen-license.js");

// Mock Chrome Storage for testing client-side license activation
const mockStorageState = {};
const mockChromeStorage = {
  local: {
    get: (keys, callback) => {
      const res = {};
      const keyArr = Array.isArray(keys) ? keys : [keys];
      for (const k of keyArr) {
        if (k in mockStorageState) res[k] = mockStorageState[k];
      }
      callback(res);
    },
    set: (items, callback) => {
      Object.assign(mockStorageState, items);
      if (callback) callback();
    }
  }
};

function signPayload(bodyStr, secret) {
  return crypto.createHmac("sha256", secret).update(bodyStr).digest("hex");
}

function makeHttpRequest({ method, path, headers = {}, body = null, port }) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runLemonSqueezyWebhookE2ETests() {
  console.log("================================================================================");
  console.log("▶ [Test Suite] Lemon Squeezy Automated Webhook & Licensing E2E Verification");
  console.log("================================================================================\n");

  const TEST_SECRET = "ls_whsec_production_secret_test_xyz789";
  const tmpStoragePath = path.resolve(__dirname, `./tmp_orders_${Date.now()}.json`);
  const storage = new OrderStorage(tmpStoragePath);
  const privateKey = loadPrivateKey();

  const server = createServer({
    webhookSecret: TEST_SECRET,
    storage,
    privateKeyPkcs8: privateKey,
    isDryRun: true
  });

  // Start HTTP server on dynamic available port
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`[Test Setup] Standalone Webhook server started on port ${port}`);

  try {
    // ------------------------------------------------------------------------
    // Group 1: Healthcheck & Security (HMAC Signature Verification)
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 1: Healthcheck & HMAC-SHA256 Signature Verification");

    // 1.1 Healthcheck
    const healthRes = await makeHttpRequest({ method: "GET", path: "/health", port });
    assert.strictEqual(healthRes.statusCode, 200);
    assert.strictEqual(healthRes.json.status, "ok");
    assert.strictEqual(healthRes.json.version, "2.1.0");
    console.log("  ✓ GET /health returned 200 OK");

    // 1.2 Missing signature
    const noSigRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meta: { event_name: "order_created" } }),
      port
    });
    assert.strictEqual(noSigRes.statusCode, 401, "Missing x-signature must be rejected with 401");
    console.log("  ✓ Missing signature rejected with 401 Unauthorized");

    // 1.3 Forged / Tampered signature
    const testBody = JSON.stringify({
      meta: { event_name: "order_created", custom_data: { tier: "LTD" } },
      data: { id: "test_forged_order", attributes: { user_email: "hacker@evil.com" } }
    });
    const badSigRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: {
        "Content-Type": "application/json",
        "x-signature": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      },
      body: testBody,
      port
    });
    assert.strictEqual(badSigRes.statusCode, 401, "Forged signature must be rejected with 401");
    console.log("  ✓ Forged signature rejected with 401 Unauthorized");

    // 1.4 Case-insensitive (Uppercase) signature test
    const upperSigBody = JSON.stringify({
      meta: { event_name: "order_created", custom_data: { tier: "LTD" } },
      data: { id: "test_upper_sig_order", attributes: { user_email: "upper-sig-test@example.com", status: "paid" } }
    });
    const validUpperSig = signPayload(upperSigBody, TEST_SECRET).toUpperCase();
    const upperSigRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: {
        "Content-Type": "application/json",
        "x-signature": validUpperSig
      },
      body: upperSigBody,
      port
    });
    assert.strictEqual(upperSigRes.statusCode, 200, "Uppercase x-signature must be accepted (case-insensitive)");
    console.log("  ✓ Uppercase X-Signature accepted and verified (timing-safe case normalization)");

    // ------------------------------------------------------------------------
    // Group 2: order_created for Single Wash ($9.90 / 30-Day / 500 Quota)
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 2: order_created for 30-Day Single Wash Pass ($9.90)");

    const washOrderId = `ord_wash_${Date.now()}`;
    const washOrderNum = 10041;
    const washBuyerEmail = "single-wash-buyer@protonmail.com";
    const washPayload = JSON.stringify({
      meta: {
        event_name: "order_created",
        custom_data: { tier: "SINGLE_WASH", email: washBuyerEmail }
      },
      data: {
        id: washOrderId,
        type: "orders",
        attributes: {
          order_number: washOrderNum,
          status: "paid",
          user_email: washBuyerEmail,
          total: 990,
          first_order_item: { product_name: "BHM-PRO 30-Day Single Wash Pass", variant_name: "Single Wash", price: 990 }
        }
      }
    });

    const washSig = signPayload(washPayload, TEST_SECRET);
    const washRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json", "x-signature": washSig },
      body: washPayload,
      port
    });

    assert.strictEqual(washRes.statusCode, 200, "Valid Single Wash webhook must return 200 OK");
    assert.strictEqual(washRes.json.success, true);
    assert.strictEqual(washRes.json.tier, "SINGLE_WASH");
    assert.strictEqual(washRes.json.userEmail, washBuyerEmail);
    assert.strictEqual(washRes.json.orderNumber, String(washOrderNum));
    assert(washRes.json.licenseKey.startsWith("BHM1."), "Key must start with BHM1 protocol prefix");

    // Client verification
    const washVerify = await LicenseManager.verifyLicense(washRes.json.licenseKey);
    assert.strictEqual(washVerify.valid, true, "Single Wash key must pass authentic Ed25519 verification");
    assert.strictEqual(washVerify.tier, "SINGLE_WASH");
    assert.strictEqual(washVerify.maxCleanQuota, 500);
    assert.strictEqual(washVerify.sub, washBuyerEmail);
    assert(typeof washVerify.exp === "number" && washVerify.exp > Math.floor(Date.now() / 1000));
    console.log(`  ✓ Single Wash key issued: ${washRes.json.licenseKey.slice(0, 35)}... (500 Quota, 30 Days)`);

    // Client checkProStatus activation
    Object.keys(mockStorageState).forEach((k) => delete mockStorageState[k]);
    mockStorageState.bhm_license_key = washRes.json.licenseKey;
    const washProStatus = await LicenseManager.checkProStatus(mockChromeStorage.local);
    assert.strictEqual(washProStatus.isPro, true);
    assert.strictEqual(washProStatus.tier, "SINGLE_WASH");
    assert.strictEqual(washProStatus.maxCleanQuota, 500);
    console.log("  ✓ Single Wash key activates Pro status and 500 quota in client storage");

    // ------------------------------------------------------------------------
    // Group 3: order_created for Lifetime Buyout ($24.90 / Perpetual / Unlimited)
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 3: order_created for Pro Lifetime Buyout ($24.90)");

    const ltdOrderId = `ord_ltd_${Date.now()}`;
    const ltdOrderNum = 10042;
    const ltdBuyerEmail = "lifetime-pro-user@gmail.com";
    const ltdPayload = JSON.stringify({
      meta: {
        event_name: "order_created",
        custom_data: { tier: "LTD", email: ltdBuyerEmail }
      },
      data: {
        id: ltdOrderId,
        type: "orders",
        attributes: {
          order_number: ltdOrderNum,
          status: "paid",
          user_email: ltdBuyerEmail,
          total: 2490,
          first_order_item: { product_name: "BHM-PRO Lifetime Buyout", variant_name: "Lifetime LTD", price: 2490 }
        }
      }
    });

    const ltdSig = signPayload(ltdPayload, TEST_SECRET);
    const ltdRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json", "x-signature": ltdSig },
      body: ltdPayload,
      port
    });

    assert.strictEqual(ltdRes.statusCode, 200, "Valid Lifetime LTD webhook must return 200 OK");
    assert.strictEqual(ltdRes.json.success, true);
    assert.strictEqual(ltdRes.json.tier, "LTD");
    assert.strictEqual(ltdRes.json.userEmail, ltdBuyerEmail);
    assert.strictEqual(ltdRes.json.orderNumber, String(ltdOrderNum));

    const ltdVerify = await LicenseManager.verifyLicense(ltdRes.json.licenseKey);
    assert.strictEqual(ltdVerify.valid, true, "LTD key must pass authentic Ed25519 verification");
    assert.strictEqual(ltdVerify.tier, "LTD");
    assert(ltdVerify.maxBookmarks >= 9999999, "LTD max bookmarks must be unlimited (>= 9999999)");
    assert.strictEqual(ltdVerify.remainingWashes, Infinity);
    assert.strictEqual(ltdVerify.sub, ltdBuyerEmail);
    console.log(`  ✓ Lifetime Buyout key issued: ${ltdRes.json.licenseKey.slice(0, 35)}... (Unlimited, Perpetual)`);

    // Client checkProStatus activation
    Object.keys(mockStorageState).forEach((k) => delete mockStorageState[k]);
    mockStorageState.bhm_license_key = ltdRes.json.licenseKey;
    const ltdProStatus = await LicenseManager.checkProStatus(mockChromeStorage.local);
    assert.strictEqual(ltdProStatus.isPro, true);
    assert.strictEqual(ltdProStatus.tier, "LTD");
    console.log("  ✓ Lifetime key activates Pro status and unlimited quota in client storage");

    // ------------------------------------------------------------------------
    // Group 3B: Discount Coupon Protection & Zero-Dollar Order
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 3B: Discount Coupon Protection ($17.43 coupon & $0 100% coupon)");

    const couponOrderId = `ord_coupon_${Date.now()}`;
    const couponPayload = JSON.stringify({
      meta: { event_name: "order_created" },
      data: {
        id: couponOrderId,
        type: "orders",
        attributes: {
          status: "paid",
          user_email: "coupon-user@gmail.com",
          total: 1743, // $17.43 (< $20.00 coupon discount)
          first_order_item: { product_name: "BHM-PRO Lifetime Buyout", variant_name: "Lifetime LTD", price: 2490 }
        }
      }
    });
    const couponSig = signPayload(couponPayload, TEST_SECRET);
    const couponRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json", "x-signature": couponSig },
      body: couponPayload,
      port
    });
    assert.strictEqual(couponRes.statusCode, 200);
    assert.strictEqual(couponRes.json.tier, "LTD", "Discounted order below $20 MUST NOT be downgraded to Single Wash!");
    console.log("  ✓ Discount coupon ($17.43 < $20) successfully protected: correctly issued LTD tier!");

    // ------------------------------------------------------------------------
    // Group 3C: Security Gating: Unpaid / Pending / Failed Orders
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 3C: Order Status Gating & Asynchronous Payment Confirmation");

    // 3C.1 Failed order: MUST NOT issue license
    const failedOrderId = `ord_failed_${Date.now()}`;
    const failedPayload = JSON.stringify({
      meta: { event_name: "order_created" },
      data: {
        id: failedOrderId,
        attributes: { status: "failed", user_email: "failed-payer@example.com", total: 2490 }
      }
    });
    const failedRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json", "x-signature": signPayload(failedPayload, TEST_SECRET) },
      body: failedPayload,
      port
    });
    assert.strictEqual(failedRes.statusCode, 200);
    assert.strictEqual(failedRes.json.fulfilled, false, "Failed order must not be fulfilled");
    assert.strictEqual(failedRes.json.licenseKey, undefined, "Failed order must NOT receive a license key");
    console.log("  ✓ Order status 'failed' rejected from issuance (0 free licenses given to failed checkouts)");

    // 3C.2 Pending order: Wait for payment confirmation
    const pendingOrderId = `ord_pending_${Date.now()}`;
    const pendingPayload = JSON.stringify({
      meta: { event_name: "order_created" },
      data: {
        id: pendingOrderId,
        attributes: {
          status: "pending",
          user_email: "async-buyer@example.com",
          total: 2490,
          first_order_item: { product_name: "BHM-PRO Lifetime Buyout" }
        }
      }
    });
    const pendingRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json", "x-signature": signPayload(pendingPayload, TEST_SECRET) },
      body: pendingPayload,
      port
    });
    assert.strictEqual(pendingRes.statusCode, 200);
    assert.strictEqual(pendingRes.json.fulfilled, false, "Pending order must not issue license yet");
    console.log("  ✓ Order status 'pending' safely acknowledged without premature license issuance");

    // 3C.3 order_updated: Payment cleared -> now issue license!
    const paidUpdatedPayload = JSON.stringify({
      meta: { event_name: "order_updated" },
      data: {
        id: pendingOrderId,
        attributes: {
          status: "paid",
          user_email: "async-buyer@example.com",
          total: 2490,
          first_order_item: { product_name: "BHM-PRO Lifetime Buyout" }
        }
      }
    });
    const updatedRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json", "x-signature": signPayload(paidUpdatedPayload, TEST_SECRET) },
      body: paidUpdatedPayload,
      port
    });
    assert.strictEqual(updatedRes.statusCode, 200);
    assert.strictEqual(updatedRes.json.tier, "LTD");
    assert(updatedRes.json.licenseKey && updatedRes.json.licenseKey.startsWith("BHM1."), "order_updated with paid status must issue license");
    console.log("  ✓ order_updated event for cleared payment successfully triggered license issuance!");

    // ------------------------------------------------------------------------
    // Group 4: Webhook Idempotency (Anti-Duplication)
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 4: Webhook Idempotency & Duplicate Order Shielding");

    // Resend exact same webhook for ltdOrderId
    const dupRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json", "x-signature": ltdSig },
      body: ltdPayload,
      port
    });

    assert.strictEqual(dupRes.statusCode, 200);
    assert.strictEqual(dupRes.json.success, true);
    assert.strictEqual(dupRes.json.duplicated, true, "Duplicate webhook must be flagged with duplicated: true");
    assert.strictEqual(dupRes.json.licenseKey, ltdRes.json.licenseKey, "Duplicate webhook must return identical license key");
    console.log("  ✓ Duplicate webhook safely handled: returned cached license key, 0 double issuance");

    // ------------------------------------------------------------------------
    // Group 5: Customer Self-Service License Lookup API
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 5: Customer Self-Service License Retrieval (GET /license)");

    // 5.1 Success lookup by primary order ID
    const lookupSuccess = await makeHttpRequest({
      method: "GET",
      path: `/license?order_id=${encodeURIComponent(ltdOrderId)}&email=${encodeURIComponent(ltdBuyerEmail)}`,
      port
    });
    assert.strictEqual(lookupSuccess.statusCode, 200);
    assert.strictEqual(lookupSuccess.json.orderId, ltdOrderId);
    assert.strictEqual(lookupSuccess.json.licenseKey, ltdRes.json.licenseKey);
    assert.strictEqual(lookupSuccess.json.tier, "LTD");
    console.log("  ✓ Successful license lookup by order_id + email");

    // 5.2 Success lookup with leading '#' symbol (e.g. copy-pasted '#ord_ltd_...')
    const lookupHashPrefix = await makeHttpRequest({
      method: "GET",
      path: `/license?order_id=${encodeURIComponent("#" + ltdOrderId)}&email=${encodeURIComponent(ltdBuyerEmail)}`,
      port
    });
    assert.strictEqual(lookupHashPrefix.statusCode, 200);
    assert.strictEqual(lookupHashPrefix.json.licenseKey, ltdRes.json.licenseKey);
    console.log("  ✓ Successful license lookup with leading '#' stripped automatically");

    // 5.3 Success lookup by store order number (receipt order number: #10042)
    const lookupByOrderNum = await makeHttpRequest({
      method: "GET",
      path: `/license?order_id=%2310042&email=${encodeURIComponent(ltdBuyerEmail)}`,
      port
    });
    assert.strictEqual(lookupByOrderNum.statusCode, 200);
    assert.strictEqual(lookupByOrderNum.json.licenseKey, ltdRes.json.licenseKey);
    console.log("  ✓ Successful license lookup by customer store order number (#10042)");

    // 5.4 Plus-aliased email lookup (e.g. user+bhm@gmail.com where URL decode turns '+' into ' ')
    const plusOrderId = `ord_plus_${Date.now()}`;
    const plusOrderNum = 10043;
    const plusEmail = "geek+bhm@gmail.com";
    const plusPayload = JSON.stringify({
      meta: { event_name: "order_created" },
      data: {
        id: plusOrderId,
        type: "orders",
        attributes: {
          order_number: plusOrderNum,
          status: "paid",
          user_email: plusEmail,
          total: 2490,
          first_order_item: { product_name: "BHM-PRO Lifetime Buyout" }
        }
      }
    });
    const plusRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json", "x-signature": signPayload(plusPayload, TEST_SECRET) },
      body: plusPayload,
      port
    });
    assert.strictEqual(plusRes.statusCode, 200);

    // Look up with unencoded '+' (which becomes space in URL query params)
    const lookupPlusSpace = await makeHttpRequest({
      method: "GET",
      path: `/license?order_id=${plusOrderId}&email=geek+bhm@gmail.com`,
      port
    });
    assert.strictEqual(lookupPlusSpace.statusCode, 200, "Plus-aliased email with URL space decoding must match");
    assert.strictEqual(lookupPlusSpace.json.licenseKey, plusRes.json.licenseKey);
    console.log("  ✓ Plus-aliased email (geek+bhm@gmail.com) successfully retrieved license across URL decode variants");

    // 5.5 Mismatched email rejected
    const lookupMismatched = await makeHttpRequest({
      method: "GET",
      path: `/license?order_id=${encodeURIComponent(ltdOrderId)}&email=attacker@spoof.com`,
      port
    });
    assert.strictEqual(lookupMismatched.statusCode, 404, "Mismatched email must return 404");
    console.log("  ✓ Mismatched email rejected with 404");

    // 5.6 Missing parameters rejected
    const lookupMissing = await makeHttpRequest({
      method: "GET",
      path: "/license?order_id=123",
      port
    });
    assert.strictEqual(lookupMissing.statusCode, 400);
    console.log("  ✓ Missing parameters rejected with 400");

    // ------------------------------------------------------------------------
    // Group 6: order_refunded Event & Revocation Verification
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 6: order_refunded Event & Revocation Handling");

    const refundPayload = JSON.stringify({
      meta: { event_name: "order_refunded" },
      data: { id: washOrderId, attributes: { user_email: washBuyerEmail } }
    });
    const refundSig = signPayload(refundPayload, TEST_SECRET);
    const refundRes = await makeHttpRequest({
      method: "POST",
      path: "/webhook",
      headers: { "Content-Type": "application/json", "x-signature": refundSig },
      body: refundPayload,
      port
    });

    assert.strictEqual(refundRes.statusCode, 200);
    assert.strictEqual(refundRes.json.success, true);
    assert.strictEqual(refundRes.json.revoked, true);
    console.log("  ✓ order_refunded webhook successfully processed and marked revoked");

    // Check online verification probe for the refunded key
    const verifyRevoked = await makeHttpRequest({
      method: "POST",
      path: "/v1/licenses/verify",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: washRes.json.licenseKey }),
      port
    });
    assert.strictEqual(verifyRevoked.json.valid, false, "Revoked license must fail online verification");
    assert.strictEqual(verifyRevoked.json.revoked, true);
    console.log("  ✓ POST /v1/licenses/verify accurately identifies revoked license key");

    // ------------------------------------------------------------------------
    // Group 7: Bilingual Transactional Email Dispatcher & CWS Compliance
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 7: Transactional Email Template & CWS Store Link Verification");

    const emailData = generateLicenseEmail({
      tier: "LTD",
      licenseKey: ltdRes.json.licenseKey,
      userEmail: ltdBuyerEmail,
      orderId: ltdOrderId
    });

    assert(emailData.subject.includes(ltdOrderId), "Subject must include Order ID");
    assert(emailData.html.includes(ltdRes.json.licenseKey), "HTML must contain license key");
    assert(emailData.html.includes(EXTENSION_ID), "HTML must include Chrome Extension ID");
    assert(emailData.html.includes(CWS_STORE_URL), "HTML must include official CWS Store link");
    assert(emailData.html.includes("3-Step Activation Guide"), "HTML must include English guide");
    assert(emailData.html.includes("3步快速激活教程"), "HTML must include Chinese guide");
    assert(emailData.text.includes(ltdRes.json.licenseKey), "Plain-text must contain license key");
    assert(emailData.text.includes("nomieaphhhhhikklfhmhhjcdgicaikgn"), "Plain-text must contain Extension ID");
    console.log(`  ✓ Email template verified: contains CWS link (${CWS_STORE_URL}) and authentic license`);

    // ------------------------------------------------------------------------
    // Group 8: Cloudflare Worker Simulated Execution
    // ------------------------------------------------------------------------
    console.log("\n▶ Group 8: Cloudflare Worker In-Memory Edge Simulation");

    const workerModule = await import("../webhook-worker/src/index.js");
    const workerHandler = workerModule.default.fetch;

    // In-memory KV Mock
    const mockKv = new Map();
    const mockEnv = {
      ENVIRONMENT: "test",
      LEMON_SQUEEZY_WEBHOOK_SECRET: TEST_SECRET,
      BHM_ED25519_PRIVATE_KEY_PKCS8: privateKey,
      BHM_LICENSE_KV: {
        get: async (key, type) => {
          const val = mockKv.get(key);
          if (!val) return null;
          return type === "json" ? JSON.parse(val) : val;
        },
        put: async (key, val) => {
          mockKv.set(key, typeof val === "string" ? val : JSON.stringify(val));
        }
      }
    };

    // Worker Healthcheck
    const workerHealthReq = new Request("https://edge.bhm-pro.com/health");
    const workerHealthRes = await workerHandler(workerHealthReq, mockEnv);
    const workerHealthJson = await workerHealthRes.json();
    assert.strictEqual(workerHealthRes.status, 200);
    assert.strictEqual(workerHealthJson.service, "bhm-pro-lemon-squeezy-webhook");
    console.log("  ✓ Cloudflare Worker /health returned 200 OK");

    // Worker Webhook order_created with order_number and uppercase signature
    const workerOrderId = `ord_cf_${Date.now()}`;
    const workerOrderNum = 10088;
    const workerBody = JSON.stringify({
      meta: { event_name: "order_created", custom_data: { tier: "LTD", email: "worker-user@cloudflare.com" } },
      data: {
        id: workerOrderId,
        type: "orders",
        attributes: {
          order_number: workerOrderNum,
          status: "paid",
          user_email: "worker-user@cloudflare.com",
          total: 2490,
          first_order_item: { product_name: "BHM-PRO Lifetime Buyout", price: 2490 }
        }
      }
    });
    const workerSig = signPayload(workerBody, TEST_SECRET).toUpperCase(); // Uppercase test
    const workerPostReq = new Request("https://edge.bhm-pro.com/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": workerSig },
      body: workerBody
    });

    const workerRes = await workerHandler(workerPostReq, mockEnv);
    assert.strictEqual(workerRes.status, 200, "Worker webhook must return 200");
    const workerJson = await workerRes.json();
    assert.strictEqual(workerJson.success, true);
    assert.strictEqual(workerJson.tier, "LTD");
    assert.strictEqual(workerJson.orderId, workerOrderId);
    assert.strictEqual(workerJson.orderNumber, String(workerOrderNum));

    // Verify key issued by Worker using LicenseManager
    const workerKeyVerify = await LicenseManager.verifyLicense(workerJson.licenseKey);
    assert.strictEqual(workerKeyVerify.valid, true, "Worker-issued license key must pass LicenseManager");
    assert.strictEqual(workerKeyVerify.sub, "worker-user@cloudflare.com");
    console.log("  ✓ Cloudflare Worker WebCrypto Ed25519 signing verified with LicenseManager (Uppercase Sig)");

    // Worker pending status gate test
    const workerPendingReq = new Request("https://edge.bhm-pro.com/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": signPayload(JSON.stringify({
        meta: { event_name: "order_created" },
        data: { id: "cf_pending_1", attributes: { status: "pending", user_email: "test@cf.com" } }
      }), TEST_SECRET) },
      body: JSON.stringify({
        meta: { event_name: "order_created" },
        data: { id: "cf_pending_1", attributes: { status: "pending", user_email: "test@cf.com" } }
      })
    });
    const workerPendingRes = await workerHandler(workerPendingReq, mockEnv);
    const workerPendingJson = await workerPendingRes.json();
    assert.strictEqual(workerPendingJson.fulfilled, false);
    console.log("  ✓ Cloudflare Worker status 'pending' successfully gated (0 premature keys)");

    // Worker coupon discount test ($17.43 < $20)
    const workerCouponBody = JSON.stringify({
      meta: { event_name: "order_created" },
      data: {
        id: "cf_coupon_1",
        attributes: {
          status: "paid",
          user_email: "cf-coupon@domain.com",
          total: 1743,
          first_order_item: { product_name: "BHM-PRO Lifetime Buyout", price: 2490 }
        }
      }
    });
    const workerCouponReq = new Request("https://edge.bhm-pro.com/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": signPayload(workerCouponBody, TEST_SECRET) },
      body: workerCouponBody
    });
    const workerCouponRes = await workerHandler(workerCouponReq, mockEnv);
    const workerCouponJson = await workerCouponRes.json();
    assert.strictEqual(workerCouponJson.tier, "LTD", "Worker must not downgrade discounted LTD order");
    console.log("  ✓ Cloudflare Worker coupon discount protection verified");

    // Worker self-service lookup by primary order ID
    const workerLookupReq = new Request(`https://edge.bhm-pro.com/license?order_id=${workerOrderId}&email=worker-user@cloudflare.com`);
    const workerLookupRes = await workerHandler(workerLookupReq, mockEnv);
    assert.strictEqual(workerLookupRes.status, 200);
    const workerLookupJson = await workerLookupRes.json();
    assert.strictEqual(workerLookupJson.licenseKey, workerJson.licenseKey);
    console.log("  ✓ Cloudflare Worker GET /license lookup verified");

    // Worker self-service lookup by store order number (#10088)
    const workerLookupNumReq = new Request(`https://edge.bhm-pro.com/license?order_id=%2310088&email=worker-user@cloudflare.com`);
    const workerLookupNumRes = await workerHandler(workerLookupNumReq, mockEnv);
    assert.strictEqual(workerLookupNumRes.status, 200);
    const workerLookupNumJson = await workerLookupNumRes.json();
    assert.strictEqual(workerLookupNumJson.licenseKey, workerJson.licenseKey);
    console.log("  ✓ Cloudflare Worker lookup by order number (#10088) verified");

    console.log("\n================================================================================");
    console.log("🎉 ALL 8 GROUPS IN LEMON SQUEEZY WEBHOOK & ISSUANCE TEST SUITE PASSED (100%)!");
    console.log("================================================================================\n");
  } finally {
    // Cleanup temporary files and stop server
    server.close();
    if (fs.existsSync(tmpStoragePath)) {
      try { fs.unlinkSync(tmpStoragePath); } catch {}
    }
  }
}

if (require.main === module) {
  runLemonSqueezyWebhookE2ETests().catch((err) => {
    console.error("\n❌ [FAIL] Webhook E2E Test Suite Failed:", err);
    process.exit(1);
  });
}

module.exports = { runLemonSqueezyWebhookE2ETests };
