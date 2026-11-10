// tests/test_monotonic_clock_rollback.js
// Dedicated Unit Test for Monotonic High Watermark Clock Rollback Defense (EXT-07 & EXT-14)

const assert = require("node:assert");
const crypto = require("node:crypto");
const { LicenseManager } = require("../bookmark-organizer/core/license.js");

async function runMonotonicClockRollbackTests() {
  console.log("================================================================================");
  console.log("   BHM-PRO Monotonic Clock High Watermark & Rollback Defense Verification       ");
  console.log("================================================================================\n");

  // Generate an authentic Ed25519 keypair for testing
  const keyPair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const rawPubDer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const pubB64 = Buffer.from(rawPubDer).toString("base64");

  // Temporarily install key into cached public key
  LicenseManager._cachedPublicKey = keyPair.publicKey;

  const nowSec = Math.floor(Date.now() / 1000);

  // Mint a valid LTD license
  const payload = {
    id: "lic_test_watermark",
    sub: "user@example.com",
    tier: "LTD",
    iat: nowSec,
    exp: nowSec + 86400 * 365,
    maxCleanQuota: 9999999
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sigBuf = await crypto.subtle.sign("Ed25519", keyPair.privateKey, new TextEncoder().encode(`BHM1.${payloadB64}`));
  const validKey = `BHM1.${payloadB64}.${Buffer.from(sigBuf).toString("base64url")}`;

  // 1. Normal verification passes
  console.log("▶ [Test 1] Authentic license normal verification");
  const normalRes = await LicenseManager.verifyLicense(validKey);
  assert.strictEqual(normalRes.valid, true, "Authentic license must be valid");
  assert.strictEqual(normalRes.tier, "LTD");
  console.log("  ✓ Normal verification passed with valid: true");

  // 2. verifyLicense with high watermark in storageData (Clock rolled back)
  console.log("\n▶ [Test 2] verifyLicense with rolled back system clock (storage high watermark > now + 60)");
  const rolledBackStorage = {
    bhm_last_valid_time: nowSec + 3600 // 1 hour ahead
  };
  const rolledBackRes = await LicenseManager.verifyLicense(validKey, rolledBackStorage);
  assert.strictEqual(rolledBackRes.valid, false, "Rolled back clock must be rejected");
  assert.strictEqual(rolledBackRes.tier, LicenseManager.TIERS.FREE);
  assert.strictEqual(rolledBackRes.reason, "System clock tampered");
  assert.ok(rolledBackRes.error.includes("Current time is earlier than last recorded valid time"), "Error must describe high watermark rollback");
  console.log("  ✓ verifyLicense firmly rejected rolled back clock with valid: false");

  // 3. verifyLicense with acceptable clock jitter (within 60s tolerance)
  console.log("\n▶ [Test 3] verifyLicense clock jitter tolerance (within 60s)");
  const jitterStorage = {
    bhm_last_valid_time: nowSec + 30 // 30s ahead (within 60s tolerance)
  };
  const jitterRes = await LicenseManager.verifyLicense(validKey, jitterStorage);
  assert.strictEqual(jitterRes.valid, true, "Clock jitter <= 60s must be tolerated");
  console.log("  ✓ 30s clock jitter tolerated as valid");

  // 4. checkProStatus with high watermark rolled back
  console.log("\n▶ [Test 4] checkProStatus detects rolled back clock and revokes Pro status");
  const mockTamperedStore = {
    state: {
      bhm_license_key: validKey,
      bhm_pro_activated: true,
      bhm_last_valid_time: nowSec + 7200, // 2 hours ahead
      bhm_quota_used: 0
    },
    get: function(keys, cb) {
      const out = {};
      for (const k of keys) out[k] = this.state[k];
      cb(out);
    },
    set: function(items, cb) {
      Object.assign(this.state, items);
      if (cb) cb();
    }
  };

  const checkTamperedRes = await LicenseManager.checkProStatus(mockTamperedStore);
  assert.strictEqual(checkTamperedRes.isPro, false, "checkProStatus must return isPro: false on clock rollback");
  assert.strictEqual(checkTamperedRes.tier, LicenseManager.TIERS.FREE);
  assert.ok(checkTamperedRes.error.includes("System clock tampered"), "Error message must report clock tampering");
  assert.strictEqual(mockTamperedStore.state.bhm_pro_activated, false, "Storage bhm_pro_activated must be reset to false");
  assert.ok(mockTamperedStore.state.bhm_license_error.includes("System clock tampered"), "Storage bhm_license_error must record tampering");
  console.log("  ✓ checkProStatus firmly revoked Pro status and reset storage on clock rollback");

  // 5. checkProStatus with normal forward progression
  console.log("\n▶ [Test 5] checkProStatus with normal time advances high watermark");
  const mockNormalStore = {
    state: {
      bhm_license_key: validKey,
      bhm_pro_activated: false,
      bhm_last_valid_time: nowSec - 500, // 500s ago
      bhm_quota_used: 0
    },
    get: function(keys, cb) {
      const out = {};
      for (const k of keys) out[k] = this.state[k];
      cb(out);
    },
    set: function(items, cb) {
      Object.assign(this.state, items);
      if (cb) cb();
    }
  };

  const checkNormalRes = await LicenseManager.checkProStatus(mockNormalStore);
  assert.strictEqual(checkNormalRes.isPro, true, "checkProStatus must return isPro: true");
  assert.strictEqual(checkNormalRes.tier, "LTD");
  assert.strictEqual(mockNormalStore.state.bhm_pro_activated, true, "Storage bhm_pro_activated must be true");
  assert.ok(mockNormalStore.state.bhm_last_valid_time >= nowSec, "bhm_last_valid_time must be updated to current time");
  console.log("  ✓ checkProStatus activated Pro and advanced bhm_last_valid_time to nowSec");

  // 6. LicenseManager.PUBLIC_KEY_SPKI format and cryptographic integrity
  console.log("\n▶ [Test 6] LicenseManager.PUBLIC_KEY_SPKI format & tamper verification");
  assert(LicenseManager.PUBLIC_KEY_SPKI, "PUBLIC_KEY_SPKI must be present");
  const spkiBytes = Buffer.from(LicenseManager.PUBLIC_KEY_SPKI, "base64");
  assert.strictEqual(spkiBytes.length, 44, "Authentic Ed25519 SPKI must be 44 bytes");
  console.log("  ✓ PUBLIC_KEY_SPKI is a valid 44-byte Ed25519 SPKI");

  console.log("\n================================================================================");
  console.log("🎉 ALL MONOTONIC CLOCK ROLLBACK & WATERMARK TESTS PASSED (100%)!");
  console.log("================================================================================\n");
}

if (require.main === module) {
  runMonotonicClockRollbackTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}

module.exports = { runMonotonicClockRollbackTests };
