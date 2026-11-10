#!/usr/bin/env node
// ============================================================================
// BHM-PRO Commercial Key Generator & Lemon Squeezy Webhook Processor
// Native Node.js Zero-Dependency Implementation (Ed25519 WebCrypto & HMAC)
// ============================================================================

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { LicenseManager } = require("../bookmark-organizer/core/license.js");

const DEFAULT_KEY_PATH = path.resolve(__dirname, "../private-keys/bhm_prod_ed25519_private.json");

/**
 * Loads the private key (PKCS#8 Base64) from environment or private-keys file
 * @param {string} [customPath]
 * @returns {string} PKCS#8 DER Base64 string
 */
function loadPrivateKey(customPath = null) {
  if (process.env.BHM_ED25519_PRIVATE_KEY_PKCS8) {
    return process.env.BHM_ED25519_PRIVATE_KEY_PKCS8.trim();
  }
  const keyPath = customPath || DEFAULT_KEY_PATH;
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Private key file not found at: ${keyPath}. Set BHM_ED25519_PRIVATE_KEY_PKCS8 or create private-keys file.`);
  }
  const content = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  if (!content.privateKeyPkcs8Base64) {
    throw new Error("Invalid private key file structure: missing privateKeyPkcs8Base64");
  }
  return content.privateKeyPkcs8Base64.trim();
}

/**
 * Signs a license payload using Ed25519 private key
 * Protocol format: BHM1.<base64url(JSON.stringify(payload))>.<base64url(signature)>
 *
 * @param {object} payload
 * @param {string} privateKeyPkcs8Base64
 * @returns {Promise<string>} Signed license key
 */
async function signLicenseKey(payload, privateKeyPkcs8Base64) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload: must be an object");
  }
  if (!privateKeyPkcs8Base64 || typeof privateKeyPkcs8Base64 !== "string") {
    throw new Error("Invalid private key: must be a PKCS#8 base64 string");
  }

  const cryptoObj = globalThis.crypto || crypto.webcrypto;
  const privKeyBytes = Buffer.from(privateKeyPkcs8Base64.trim(), "base64");
  const privateCryptoKey = await cryptoObj.subtle.importKey(
    "pkcs8",
    privKeyBytes,
    { name: "Ed25519" },
    false,
    ["sign"]
  );

  const payloadJson = JSON.stringify(payload);
  const payloadB64Url = Buffer.from(payloadJson, "utf8").toString("base64url");
  const headerAndPayload = "BHM1." + payloadB64Url;

  const signature = await cryptoObj.subtle.sign(
    { name: "Ed25519" },
    privateCryptoKey,
    new TextEncoder().encode(headerAndPayload)
  );

  const sigB64Url = Buffer.from(signature).toString("base64url");
  return headerAndPayload + "." + sigB64Url;
}

/**
 * Issues a commercial license with tier-specific defaults
 *
 * @param {object} options
 * @param {"LTD"|"PRO"|"SINGLE_WASH"} [options.tier="LTD"]
 * @param {string} [options.sub="customer@example.com"]
 * @param {number} [options.validDays]
 * @param {number} [options.maxCleanQuota]
 * @param {string} [options.privateKeyPkcs8Base64]
 * @returns {Promise<{ licenseKey: string, payload: object }>}
 */
async function issueCommercialLicense({
  tier = "LTD",
  sub = "customer@example.com",
  validDays = undefined,
  maxCleanQuota = undefined,
  privateKeyPkcs8Base64 = null
} = {}) {
  const normTier = (tier || "LTD").toUpperCase();
  const iat = Math.floor(Date.now() / 1000);

  let finalDays;
  let finalQuota;

  if (normTier === "SINGLE_WASH") {
    finalDays = typeof validDays === "number" ? validDays : 30;
    finalQuota = typeof maxCleanQuota === "number" ? maxCleanQuota : 500;
  } else {
    // LTD / PRO: 100 years perpetual
    finalDays = typeof validDays === "number" ? validDays : 36500;
    finalQuota = typeof maxCleanQuota === "number" ? maxCleanQuota : 9999999;
  }

  const exp = iat + finalDays * 86400;
  const id = `lic_${normTier.toLowerCase()}_${iat}_${crypto.randomBytes(4).toString("hex")}`;

  const payload = {
    id,
    tier: normTier,
    sub,
    iat,
    exp,
    maxCleanQuota: finalQuota
  };

  const pk = privateKeyPkcs8Base64 || loadPrivateKey();
  const licenseKey = await signLicenseKey(payload, pk);

  return { licenseKey, payload };
}

/**
 * Resolves product tier from custom data, product/variant names, and catalog price
 * Protected against discount coupons and zero-dollar orders.
 */
function resolveOrderTier({ customData = {}, attributes = {} } = {}) {
  // 1. Explicit custom checkout parameter
  if (customData.tier) {
    const raw = String(customData.tier).trim().toUpperCase();
    if (raw.includes("WASH")) return "SINGLE_WASH";
    if (raw.includes("LTD") || raw.includes("PRO")) return "LTD";
    return raw;
  }

  // 2. Check product name & variant name keywords
  const firstItem = attributes.first_order_item || {};
  const productName = (firstItem.product_name || "").toLowerCase();
  const variantName = (firstItem.variant_name || "").toLowerCase();

  // Explicit LTD / Lifetime matches
  if (
    productName.includes("lifetime") ||
    productName.includes("ltd") ||
    productName.includes("终身") ||
    productName.includes("买断") ||
    variantName.includes("lifetime") ||
    variantName.includes("ltd")
  ) {
    return "LTD";
  }

  // Explicit Single Wash matches
  if (
    productName.includes("wash") ||
    productName.includes("single") ||
    productName.includes("30天") ||
    productName.includes("单次") ||
    variantName.includes("wash") ||
    variantName.includes("single")
  ) {
    return "SINGLE_WASH";
  }

  // 3. Check item catalog unit price (before discounts)
  const itemPrice = typeof firstItem.price === "number" ? firstItem.price : null;
  if (itemPrice !== null) {
    return itemPrice <= 1500 ? "SINGLE_WASH" : "LTD";
  }

  // 4. Fallback to order total if no other indicator
  const total = typeof attributes.total === "number" ? attributes.total : 2490;
  return total < 2000 ? "SINGLE_WASH" : "LTD";
}

/**
 * Verifies Lemon Squeezy HMAC-SHA256 webhook signature with timing-safe comparison
 *
 * @param {string|Buffer} rawBody
 * @param {string} signatureHex
 * @param {string} webhookSecret
 * @returns {boolean}
 */
function verifyLemonSqueezySignature(rawBody, signatureHex, webhookSecret) {
  if (!rawBody || !signatureHex || !webhookSecret) return false;
  try {
    const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
    const hmac = crypto.createHmac("sha256", webhookSecret).update(rawBuffer).digest("hex");
    const cleanSig = String(signatureHex).trim().toLowerCase();
    const hmacBuf = Buffer.from(hmac, "utf8");
    const sigBuf = Buffer.from(cleanSig, "utf8");
    if (hmacBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(hmacBuf, sigBuf);
  } catch {
    return false;
  }
}

/**
 * Processes incoming Lemon Squeezy order webhook and generates license key
 *
 * @param {object} params
 * @param {string|Buffer} params.rawBody
 * @param {string} params.signatureHex
 * @param {string} params.webhookSecret
 * @param {string} [params.privateKeyPkcs8Base64]
 * @returns {Promise<{ licenseKey?: string, payload?: object, orderId: string, event: string, userEmail: string, tier?: string, fulfilled?: boolean, refunded?: boolean, action?: string }>}
 */
async function handleLemonSqueezyOrderWebhook({
  rawBody,
  signatureHex,
  webhookSecret,
  privateKeyPkcs8Base64 = null
}) {
  if (!verifyLemonSqueezySignature(rawBody, signatureHex, webhookSecret)) {
    throw new Error("Lemon Squeezy signature verification failed");
  }

  const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const data = JSON.parse(bodyStr);

  const eventName = data.meta?.event_name || "order_created";
  const customData = data.meta?.custom_data || {};
  const attributes = data.data?.attributes || {};
  const userEmail = customData.email || attributes.user_email || attributes.customer_email || "customer@example.com";
  const orderId = String(data.data?.id || `ord_${Date.now()}`);
  const orderNumber = attributes.order_number ? String(attributes.order_number) : null;
  const status = (attributes.status || "").toLowerCase();
  const isRefunded = attributes.refunded === true || status === "refunded";

  // Handle order_refunded event or refunded status
  if (eventName === "order_refunded" || isRefunded) {
    return {
      orderId,
      orderNumber,
      event: eventName,
      userEmail,
      refunded: true,
      action: "REVOKE"
    };
  }

  // Security gate: If status is explicitly present and not "paid", do not fulfill
  if (status && status !== "paid") {
    return {
      orderId,
      orderNumber,
      event: eventName,
      userEmail,
      status,
      fulfilled: false,
      reason: `Order status '${status}' is not paid`
    };
  }

  // Tier detection logic with coupon protection
  const tier = resolveOrderTier({ customData, attributes });

  const { licenseKey, payload } = await issueCommercialLicense({
    tier,
    sub: userEmail,
    privateKeyPkcs8Base64
  });

  return {
    licenseKey,
    payload,
    orderId,
    orderNumber,
    event: eventName,
    userEmail,
    tier,
    fulfilled: true
  };
}

// ============================================================================
// CLI Handler
// ============================================================================
async function runCli() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
BHM-PRO Ed25519 Commercial License Generator

Usage:
  node scripts/keygen-license.js [options]

Options:
  --tier <LTD|SINGLE_WASH>        License tier (default: LTD)
  --sub <email_or_user_id>         Customer identifier (default: customer@example.com)
  --days <number>                  Validity period in days (default: 36500 for LTD, 30 for SINGLE_WASH)
  --quota <number>                 Maximum bookmark quota (default: 9999999 for LTD, 500 for SINGLE_WASH)
  --verify <licenseKey>            Verify an existing license key against official public key
  --simulate-webhook <LTD|SINGLE_WASH|REFUND>  Simulate Lemon Squeezy webhook payload & HMAC check
  --key-file <path>                Path to Ed25519 private key JSON file
  --help, -h                       Show this help message
`);
    process.exit(0);
  }

  // Webhook simulation mode
  const simIdx = args.indexOf("--simulate-webhook");
  if (simIdx !== -1) {
    const simType = (args[simIdx + 1] || "LTD").toUpperCase();
    const testSecret = "ls_whsec_sim_test_secret_123";
    const simEmail = "simulated-buyer@example.com";
    const simOrderId = `ord_sim_${Date.now()}`;

    let simEventName = "order_created";
    let simTier = "LTD";
    let simPrice = 2490;
    let simProductName = "BHM-PRO Lifetime Buyout";

    if (simType === "SINGLE_WASH" || simType === "WASH") {
      simTier = "SINGLE_WASH";
      simPrice = 990;
      simProductName = "BHM-PRO 30-Day Single Wash Pass";
    } else if (simType === "REFUND") {
      simEventName = "order_refunded";
    }

    const payloadObj = {
      meta: {
        event_name: simEventName,
        custom_data: { tier: simTier, email: simEmail }
      },
      data: {
        id: simOrderId,
        type: "orders",
        attributes: {
          user_email: simEmail,
          total: simPrice,
          first_order_item: { product_name: simProductName, price: simPrice }
        }
      }
    };

    const rawBody = JSON.stringify(payloadObj);
    const signatureHex = crypto.createHmac("sha256", testSecret).update(rawBody).digest("hex");

    console.log(`\n===============================================================`);
    console.log(`⚡ Simulating Lemon Squeezy Webhook: ${simEventName} (${simTier})`);
    console.log(`===============================================================`);
    console.log(`Order ID:     ${simOrderId}`);
    console.log(`Buyer:        ${simEmail}`);
    console.log(`HMAC Sig:     ${signatureHex.slice(0, 32)}...`);

    const result = await handleLemonSqueezyOrderWebhook({
      rawBody,
      signatureHex,
      webhookSecret: testSecret
    });

    console.log("\nWebhook Handler Output:");
    console.log(JSON.stringify(result, null, 2));

    if (result.licenseKey) {
      const verify = await LicenseManager.verifyLicense(result.licenseKey);
      console.log(`\nVerification Check: ${verify.valid ? "VALID ✅" : "INVALID ❌"}`);
    }
    console.log(`===============================================================\n`);
    process.exit(0);
  }

  // Verify mode
  const verifyIdx = args.indexOf("--verify");
  if (verifyIdx !== -1) {
    const keyToVerify = args[verifyIdx + 1];
    if (!keyToVerify) {
      console.error("❌ Error: Missing license key argument after --verify");
      process.exit(1);
    }
    console.log(`\n🔍 Verifying License Key: ${keyToVerify}\n`);
    const result = await LicenseManager.verifyLicense(keyToVerify);
    console.log("Verification Result:", JSON.stringify(result, null, 2));
    if (result.valid) {
      console.log("\n✅ Verification PASSED: Valid authentic license signature!\n");
      process.exit(0);
    } else {
      console.error(`\n❌ Verification FAILED: ${result.error || result.reason}\n`);
      process.exit(1);
    }
  }

  // Parse issuance options
  let tier = "LTD";
  let sub = "customer@example.com";
  let days = undefined;
  let quota = undefined;
  let customKeyPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tier" && args[i + 1]) {
      tier = args[i + 1].toUpperCase();
      i++;
    } else if (args[i] === "--sub" && args[i + 1]) {
      sub = args[i + 1];
      i++;
    } else if (args[i] === "--days" && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--quota" && args[i + 1]) {
      quota = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--key-file" && args[i + 1]) {
      customKeyPath = args[i + 1];
      i++;
    }
  }

  const privateKeyPkcs8 = loadPrivateKey(customKeyPath);
  const { licenseKey, payload } = await issueCommercialLicense({
    tier,
    sub,
    validDays: days,
    maxCleanQuota: quota,
    privateKeyPkcs8Base64: privateKeyPkcs8
  });

  // End-to-end self-check verification
  const verification = await LicenseManager.verifyLicense(licenseKey);

  console.log("\n===============================================================");
  console.log("🔑 BHM-PRO Commercial License Key Issued");
  console.log("===============================================================");
  console.log(`Tier:         ${payload.tier} (${verification.tierEnName || verification.tierName})`);
  console.log(`Subscriber:   ${payload.sub}`);
  console.log(`Expires:      ${new Date(payload.exp * 1000).toISOString()} (${Math.round((payload.exp - payload.iat) / 86400)} days)`);
  console.log(`Clean Quota:  ${payload.maxCleanQuota}`);
  console.log("---------------------------------------------------------------");
  console.log("License Key:");
  console.log(licenseKey);
  console.log("---------------------------------------------------------------");
  console.log("Payload Details:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("---------------------------------------------------------------");
  if (verification.valid) {
    console.log("Self-Check:   VALID (Ed25519 Signature Verified by LicenseManager)");
  } else {
    console.error(`Self-Check:   FAILED (${verification.error})`);
    process.exit(1);
  }
  console.log("===============================================================\n");
}

module.exports = {
  loadPrivateKey,
  signLicenseKey,
  issueCommercialLicense,
  verifyLemonSqueezySignature,
  handleLemonSqueezyOrderWebhook,
  resolveOrderTier
};

if (require.main === module) {
  runCli().catch((err) => {
    console.error("❌ Fatal CLI Error:", err);
    process.exit(1);
  });
}
