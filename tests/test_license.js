const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const { MockChrome } = require("./helpers/mock_chrome.js");

// Load genuine implementation module from source (no silent fallback dummy class)
const implPath = path.resolve(__dirname, "../bookmark-organizer/core/license.js");
assert(fs.existsSync(implPath), "bookmark-organizer/core/license.js must exist");
const { LicenseManager } = require(implPath);
assert(LicenseManager, "LicenseManager must be exported from core/license.js");

/**
 * Test fixture helper for generating Ed25519 signed licenses
 * Generates an ephemeral in-memory Ed25519 keypair for tests
 */
class LicenseTestFixture {
  constructor() {
    this.keypair = null;
    this.privateKey = null;
    this.publicKeySpkiBase64 = null;
    this.untrustedPrivateKey = null;
  }

  async init() {
    const cryptoObj = globalThis.crypto || require("node:crypto").webcrypto;
    // Generate genuine in-memory ephemeral Ed25519 keypair for test execution
    this.keypair = await cryptoObj.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    this.privateKey = this.keypair.privateKey;
    const spkiBuf = await cryptoObj.subtle.exportKey("spki", this.keypair.publicKey);
    this.publicKeySpkiBase64 = Buffer.from(spkiBuf).toString("base64");

    // Generate an untrusted keypair to test key-tampering / rogue signer rejection
    const untrustedKp = await cryptoObj.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    this.untrustedPrivateKey = untrustedKp.privateKey;
  }

  async createSignedLicense(payloadObj, useUntrustedKey = false) {
    const cryptoObj = globalThis.crypto || require("node:crypto").webcrypto;
    const payloadJson = JSON.stringify(payloadObj);
    const payloadB64Url = Buffer.from(payloadJson).toString("base64url");
    const headerAndPayload = "BHM1." + payloadB64Url;

    const signingKey = useUntrustedKey ? this.untrustedPrivateKey : this.privateKey;
    const sig = await cryptoObj.subtle.sign(
      { name: "Ed25519" },
      signingKey,
      new TextEncoder().encode(headerAndPayload)
    );
    const sigB64Url = Buffer.from(sig).toString("base64url");
    return headerAndPayload + "." + sigB64Url;
  }
}

async function runLicenseTests() {
  console.log("▶ [Test Suite] Offline Ed25519 Asymmetric Commercial Licensing & Quota Engine Tests");

  const prodSpki = LicenseManager.PUBLIC_KEY_SPKI;
  const fixture = new LicenseTestFixture();
  await fixture.init();

  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  try {
    // ========================================================================
    // Group 1: Pricing Constants and Feature Action Gating
    // ========================================================================
    console.log("  ▶ Group 1: Pricing Ladder and Action Gating Verification");
    const washPrice = LicenseManager.PRICING?.SINGLE_WASH?.price;
    const ltdPrice = LicenseManager.PRICING?.LTD?.price;
    assert.strictEqual(washPrice, 9.90, "Single Wash Card must be $9.90");
    assert.strictEqual(ltdPrice, 24.90, "Lifetime Deal must be $24.90");
    console.log(`    ✓ Pricing ladder confirmed: Single Wash = $${washPrice}, Lifetime LTD = $${ltdPrice}`);

    assert.strictEqual(LicenseManager.canExecuteAction("SCAN", "FREE"), true, "Scan must be free for all");
    assert.strictEqual(LicenseManager.canExecuteAction("EXPORT", "FREE"), true, "Export must be free for all");
    assert.strictEqual(LicenseManager.canExecuteAction("BATCH_MOVE", "FREE"), false, "Batch move must be gated for Free");
    assert.strictEqual(LicenseManager.canExecuteAction("CUSTOM_RULES", "FREE"), false, "Custom rules must be gated for Free");
    assert.strictEqual(LicenseManager.canExecuteAction("BATCH_MOVE", "SINGLE_WASH"), true, "Single wash unlocks batch move");
    assert.strictEqual(LicenseManager.canExecuteAction("CUSTOM_RULES", "SINGLE_WASH"), false, "Single wash does not unlock custom rules");
    assert.strictEqual(LicenseManager.canExecuteAction("BATCH_MOVE", "LTD"), true, "LTD unlocks batch move");
    assert.strictEqual(LicenseManager.canExecuteAction("CUSTOM_RULES", "LTD"), true, "LTD unlocks custom workflows");
    assert.strictEqual(LicenseManager.canExecuteAction("BATCH_MOVE", "PRO"), true, "PRO tier unlocks batch move");
    assert.strictEqual(LicenseManager.canExecuteAction("CUSTOM_RULES", "PRO"), true, "PRO tier unlocks custom workflows");
    assert.strictEqual(LicenseManager.canExecuteAction("UNKNOWN_ACTION", "LTD"), false, "Unknown actions default to false");
    console.log("    ✓ Action feature gating verified for all tiers");

    // ========================================================================
    // Group 2: Client Source Cleanliness (No Key Generator or Private Key in Client)
    // ========================================================================
    console.log("  ▶ Group 2: Client Source Hardening & Anti-Generator Check");
    assert.strictEqual(
      typeof LicenseManager.generateLicenseKey,
      "undefined",
      "generateLicenseKey must be completely removed from client source"
    );
    assert(LicenseManager.PUBLIC_KEY_SPKI, "Client source must contain the authentic Ed25519 public key (SPKI)");
    assert.notStrictEqual(
      prodSpki,
      "MCowBQYDK2VwAyEAxrtLjMre49/DbY7WUcbQOXQfLwc0AXFdBmN0Q1eEBJw=",
      "Must not use old leaked test public key"
    );
    const prodSpkiBytes = Buffer.from(prodSpki, "base64");
    assert.strictEqual(prodSpkiBytes.length, 44, "Authentic Ed25519 SPKI DER must be exactly 44 bytes");
    assert.strictEqual(
      typeof LicenseManager.setPublicKeyForTesting,
      "undefined",
      "setPublicKeyForTesting must be completely eradicated"
    );
    assert.strictEqual(
      typeof LicenseManager.resetPublicKeyForTesting,
      "undefined",
      "resetPublicKeyForTesting must be completely eradicated"
    );
    assert.strictEqual(typeof LicenseManager._verifyChecksum, "undefined", "16-bit weak checksum function must be removed");
    console.log("    ✓ Client code has no generator, no private key, no backdoors, and authentic 44-byte Ed25519 public key");

    // Configure in-memory ephemeral key for functional signature tests
    LicenseManager.PUBLIC_KEY_SPKI = fixture.publicKeySpkiBase64;
    LicenseManager._cachedPublicKey = null;

    // ========================================================================
    // Group 3: Validly Signed Keys (Ed25519 Asymmetric Verification)
    // ========================================================================
    console.log("  ▶ Group 3: Ed25519 Genuine Signature Verification (Valid Keys)");
    const nowSec = Math.floor(Date.now() / 1000);

    // 3.1: Valid LTD license
    const validLtdKey = await fixture.createSignedLicense({
      sub: "user_sub_ltd_1001",
      exp: nowSec + 365 * 86400,
      tier: "LTD",
      maxCleanQuota: 999999,
      iat: nowSec
    });
    const ltdRes = await LicenseManager.verifyLicense(validLtdKey);
    assert.strictEqual(ltdRes.valid, true, "Validly signed LTD key must pass verification");
    assert.strictEqual(ltdRes.tier, "LTD");
    assert.strictEqual(ltdRes.sub, "user_sub_ltd_1001");
    assert.strictEqual(ltdRes.maxCleanQuota, 999999);
    console.log("    ✓ Valid LTD signed license key verified successfully");

    // 3.2: Valid PRO license
    const validProKey = await fixture.createSignedLicense({
      sub: "user_sub_pro_2002",
      exp: nowSec + 30 * 86400,
      tier: "PRO",
      maxCleanQuota: 1000,
      iat: nowSec
    });
    const proRes = await LicenseManager.verifyLicense(validProKey);
    assert.strictEqual(proRes.valid, true, "Validly signed PRO key must pass verification");
    assert.strictEqual(proRes.tier, "PRO");
    assert.strictEqual(proRes.sub, "user_sub_pro_2002");
    assert.strictEqual(proRes.maxCleanQuota, 1000);
    console.log("    ✓ Valid PRO signed license key verified successfully");

    // 3.3: Valid Single Wash Pass license
    const validSwKey = await fixture.createSignedLicense({
      sub: "user_sub_sw_3003",
      exp: nowSec + 30 * 86400,
      tier: "SINGLE_WASH",
      maxCleanQuota: 500,
      iat: nowSec
    });
    const swRes = await LicenseManager.verifyLicense(validSwKey);
    assert.strictEqual(swRes.valid, true, "Validly signed SINGLE_WASH key must pass verification");
    assert.strictEqual(swRes.tier, "SINGLE_WASH");
    assert.strictEqual(swRes.sub, "user_sub_sw_3003");
    assert.strictEqual(swRes.maxCleanQuota, 500);
    console.log("    ✓ Valid SINGLE_WASH signed license key verified successfully");

    // ========================================================================
    // Group 4: Complete Elimination of Backdoors (Anti-Backdoor Verification)
    // ========================================================================
    console.log("  ▶ Group 4: Anti-Backdoor Verification (UUIDs, Length > 5, Collisions, Forgeries)");

    // 4.1: Any UUID key fails verification (Eliminating PA-3 pseudo-assertion)
    const uuidSamples = [
      "12345678-ABCD-EF01-2345-6789ABCDEF01",
      "00000000-0000-0000-0000-000000000000",
      "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE",
      "f47ac10b-58cc-4372-a567-0e02b2c3d479"
    ];
    for (const uuid of uuidSamples) {
      const res = await LicenseManager.verifyLicense(uuid);
      assert.strictEqual(res.valid, false, `UUID "${uuid}" MUST fail verification`);
      assert.strictEqual(res.tier, "FREE", "Failed UUID must resolve to FREE tier");
    }
    console.log("    ✓ All UUID formats rejected (PA-3 pseudo-assertion eradicated)");

    // 4.2: Random strings or key.length > 5 fail verification
    const stringSamples = [
      "123456",
      "abcdef",
      "ABCDEF",
      "SUPER_SECRET_KEY",
      "BHM-PRO-LIFETIME-AUTHORIZED",
      "BHM-LTD-1234-5678",
      "BHM-SW-A1B2-C3D4",
      "BHM-HACKED-KEY-1234"
    ];
    for (const s of stringSamples) {
      const res = await LicenseManager.verifyLicense(s);
      assert.strictEqual(res.valid, false, `String "${s}" MUST fail verification`);
      assert.strictEqual(res.tier, "FREE");
    }
    console.log("    ✓ Arbitrary strings and legacy formats rejected");

    // 4.3: Empty, null, whitespace, and non-string inputs
    assert.strictEqual((await LicenseManager.verifyLicense("")).valid, false);
    assert.strictEqual((await LicenseManager.verifyLicense(null)).valid, false);
    assert.strictEqual((await LicenseManager.verifyLicense(undefined)).valid, false);
    assert.strictEqual((await LicenseManager.verifyLicense("    ")).valid, false);
    assert.strictEqual((await LicenseManager.verifyLicense(12345)).valid, false);
    assert.strictEqual((await LicenseManager.verifyLicense({})).valid, false);
    console.log("    ✓ Empty, null, whitespace, and non-string rejected safely");

    // ========================================================================
    // Group 5: Expired License Key Detection
    // ========================================================================
    console.log("  ▶ Group 5: Expired Signed License Detection");
    const expiredKey = await fixture.createSignedLicense({
      sub: "user_expired_9999",
      exp: nowSec - 3600, // Expired 1 hour ago
      tier: "LTD",
      maxCleanQuota: 500,
      iat: nowSec - 86400 * 30
    });
    const expRes = await LicenseManager.verifyLicense(expiredKey);
    assert.strictEqual(expRes.valid, false, "Expired signed license key must fail verification");
    assert.strictEqual(expRes.isExpired, true, "Expired license must have isExpired: true");
    assert.strictEqual(expRes.error, "License has expired", "Expired license error message must match");
    console.log("    ✓ Expired signed license key correctly identified and rejected");

    // ========================================================================
    // Group 6: Tampered Payload and Tampered Signature Detection
    // ========================================================================
    console.log("  ▶ Group 6: Tampered Payload & Signature Detection");

    // 6.1: Tampered signature (alter 1 character in signature)
    const validParts = validLtdKey.split(".");
    const tamperedSigChar = validParts[2].charAt(0) === "A" ? "B" : "A";
    const tamperedSigKey = `${validParts[0]}.${validParts[1]}.${tamperedSigChar}${validParts[2].slice(1)}`;
    const tamperedSigRes = await LicenseManager.verifyLicense(tamperedSigKey);
    assert.strictEqual(tamperedSigRes.valid, false, "Tampered signature must fail verification");
    console.log("    ✓ Tampered signature rejected");

    // 6.2: Tampered payload (payload modified without re-signing)
    const forgedPayload = Buffer.from(JSON.stringify({
      sub: "user_sub_ltd_1001",
      exp: nowSec + 365 * 86400 * 10, // Attempted 10-year extension
      tier: "LTD",
      maxCleanQuota: 99999999,
      iat: nowSec
    })).toString("base64url");
    const tamperedPayloadKey = `${validParts[0]}.${forgedPayload}.${validParts[2]}`;
    const tamperedPayloadRes = await LicenseManager.verifyLicense(tamperedPayloadKey);
    assert.strictEqual(tamperedPayloadRes.valid, false, "Tampered payload must fail signature verification");
    console.log("    ✓ Tampered payload rejected");

    // 6.3: Signature generated by an untrusted (rogue) private key
    const rogueKey = await fixture.createSignedLicense({
      sub: "attacker_001",
      exp: nowSec + 365 * 86400,
      tier: "LTD",
      maxCleanQuota: 999999,
      iat: nowSec
    }, true);
    const rogueRes = await LicenseManager.verifyLicense(rogueKey);
    assert.strictEqual(rogueRes.valid, false, "License signed with untrusted key must fail verification");
    console.log("    ✓ Key signed by untrusted keypair rejected");

    // ========================================================================
    // Group 7: Dynamic checkProStatus() and Anti-Storage-Spoofing
    // ========================================================================
    console.log("  ▶ Group 7: Dynamic checkProStatus() Re-Verification & Storage Guard");

    // 7.1: Clean state - No stored key
    await mockChrome.storage.local.clear();
    let status = await LicenseManager.checkProStatus(mockChrome.storage.local);
    assert.strictEqual(status.isPro, false);
    assert.strictEqual(status.tier, "FREE");
    console.log("    ✓ Fresh storage defaults to isPro: false, tier: FREE");

    // 7.2: Attacker sets bhm_pro_activated: true with no or forged key
    await mockChrome.storage.local.set({
      bhm_pro_activated: true,
      bhm_license_key: "00000000-0000-0000-0000-000000000000"
    });
    status = await LicenseManager.checkProStatus(mockChrome.storage.local);
    assert.strictEqual(status.isPro, false, "Forged UUID key must NOT pass checkProStatus");
    assert.strictEqual(status.tier, "FREE");
    const tamperedStorageState = await mockChrome.storage.local.get(["bhm_pro_activated"]);
    assert.strictEqual(
      tamperedStorageState.bhm_pro_activated,
      false,
      "checkProStatus must reset bhm_pro_activated to false on invalid key"
    );
    console.log("    ✓ Blind trust prevented: Forged storage state downgraded to FREE");

    // 7.3: Store valid LTD key -> checkProStatus dynamically validates and sets isPro: true
    await mockChrome.storage.local.set({ bhm_license_key: validLtdKey });
    status = await LicenseManager.checkProStatus(mockChrome.storage.local);
    assert.strictEqual(status.isPro, true);
    assert.strictEqual(status.tier, "LTD");
    const activeStorageState = await mockChrome.storage.local.get(["bhm_pro_activated", "bhm_license_tier"]);
    assert.strictEqual(activeStorageState.bhm_pro_activated, true);
    assert.strictEqual(activeStorageState.bhm_license_tier, "LTD");
    console.log("    ✓ Valid stored key dynamically activates Pro LTD status in storage");

    // 7.4: Store expired key with bhm_pro_activated: true -> checkProStatus dynamically downgrades to FREE
    await mockChrome.storage.local.set({
      bhm_license_key: expiredKey,
      bhm_pro_activated: true,
      bhm_license_tier: "LTD"
    });
    status = await LicenseManager.checkProStatus(mockChrome.storage.local);
    assert.strictEqual(status.isPro, false, "Expired stored key must be downgraded to FREE");
    assert.strictEqual(status.tier, "FREE");
    const expiredStorageState = await mockChrome.storage.local.get(["bhm_pro_activated", "bhm_license_tier"]);
    assert.strictEqual(
      expiredStorageState.bhm_pro_activated,
      false,
      "Storage bhm_pro_activated must be reset to false for expired license"
    );
    assert.strictEqual(expiredStorageState.bhm_license_tier, "FREE");
    console.log("    ✓ Expired stored key dynamically downgraded and storage reset");

    // ========================================================================
    // Group 8: Quota Persistence (bhm_quota_used in chrome.storage.local)
    // ========================================================================
    console.log("  ▶ Group 8: Quota Persistence (getRemainingQuota & consumeQuota)");

    await mockChrome.storage.local.clear();

    // 8.1: Initial remaining quota
    let remaining = await LicenseManager.getRemainingQuota("SINGLE_WASH", mockChrome.storage.local);
    assert.strictEqual(remaining, 500, "Initial Single Wash quota must be 500");

    // 8.2: Consume 50 quota units
    const consumeRes1 = await LicenseManager.consumeQuota(50, mockChrome.storage.local);
    assert.strictEqual(consumeRes1.success, true);
    assert.strictEqual(consumeRes1.used, 50);

    // Verify storage has persisted value
    let quotaStorage = await mockChrome.storage.local.get(["bhm_quota_used"]);
    assert.strictEqual(quotaStorage.bhm_quota_used, 50, "bhm_quota_used in storage must be 50");

    remaining = await LicenseManager.getRemainingQuota("SINGLE_WASH", mockChrome.storage.local);
    assert.strictEqual(remaining, 450, "Remaining Single Wash quota must be 450 after consuming 50");

    // 8.3: Consume another 100 quota units
    const consumeRes2 = await LicenseManager.consumeQuota(100, mockChrome.storage.local);
    assert.strictEqual(consumeRes2.success, true);
    assert.strictEqual(consumeRes2.used, 150);

    quotaStorage = await mockChrome.storage.local.get(["bhm_quota_used"]);
    assert.strictEqual(quotaStorage.bhm_quota_used, 150, "bhm_quota_used in storage must be 150");

    remaining = await LicenseManager.getRemainingQuota("SINGLE_WASH", mockChrome.storage.local);
    assert.strictEqual(remaining, 350, "Remaining Single Wash quota must be 350 after consuming 150");

    // 8.4: LTD quota is always Infinity regardless of consumption
    const ltdQuota = await LicenseManager.getRemainingQuota("LTD", mockChrome.storage.local);
    assert.strictEqual(ltdQuota, Infinity, "LTD quota must remain Infinity");

    console.log("    ✓ Quota decrements and persistence in storage.local fully verified");

    console.log("\n✅ All Offline Ed25519 License Engine & Quota Persistence tests PASSED with 100% genuine assertions!\n");
  } finally {
    LicenseManager.PUBLIC_KEY_SPKI = prodSpki;
    LicenseManager._cachedPublicKey = null;
    mockChrome.uninstallGlobal();
  }
}

module.exports = {
  runLicenseTests,
  LicenseManager
};

if (require.main === module) {
  runLicenseTests().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
}
