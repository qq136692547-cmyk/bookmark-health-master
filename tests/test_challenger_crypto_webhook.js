/**
 * tests/test_challenger_crypto_webhook.js
 * 
 * BHM-PRO v2.1.0 Adversarial Empirical Challenge Suite (Challenger 1)
 * Focus: Cryptographic Protocol, Clock Rewind Protection, Paddle Webhook Anti-Replay & Revocation Interception
 * 
 * 1. Ed25519 Signature Forgery & Tamper Resistance
 * 2. System Clock Rollback Prevention (Future IAT Rejection)
 * 3. Paddle Webhook 300s Timestamp Tolerance Window & HMAC Security
 * 4. Payment Core Event `transaction.paid` Automated Minting Simulation
 * 5. Refund & Revocation Interception on `/license` & `/v1/licenses/verify` (HTTP 403)
 */

const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { LicenseManager } = require("../bookmark-organizer/core/license.js");

// In-Memory Cloudflare KV Mock
class MockKVNamespace {
  constructor() {
    this.store = new Map();
  }
  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  async put(key, value, options = {}) {
    this.store.set(key, String(value));
  }
  async delete(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

async function runAdversarialCryptoAndWebhookChallenges() {
  console.log("================================================================================");
  console.log("  BHM-PRO v2.1.0 ADVERSARIAL CHALLENGE SUITE: CRYPTO & WEBHOOK (CHALLENGER 1)   ");
  console.log("================================================================================\n");

  let totalChallenges = 0;
  let passedChallenges = 0;
  let failedChallenges = 0;

  function assertDefense(title, condition, detail = "") {
    totalChallenges++;
    if (condition) {
      console.log(`  🛡️ [PASS - DEFENSE SECURE] ${title}${detail ? " | " + detail : ""}`);
      passedChallenges++;
    } else {
      console.error(`  💥 [FAIL - DEFENSE BREACHED] ${title}${detail ? " | " + detail : ""}`);
      failedChallenges++;
      throw new Error(`Defense breached in challenge: ${title}`);
    }
  }

  // Load Production Keys & Worker
  const privKeyData = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../private-keys/bhm_prod_ed25519_private.json"), "utf8")
  );
  const workerModule = await import("../webhook-worker/src/paddle-worker.js");
  const worker = workerModule.default;

  const mockKv = new MockKVNamespace();
  const testSecret = "pdl_whsec_live_adversarial_challenge_key_2026";
  const workerEnv = {
    BHM_LICENSES_KV: mockKv,
    ED25519_PRIVATE_KEY_B64: privKeyData.privateKeyPkcs8Base64,
    PADDLE_WEBHOOK_SECRET: testSecret
  };

  // Helper to sign Paddle Webhook
  function generatePaddleSignatureHeader(rawBody, timestamp, secret) {
    const hash = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}:${rawBody}`)
      .digest("hex");
    return `ts=${timestamp};h1=${hash}`;
  }

  // ===========================================================================
  // CHALLENGE 1: Ed25519 签名伪造与防篡改挑战 (Signature Forgery & Tamper Resistance)
  // ===========================================================================
  console.log("▶ [CHALLENGE 1] Ed25519 Signature Forgery & Tamper-Resistance Attacks");

  // Step 1.1: Generate Genuine Baseline Keys
  const now = Math.floor(Date.now() / 1000);
  const privKey = await crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(privKeyData.privateKeyPkcs8Base64, "base64"),
    { name: "Ed25519" },
    false,
    ["sign"]
  );

  const genuineSingleWashPayload = {
    v: 1,
    id: "lic_single_wash_genuine_001",
    orderId: "ord_single_001",
    sub: "single_buyer@corp.com",
    email: "single_buyer@corp.com",
    tier: "SINGLE_WASH",
    iat: now,
    exp: now + 30 * 86400,
    maxCleanQuota: 500,
    kid: "bhm-prod-ed25519-2026-v1"
  };
  const swPayloadB64 = Buffer.from(JSON.stringify(genuineSingleWashPayload)).toString("base64url");
  const swSigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${swPayloadB64}`));
  const swSigB64 = Buffer.from(swSigBuf).toString("base64url");
  const genuineSingleWashKey = `BHM1.${swPayloadB64}.${swSigB64}`;

  const genuineLtdPayload = {
    v: 1,
    id: "lic_ltd_genuine_002",
    orderId: "ord_ltd_002",
    sub: "ltd_buyer@corp.com",
    email: "ltd_buyer@corp.com",
    tier: "LTD",
    iat: now,
    exp: now + 36500 * 86400,
    maxCleanQuota: 9999999,
    kid: "bhm-prod-ed25519-2026-v1"
  };
  const ltdPayloadB64 = Buffer.from(JSON.stringify(genuineLtdPayload)).toString("base64url");
  const ltdSigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${ltdPayloadB64}`));
  const ltdSigB64 = Buffer.from(ltdSigBuf).toString("base64url");
  const genuineLtdKey = `BHM1.${ltdPayloadB64}.${ltdSigB64}`;

  // Verify baselines pass
  const swVerify = await LicenseManager.verifyLicense(genuineSingleWashKey);
  assertDefense("Authentic Single Wash license accepted", swVerify.valid === true);
  assertDefense("Authentic Single Wash tier is SINGLE_WASH", swVerify.tier === "SINGLE_WASH");
  assertDefense("Authentic Single Wash sub matches buyer email", swVerify.sub === "single_buyer@corp.com");
  assertDefense("Authentic Single Wash maxCleanQuota is 500", swVerify.maxCleanQuota === 500);

  const ltdVerify = await LicenseManager.verifyLicense(genuineLtdKey);
  assertDefense("Authentic LTD license accepted", ltdVerify.valid === true);
  assertDefense("Authentic LTD tier is LTD", ltdVerify.tier === "LTD");
  assertDefense("Authentic LTD sub matches buyer email", ltdVerify.sub === "ltd_buyer@corp.com");
  assertDefense("Authentic LTD maxCleanQuota is 9999999", ltdVerify.maxCleanQuota === 9999999);
  const ltdRemaining = await LicenseManager.getRemainingQuota(ltdVerify);
  assertDefense("Authentic LTD remaining quota is unlimited (> 0 & >= 9999999)", ltdRemaining >= 9999999);

  // Attack 1.2.1: Tamper Tier in Single Wash to LTD (Tier Escalation Attack)
  const tamperedTierPayload = { ...genuineSingleWashPayload, tier: "LTD" };
  const tamperedTierB64 = Buffer.from(JSON.stringify(tamperedTierPayload)).toString("base64url");
  const forgedTierKey = `BHM1.${tamperedTierB64}.${swSigB64}`;
  const forgedTierRes = await LicenseManager.verifyLicense(forgedTierKey);
  assertDefense(
    "Tier privilege escalation (SINGLE_WASH -> LTD) firmly rejected",
    forgedTierRes.valid === false && forgedTierRes.tier === "FREE",
    `Error: ${forgedTierRes.error}`
  );

  // Attack 1.2.2: Tamper Quota in Single Wash to 9999999 (Quota Escalation Attack)
  const tamperedQuotaPayload = { ...genuineSingleWashPayload, maxCleanQuota: 9999999 };
  const tamperedQuotaB64 = Buffer.from(JSON.stringify(tamperedQuotaPayload)).toString("base64url");
  const forgedQuotaKey = `BHM1.${tamperedQuotaB64}.${swSigB64}`;
  const forgedQuotaRes = await LicenseManager.verifyLicense(forgedQuotaKey);
  assertDefense(
    "Quota escalation (500 -> 9999999) firmly rejected",
    forgedQuotaRes.valid === false && forgedQuotaRes.tier === "FREE",
    `Error: ${forgedQuotaRes.error}`
  );

  // Attack 1.2.3: Tamper Expiration Date (Perpetual Extension Attack)
  const tamperedExpPayload = { ...genuineSingleWashPayload, exp: now + 36500 * 86400 };
  const tamperedExpB64 = Buffer.from(JSON.stringify(tamperedExpPayload)).toString("base64url");
  const forgedExpKey = `BHM1.${tamperedExpB64}.${swSigB64}`;
  const forgedExpRes = await LicenseManager.verifyLicense(forgedExpKey);
  assertDefense(
    "Expiration date tampering (extending 30d -> 100yr) firmly rejected",
    forgedExpRes.valid === false && forgedExpRes.tier === "FREE"
  );

  // Attack 1.2.4: Tamper Subject / Identity (Identity Impersonation Attack)
  const tamperedSubPayload = { ...genuineSingleWashPayload, sub: "admin@corp.com", email: "admin@corp.com" };
  const tamperedSubB64 = Buffer.from(JSON.stringify(tamperedSubPayload)).toString("base64url");
  const forgedSubKey = `BHM1.${tamperedSubB64}.${swSigB64}`;
  const forgedSubRes = await LicenseManager.verifyLicense(forgedSubKey);
  assertDefense(
    "Identity spoofing (sub: admin@corp.com) firmly rejected",
    forgedSubRes.valid === false && forgedSubRes.tier === "FREE"
  );

  // Attack 1.2.5: Inject Arbitrary Privileged Claim
  const injectedClaimPayload = { ...genuineSingleWashPayload, isSuperUser: true, bypassRestrictions: true };
  const injectedClaimB64 = Buffer.from(JSON.stringify(injectedClaimPayload)).toString("base64url");
  const forgedClaimKey = `BHM1.${injectedClaimB64}.${swSigB64}`;
  const forgedClaimRes = await LicenseManager.verifyLicense(forgedClaimKey);
  assertDefense(
    "Privileged claim injection firmly rejected",
    forgedClaimRes.valid === false && forgedClaimRes.tier === "FREE"
  );

  // Attack 1.3.1: Bit-flip in Base64 Signature
  const rawSigBytes = Buffer.from(swSigB64, "base64url");
  rawSigBytes[0] ^= 0x01; // flip 1 bit
  const bitFlippedSigB64 = rawSigBytes.toString("base64url");
  const bitFlippedKey = `BHM1.${swPayloadB64}.${bitFlippedSigB64}`;
  const bitFlippedRes = await LicenseManager.verifyLicense(bitFlippedKey);
  assertDefense(
    "Single bit-flipped Ed25519 signature rejected",
    bitFlippedRes.valid === false && bitFlippedRes.tier === "FREE"
  );

  // Attack 1.3.2: Replay Signature from another Valid Key (Signature Cross-Swapping)
  const crossSwappedKey = `BHM1.${swPayloadB64}.${ltdSigB64}`;
  const crossSwappedRes = await LicenseManager.verifyLicense(crossSwappedKey);
  assertDefense(
    "Signature replay from another license key rejected",
    crossSwappedRes.valid === false && crossSwappedRes.tier === "FREE"
  );

  // Attack 1.3.3: Random 64-Byte Garbage Signature
  const randomSig = crypto.randomBytes(64).toString("base64url");
  const garbageSigKey = `BHM1.${ltdPayloadB64}.${randomSig}`;
  const garbageSigRes = await LicenseManager.verifyLicense(garbageSigKey);
  assertDefense(
    "Random 64-byte garbage signature rejected",
    garbageSigRes.valid === false && garbageSigRes.tier === "FREE"
  );

  // Attack 1.3.4: Truncated Signature
  const truncatedSig = swSigB64.slice(0, 16);
  const truncatedSigKey = `BHM1.${ltdPayloadB64}.${truncatedSig}`;
  const truncatedSigRes = await LicenseManager.verifyLicense(truncatedSigKey);
  assertDefense(
    "Truncated signature safely rejected without crash",
    truncatedSigRes.valid === false && truncatedSigRes.tier === "FREE"
  );

  // Attack 1.3.5: Malformed Protocol Header (BHM2 / NO_HEADER)
  const invalidHeaderKey1 = `BHM2.${ltdPayloadB64}.${ltdSigB64}`;
  const invalidHeaderRes1 = await LicenseManager.verifyLicense(invalidHeaderKey1);
  assertDefense("Unknown protocol header BHM2 rejected", invalidHeaderRes1.valid === false);

  const missingHeaderKey = `${ltdPayloadB64}.${ltdSigB64}`;
  const missingHeaderRes = await LicenseManager.verifyLicense(missingHeaderKey);
  assertDefense("Missing protocol header rejected", missingHeaderRes.valid === false);

  // Attack 1.4: Rogue Keypair Forgery Attack (Self-Signed Ed25519 Key)
  const rogueKeyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  );
  const roguePayload = {
    v: 1,
    id: "lic_rogue_attack",
    orderId: "ord_rogue_999",
    sub: "attacker@darkweb.org",
    tier: "LTD",
    iat: now,
    exp: now + 36500 * 86400,
    maxCleanQuota: 9999999,
    kid: "bhm-prod-ed25519-2026-v1"
  };
  const roguePayloadB64 = Buffer.from(JSON.stringify(roguePayload)).toString("base64url");
  const rogueSigBuf = await crypto.subtle.sign(
    "Ed25519",
    rogueKeyPair.privateKey,
    new TextEncoder().encode(`BHM1.${roguePayloadB64}`)
  );
  const rogueSigB64 = Buffer.from(rogueSigBuf).toString("base64url");
  const rogueSignedKey = `BHM1.${roguePayloadB64}.${rogueSigB64}`;

  const rogueRes = await LicenseManager.verifyLicense(rogueSignedKey);
  assertDefense(
    "Rogue self-signed Ed25519 license key firmly rejected",
    rogueRes.valid === false && rogueRes.tier === "FREE",
    `Error: ${rogueRes.error}`
  );


  // ===========================================================================
  // CHALLENGE 2: 系统本地时钟回拨攻击挑战 (Clock Rewind / Future IAT Tampering)
  // ===========================================================================
  console.log("\n▶ [CHALLENGE 2] Local System Clock Rewind Tampering Attacks");

  // Attack 2.1: Clock rewound by 6 minutes (iat is 360s in the future)
  const clockRewind360Payload = {
    ...genuineLtdPayload,
    id: "lic_clock_rewind_360",
    iat: now + 360
  };
  const cr360B64 = Buffer.from(JSON.stringify(clockRewind360Payload)).toString("base64url");
  const cr360SigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${cr360B64}`));
  const cr360Key = `BHM1.${cr360B64}.${Buffer.from(cr360SigBuf).toString("base64url")}`;
  const cr360Res = await LicenseManager.verifyLicense(cr360Key);
  assertDefense(
    "Clock rewound by 6 minutes (iat = now + 360s > 300s) rejected",
    cr360Res.valid === false && cr360Res.tier === "FREE",
    `Reason: ${cr360Res.reason}`
  );
  assertDefense(
    "Clock rewind error message identifies system clock tampering",
    cr360Res.error.toLowerCase().includes("clock") || cr360Res.reason.toLowerCase().includes("tampered")
  );

  // Attack 2.2: Clock rewound by 1 hour (iat = now + 3600s)
  const clockRewind1hPayload = {
    ...genuineLtdPayload,
    id: "lic_clock_rewind_1h",
    iat: now + 3600
  };
  const cr1hB64 = Buffer.from(JSON.stringify(clockRewind1hPayload)).toString("base64url");
  const cr1hSigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${cr1hB64}`));
  const cr1hKey = `BHM1.${cr1hB64}.${Buffer.from(cr1hSigBuf).toString("base64url")}`;
  const cr1hRes = await LicenseManager.verifyLicense(cr1hKey);
  assertDefense(
    "Clock rewound by 1 hour (iat = now + 3600s) rejected",
    cr1hRes.valid === false && cr1hRes.tier === "FREE"
  );

  // Attack 2.3: Clock rewound by 1 day (iat = now + 86400s)
  const clockRewind1dPayload = {
    ...genuineLtdPayload,
    id: "lic_clock_rewind_1d",
    iat: now + 86400
  };
  const cr1dB64 = Buffer.from(JSON.stringify(clockRewind1dPayload)).toString("base64url");
  const cr1dSigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${cr1dB64}`));
  const cr1dKey = `BHM1.${cr1dB64}.${Buffer.from(cr1dSigBuf).toString("base64url")}`;
  const cr1dRes = await LicenseManager.verifyLicense(cr1dKey);
  assertDefense(
    "Clock rewound by 1 day (iat = now + 86400s) rejected",
    cr1dRes.valid === false && cr1dRes.tier === "FREE"
  );

  // Attack 2.4: Clock rewound by 1 year (iat = now + 31536000s)
  const clockRewind1yPayload = {
    ...genuineLtdPayload,
    id: "lic_clock_rewind_1y",
    iat: now + 31536000
  };
  const cr1yB64 = Buffer.from(JSON.stringify(clockRewind1yPayload)).toString("base64url");
  const cr1ySigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${cr1yB64}`));
  const cr1yKey = `BHM1.${cr1yB64}.${Buffer.from(cr1ySigBuf).toString("base64url")}`;
  const cr1yRes = await LicenseManager.verifyLicense(cr1yKey);
  assertDefense(
    "Clock rewound by 1 year (iat = now + 31536000s) rejected",
    cr1yRes.valid === false && cr1yRes.tier === "FREE"
  );

  // Attack 2.5: Boundary check: iat = now + 301s (Must fail) vs iat = now + 250s (Must pass within 300s drift window)
  const cr301Payload = { ...genuineLtdPayload, id: "lic_cr_301", iat: now + 301 };
  const cr301B64 = Buffer.from(JSON.stringify(cr301Payload)).toString("base64url");
  const cr301SigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${cr301B64}`));
  const cr301Key = `BHM1.${cr301B64}.${Buffer.from(cr301SigBuf).toString("base64url")}`;
  const cr301Res = await LicenseManager.verifyLicense(cr301Key);
  assertDefense("Threshold boundary: iat = now + 301s (> 300s tolerance) rejected", cr301Res.valid === false);

  const cr250Payload = { ...genuineLtdPayload, id: "lic_cr_250", iat: now + 250 };
  const cr250B64 = Buffer.from(JSON.stringify(cr250Payload)).toString("base64url");
  const cr250SigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${cr250B64}`));
  const cr250Key = `BHM1.${cr250B64}.${Buffer.from(cr250SigBuf).toString("base64url")}`;
  const cr250Res = await LicenseManager.verifyLicense(cr250Key);
  assertDefense("Tolerance boundary: iat = now + 250s (within ±300s clock drift) accepted", cr250Res.valid === true);

  // Attack 2.6: Normal expiration test (exp < now)
  const expiredPayload = { ...genuineSingleWashPayload, id: "lic_expired", exp: now - 3600 };
  const expB64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const expSigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${expB64}`));
  const expKey = `BHM1.${expB64}.${Buffer.from(expSigBuf).toString("base64url")}`;
  const expiredRes = await LicenseManager.verifyLicense(expKey);
  assertDefense("Expired license key rejected with isExpired: true", expiredRes.valid === false && expiredRes.isExpired === true);

  // Attack 2.7: SINGLE_WASH missing exp timestamp (P1-4 prevention of converting to perpetual)
  const noExpSwPayload = { ...genuineSingleWashPayload, id: "lic_no_exp_sw" };
  delete noExpSwPayload.exp;
  const noExpSwB64 = Buffer.from(JSON.stringify(noExpSwPayload)).toString("base64url");
  const noExpSwSigBuf = await crypto.subtle.sign("Ed25519", privKey, new TextEncoder().encode(`BHM1.${noExpSwB64}`));
  const noExpSwKey = `BHM1.${noExpSwB64}.${Buffer.from(noExpSwSigBuf).toString("base64url")}`;
  const noExpSwRes = await LicenseManager.verifyLicense(noExpSwKey);
  assertDefense("SINGLE_WASH missing exp field firmly rejected", noExpSwRes.valid === false);


  // ===========================================================================
  // CHALLENGE 3: Paddle Webhook 300秒时间戳时效窗口挑战 (Anti-Replay & HMAC Integrity)
  // ===========================================================================
  console.log("\n▶ [CHALLENGE 3] Paddle Webhook 300s Timestamp Window & Anti-Replay Attacks");

  const webhookBody = JSON.stringify({
    event_id: "evt_paddle_test_001",
    event_type: "transaction.paid",
    data: {
      id: "txn_pdl_001",
      status: "paid",
      customer: { email: "verified_customer@corp.com" },
      items: [{ price_id: "pri_01m708eevn06vvarffpabpyprd" }]
    }
  });

  // Helper to call Worker fetch
  async function invokeWorkerWebhook(bodyStr, sigHeader) {
    const headers = { "Content-Type": "application/json" };
    if (sigHeader !== null) {
      headers["Paddle-Signature"] = sigHeader;
    }
    const req = new Request("https://bhm-pro-license-worker.geo-score.workers.dev/webhook", {
      method: "POST",
      headers,
      body: bodyStr
    });
    return await worker.fetch(req, workerEnv, {});
  }

  // Baseline 3.1: Current timestamp + valid HMAC
  const currentTs = Math.floor(Date.now() / 1000);
  const validCurrentSig = generatePaddleSignatureHeader(webhookBody, currentTs, testSecret);
  const currentRes = await invokeWorkerWebhook(webhookBody, validCurrentSig);
  assertDefense("Legitimate fresh Webhook accepted with HTTP 200", currentRes.status === 200);

  // Attack 3.2.1: Expired Timestamp - 301 seconds ago (just beyond 300s window)
  const expired301Ts = currentTs - 301;
  const expired301Sig = generatePaddleSignatureHeader(webhookBody, expired301Ts, testSecret);
  const expired301Res = await invokeWorkerWebhook(webhookBody, expired301Sig);
  assertDefense(
    "Past timestamp (301s ago > 300s window) rejected with HTTP 401",
    expired301Res.status === 401
  );

  // Attack 3.2.2: Expired Timestamp - 600 seconds ago (10 minutes ago replay)
  const expired600Ts = currentTs - 600;
  const expired600Sig = generatePaddleSignatureHeader(webhookBody, expired600Ts, testSecret);
  const expired600Res = await invokeWorkerWebhook(webhookBody, expired600Sig);
  assertDefense(
    "Replay attack with 600s expired timestamp rejected with HTTP 401",
    expired600Res.status === 401
  );

  // Attack 3.2.3: Expired Timestamp - 1 day ago (86400s replay)
  const expired1dTs = currentTs - 86400;
  const expired1dSig = generatePaddleSignatureHeader(webhookBody, expired1dTs, testSecret);
  const expired1dRes = await invokeWorkerWebhook(webhookBody, expired1dSig);
  assertDefense(
    "Historical replay attack (1 day ago) rejected with HTTP 401",
    expired1dRes.status === 401
  );

  // Attack 3.3.1: Future Timestamp - 301 seconds in future
  const future301Ts = currentTs + 301;
  const future301Sig = generatePaddleSignatureHeader(webhookBody, future301Ts, testSecret);
  const future301Res = await invokeWorkerWebhook(webhookBody, future301Sig);
  assertDefense(
    "Future timestamp (301s in future > 300s window) rejected with HTTP 401",
    future301Res.status === 401
  );

  // Attack 3.3.2: Future Timestamp - 600 seconds in future
  const future600Ts = currentTs + 600;
  const future600Sig = generatePaddleSignatureHeader(webhookBody, future600Ts, testSecret);
  const future600Res = await invokeWorkerWebhook(webhookBody, future600Sig);
  assertDefense(
    "Future timestamp (600s in future) rejected with HTTP 401",
    future600Res.status === 401
  );

  // Attack 3.3.3: Future Timestamp - 1 day in future
  const future1dTs = currentTs + 86400;
  const future1dSig = generatePaddleSignatureHeader(webhookBody, future1dTs, testSecret);
  const future1dRes = await invokeWorkerWebhook(webhookBody, future1dSig);
  assertDefense(
    "Future timestamp (1 day in future) rejected with HTTP 401",
    future1dRes.status === 401
  );

  // Boundary 3.4: Legitimate timestamps within window (e.g. ±150 seconds)
  const past150Ts = currentTs - 150;
  const past150Sig = generatePaddleSignatureHeader(webhookBody, past150Ts, testSecret);
  const past150Res = await invokeWorkerWebhook(webhookBody, past150Sig);
  assertDefense(
    "Timestamp within tolerance window (-150s) accepted with HTTP 200",
    past150Res.status === 200
  );

  const future150Ts = currentTs + 150;
  const future150Sig = generatePaddleSignatureHeader(webhookBody, future150Ts, testSecret);
  const future150Res = await invokeWorkerWebhook(webhookBody, future150Sig);
  assertDefense(
    "Timestamp within tolerance window (+150s) accepted with HTTP 200",
    future150Res.status === 200
  );

  // Attack 3.5.1: Tampered HMAC Signature (Single Hex Character Flipped)
  const cleanValidHash = validCurrentSig.split(";")[1].split("=")[1];
  const tamperedHash = (cleanValidHash[0] === "a" ? "b" : "a") + cleanValidHash.slice(1);
  const tamperedHmacSig = `ts=${currentTs};h1=${tamperedHash}`;
  const tamperedHmacRes = await invokeWorkerWebhook(webhookBody, tamperedHmacSig);
  assertDefense(
    "Tampered HMAC-SHA256 signature rejected with HTTP 401",
    tamperedHmacRes.status === 401
  );

  // Attack 3.5.2: Secret Key Mismatch (Signature calculated with wrong secret)
  const wrongSecretSig = generatePaddleSignatureHeader(webhookBody, currentTs, "wrong_secret_attacker_key");
  const wrongSecretRes = await invokeWorkerWebhook(webhookBody, wrongSecretSig);
  assertDefense(
    "Signature generated with wrong secret rejected with HTTP 401",
    wrongSecretRes.status === 401
  );

  // Attack 3.5.3: Missing / Null / Malformed Signature Header
  const missingSigRes = await invokeWorkerWebhook(webhookBody, null);
  assertDefense("Missing Paddle-Signature header rejected with HTTP 401", missingSigRes.status === 401);

  const malformedSigRes1 = await invokeWorkerWebhook(webhookBody, "garbage_header_without_ts_and_h1");
  assertDefense("Malformed Paddle-Signature header rejected with HTTP 401", malformedSigRes1.status === 401);

  const malformedSigRes2 = await invokeWorkerWebhook(webhookBody, `ts=${currentTs};`);
  assertDefense("Paddle-Signature missing h1 rejected with HTTP 401", malformedSigRes2.status === 401);


  // ===========================================================================
  // CHALLENGE 4: 付款核心事件 `transaction.paid` 仿真发货挑战
  // ===========================================================================
  console.log("\n▶ [CHALLENGE 4] Payment Core Event 'transaction.paid' Fulfillment Simulation");

  // Reset KV for clean testing
  mockKv.clear();

  const paidOrderId = "txn_paid_adv_simulation_888";
  const paidBuyerEmail = "adversary_buyer@enterprise.org";
  const paidWebhookBody = JSON.stringify({
    event_id: "evt_paid_adv_888",
    event_type: "transaction.paid",
    data: {
      id: paidOrderId,
      status: "paid",
      customer: { email: paidBuyerEmail },
      items: [{
        price: { id: "pri_01m708eevn06vvarffpabpyprd", description: "BHM-PRO Lifetime Buyout" }
      }],
      details: {
        totals: { total: "2490" }
      }
    }
  });

  const paidSigHeader = generatePaddleSignatureHeader(paidWebhookBody, currentTs, testSecret);
  const paidResponse = await invokeWorkerWebhook(paidWebhookBody, paidSigHeader);
  assertDefense("transaction.paid event returned HTTP 200", paidResponse.status === 200);

  const paidJson = await paidResponse.json();
  assertDefense("transaction.paid response success is true", paidJson.success === true);
  assertDefense("transaction.paid tier resolved to LTD", paidJson.tier === "LTD");
  assertDefense("transaction.paid minted a non-empty licenseKey", typeof paidJson.licenseKey === "string" && paidJson.licenseKey.startsWith("BHM1."));

  // Verify the issued key with LicenseManager offline verification engine
  const clientVerification = await LicenseManager.verifyLicense(paidJson.licenseKey);
  assertDefense("Client LicenseManager accepts Worker-minted license", clientVerification.valid === true);
  assertDefense("Client LicenseManager confirms tier is LTD", clientVerification.tier === "LTD");
  assertDefense("Client LicenseManager confirms sub matches buyer email", clientVerification.sub === paidBuyerEmail);
  assertDefense("Worker minted LTD key has maxCleanQuota of 9999999", clientVerification.maxCleanQuota === 9999999);
  assertDefense("Worker minted LTD key has ~100-year expiration (perpetual)", clientVerification.exp > currentTs + 36000 * 86400);

  // Test idempotency on transaction.paid:
  // Case A: Exact same event_id retried by Paddle -> Event-level deduplication
  const retryPaidResponse = await invokeWorkerWebhook(paidWebhookBody, paidSigHeader);
  assertDefense("Retried transaction.paid (same event_id) returned HTTP 200", retryPaidResponse.status === 200);
  const retryPaidJson = await retryPaidResponse.json();
  assertDefense("Retried webhook flagged as duplicated at event level", retryPaidJson.duplicated === true && retryPaidJson.eventId === "evt_paid_adv_888");

  // Case B: Different event_id for the same orderId -> Order-level deduplication returning cached licenseKey
  const duplicateOrderWebhookBody = JSON.stringify({
    event_id: "evt_paid_adv_duplicate_999",
    event_type: "transaction.paid",
    data: {
      id: paidOrderId,
      status: "paid",
      customer: { email: paidBuyerEmail },
      items: [{ price_id: "pri_01m708eevn06vvarffpabpyprd" }]
    }
  });
  const dupOrderSigHeader = generatePaddleSignatureHeader(duplicateOrderWebhookBody, currentTs, testSecret);
  const dupOrderResponse = await invokeWorkerWebhook(duplicateOrderWebhookBody, dupOrderSigHeader);
  assertDefense("Duplicate order webhook (different event_id) returned HTTP 200", dupOrderResponse.status === 200);
  const dupOrderJson = await dupOrderResponse.json();
  assertDefense("Duplicate order flagged as duplicated at order level", dupOrderJson.duplicated === true);
  assertDefense("Duplicate order returns identical cached licenseKey (no re-minting)", dupOrderJson.licenseKey === paidJson.licenseKey);

  // Test other event types: transaction.completed and transaction.updated (status === paid)
  const completedOrderId = "txn_completed_adv_777";
  const completedWebhookBody = JSON.stringify({
    event_id: "evt_completed_adv_777",
    event_type: "transaction.completed",
    data: {
      id: completedOrderId,
      status: "completed",
      customer: { email: "completed_buyer@test.com" },
      items: [{ price_id: "pri_01m708ecngjxf937bz9zcs9m6f" }]
    }
  });
  const completedSig = generatePaddleSignatureHeader(completedWebhookBody, currentTs, testSecret);
  const completedRes = await invokeWorkerWebhook(completedWebhookBody, completedSig);
  assertDefense("transaction.completed successfully minted Single Wash license", completedRes.status === 200);
  const completedJson = await completedRes.json();
  assertDefense("transaction.completed tier resolved to SINGLE_WASH", completedJson.tier === "SINGLE_WASH");

  // Test failed order status gating (status === 'failed' MUST NOT mint license)
  const failedWebhookBody = JSON.stringify({
    event_id: "evt_failed_adv_000",
    event_type: "transaction.updated",
    data: {
      id: "txn_failed_000",
      status: "failed",
      customer: { email: "failed@test.com" }
    }
  });
  const failedSig = generatePaddleSignatureHeader(failedWebhookBody, currentTs, testSecret);
  const failedRes = await invokeWorkerWebhook(failedWebhookBody, failedSig);
  assertDefense("Failed transaction acknowledged without minting license", failedRes.status === 200);
  const failedJson = await failedRes.json();
  assertDefense("Failed transaction did not return a licenseKey", failedJson.licenseKey === undefined);
  const failedOrderInKv = await mockKv.get("order:txn_failed_000");
  assertDefense("Failed transaction was not written to order KV", failedOrderInKv === null);


  // ===========================================================================
  // CHALLENGE 5: 退款撤销自服务查询拦截挑战 (Refund & Revocation Interception)
  // ===========================================================================
  console.log("\n▶ [CHALLENGE 5] Refund & Revocation Interception on /license & /v1/licenses/verify");

  // Step 5.1: Customer self-service lookup BEFORE refund
  async function invokeGetLicense(orderId, email) {
    const params = new URLSearchParams();
    if (orderId !== null) params.set("order_id", orderId);
    if (email !== null) params.set("email", email);
    const req = new Request(`https://bhm-pro-license-worker.geo-score.workers.dev/license?${params.toString()}`, {
      method: "GET"
    });
    return await worker.fetch(req, workerEnv, {});
  }

  const preRefundLookup = await invokeGetLicense(paidOrderId, paidBuyerEmail);
  assertDefense("Pre-refund customer lookup succeeds with HTTP 200", preRefundLookup.status === 200);
  const preRefundJson = await preRefundLookup.json();
  assertDefense("Pre-refund customer lookup returns licenseKey", preRefundJson.licenseKey === paidJson.licenseKey);

  // Step 5.2: Online key verification BEFORE refund
  async function invokeVerifyLicense(key) {
    const req = new Request("https://bhm-pro-license-worker.geo-score.workers.dev/v1/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: key })
    });
    return await worker.fetch(req, workerEnv, {});
  }

  const preRefundVerify = await invokeVerifyLicense(paidJson.licenseKey);
  assertDefense("Pre-refund /v1/licenses/verify returns valid: true, revoked: false", preRefundVerify.status === 200);
  const preRefundVerifyJson = await preRefundVerify.json();
  assertDefense("Pre-refund key is not revoked", preRefundVerifyJson.revoked === false && preRefundVerifyJson.valid === true);

  // Step 5.3: Simulate Paddle Refund Webhook (adjustment.updated with action: refund)
  const refundWebhookBody = JSON.stringify({
    event_id: "evt_refund_adj_001",
    event_type: "adjustment.updated",
    data: {
      id: "adj_adv_001",
      action: "refund",
      transaction_id: paidOrderId,
      status: "approved"
    }
  });
  const refundSig = generatePaddleSignatureHeader(refundWebhookBody, currentTs, testSecret);
  const refundRes = await invokeWorkerWebhook(refundWebhookBody, refundSig);
  assertDefense("adjustment.updated (refund) processed with HTTP 200", refundRes.status === 200);
  const refundJson = await refundRes.json();
  assertDefense("Refund recorded in worker KV", refundJson.action === "refund_recorded");

  // Step 5.4: Self-service query AFTER refund (Direct order_id)
  const postRefundLookup = await invokeGetLicense(paidOrderId, paidBuyerEmail);
  assertDefense(
    "Post-refund /license query is strictly BLOCKED with HTTP 403 Forbidden",
    postRefundLookup.status === 403
  );
  const postRefundLookupJson = await postRefundLookup.json();
  assertDefense("Post-refund /license error reports refund & revocation", postRefundLookupJson.revoked === true);

  // Step 5.5: Self-service query with leading '#' (UI order input variance)
  const hashRefundLookup = await invokeGetLicense(`#${paidOrderId}`, paidBuyerEmail);
  assertDefense(
    "Post-refund /license query with leading '#' is also BLOCKED with HTTP 403 Forbidden",
    hashRefundLookup.status === 403
  );
  const hashRefundLookupJson = await hashRefundLookup.json();
  assertDefense("Leading '#' query correctly identifies revocation", hashRefundLookupJson.revoked === true);

  // Step 5.6: Online verification POST /v1/licenses/verify AFTER refund
  const postRefundVerify = await invokeVerifyLicense(paidJson.licenseKey);
  assertDefense("Post-refund /v1/licenses/verify returns HTTP 200 with revocation status", postRefundVerify.status === 200);
  const postRefundVerifyJson = await postRefundVerify.json();
  assertDefense(
    "Post-refund license key flagged as valid: false, revoked: true",
    postRefundVerifyJson.valid === false && postRefundVerifyJson.revoked === true
  );
  assertDefense(
    "Revocation reason specifies order refunded or revoked",
    postRefundVerifyJson.reason.includes("refunded") || postRefundVerifyJson.reason.includes("revoked")
  );

  // Step 5.7: Non-refunded order isolation check (Separate active order is NOT affected)
  const isolationLookup = await invokeGetLicense(completedOrderId, "completed_buyer@test.com");
  assertDefense("Non-refunded active order lookup remains accessible (HTTP 200)", isolationLookup.status === 200);

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log("\n================================================================================");
  console.log(`🛡️ ADVERSARIAL CHALLENGE EXECUTION COMPLETE`);
  console.log(`   Total Challenges Run: ${totalChallenges}`);
  console.log(`   Defenses Held (Passed): ${passedChallenges}`);
  console.log(`   Defenses Breached (Failed): ${failedChallenges}`);
  console.log("================================================================================\n");

  if (failedChallenges === 0) {
    console.log("🎉 ALL ADVERSARIAL CHALLENGES REPELLED: VERDICT IS APPROVE! 🛡️");
    return { verdict: "APPROVE", totalChallenges, passedChallenges, failedChallenges };
  } else {
    console.error("💥 SYSTEM BREACHED: VERDICT IS REQUEST_CHANGES!");
    process.exit(1);
  }
}

if (require.main === module) {
  runAdversarialCryptoAndWebhookChallenges().catch((err) => {
    console.error("Adversarial suite encountered unexpected crash:", err);
    process.exit(1);
  });
}

module.exports = { runAdversarialCryptoAndWebhookChallenges };
