var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../shared/email-template.js
var require_email_template = __commonJS({
  "../shared/email-template.js"(exports, module) {
    var EXTENSION_ID = "nomieaphhhhhikklfhmhhjcdgicaikgn";
    var CWS_STORE_URL = `https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn`;
    var SUPPORT_EMAIL = "support@bhm-pro.com";
    function generateLicenseEmail2({
      tier = "LTD",
      licenseKey,
      userEmail = "customer@example.com",
      orderId = "N/A",
      lang = "auto"
    }) {
      const normTier = (tier || "LTD").toUpperCase();
      const isSingleWash = normTier === "SINGLE_WASH";
      const tierNameEn = isSingleWash ? "30-Day Single Wash Pass ($9.90)" : "Pro Lifetime Buyout ($24.90)";
      const tierNameZh = isSingleWash ? "30\u5929\u5168\u91CF\u5927\u626B\u9664\u5361 ($9.90)" : "Pro \u7EC8\u8EAB\u4E70\u65AD\u6388\u6743 ($24.90)";
      const quotaDescEn = isSingleWash ? "500 bookmarks / 30 days validity" : "Unlimited bookmarks / Lifetime perpetual";
      const quotaDescZh = isSingleWash ? "500 \u6761\u4E66\u7B7E\u5168\u91CF\u6E05\u7406\u989D\u5EA6 / 30 \u5929\u6709\u6548\u671F" : "\u65E0\u9650\u4E66\u7B7E\u6E05\u7406\u989D\u5EA6 / \u7EC8\u8EAB\u6C38\u4E45\u6709\u6548";
      const subject = `[BHM-PRO] Your License Key for Bookmark Health Master (Order #${orderId})`;
      const text = `
================================================================================
  BOOKMARK HEALTH MASTER (BHM-PRO) - OFFICIAL LICENSE DISPATCH
================================================================================

Dear Valued Customer (${userEmail}),

Thank you for purchasing Bookmark Health Master (BHM-PRO)!
Your order #${orderId} has been successfully processed via Lemon Squeezy (MoR).

--------------------------------------------------------------------------------
YOUR LICENSE KEY:
--------------------------------------------------------------------------------
${licenseKey}
--------------------------------------------------------------------------------

Order Summary:
- Tier:         ${tierNameEn} (${tierNameZh})
- Quotas:       ${quotaDescEn} (${quotaDescZh})
- Order ID:     ${orderId}
- Extension ID: ${EXTENSION_ID}

--------------------------------------------------------------------------------
3-STEP ACTIVATION GUIDE:
--------------------------------------------------------------------------------
1. Install / Open Extension:
   Visit Chrome Web Store: ${CWS_STORE_URL}
2. Open BHM-PRO Dashboard:
   Click the extension icon in Chrome -> Open Full Dashboard -> Click "Upgrade / Activate Pro"
3. Enter License Key:
   Paste your License Key above into the activation input and click "Activate".
   Your Pro features and quotas will be instantly unlocked offline!

--------------------------------------------------------------------------------
NEED HELP OR REFUND?
--------------------------------------------------------------------------------
Every purchase comes with our 14-day satisfaction guarantee.
If you have questions or need assistance, contact us at: ${SUPPORT_EMAIL}

Thank you for supporting independent developer tools!
The BHM-PRO Team
================================================================================
`.trim();
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 640px;
      margin: 24px auto;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f172a 100%);
      padding: 32px 28px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.025em;
    }
    .badge-cws {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      background: rgba(14, 165, 233, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      color: #38bdf8;
    }
    .content {
      padding: 32px 28px;
    }
    .hero-title {
      font-size: 18px;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 12px 0;
    }
    .key-card {
      background: #090d16;
      border: 2px solid #0284c7;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      text-align: center;
    }
    .key-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #38bdf8;
      margin-bottom: 8px;
    }
    .key-value {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      word-break: break-all;
      background: #1e293b;
      padding: 12px 14px;
      border-radius: 8px;
      color: #f1f5f9;
      border: 1px dashed #334155;
      user-select: all;
    }
    .key-hint {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 8px;
    }
    .order-info {
      background: #131d33;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .order-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 6px 0;
      border-bottom: 1px solid #1e293b;
    }
    .order-row:last-child {
      border-bottom: none;
    }
    .order-label {
      color: #94a3b8;
    }
    .order-val {
      font-weight: 600;
      color: #f8fafc;
    }
    .steps {
      margin: 28px 0;
    }
    .step-item {
      display: flex;
      margin-bottom: 16px;
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      margin-right: 14px;
      flex-shrink: 0;
    }
    .step-body h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #f1f5f9;
    }
    .step-body p {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
    }
    .btn-action {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      border-radius: 8px;
      text-align: center;
    }
    .footer {
      background: #090d16;
      padding: 20px 28px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid #1e293b;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>\u{1F516} Bookmark Health Master</h1>
      <div class="badge-cws">Official Chrome Web Store Extension</div>
    </div>
    <div class="content">
      <h2 class="hero-title">Thank you for your purchase! / \u611F\u8C22\u60A8\u7684\u8D2D\u4E70\uFF01</h2>
      <p style="font-size: 13px; color: #cbd5e1; margin-top: 0;">
        Your order <strong>#${orderId}</strong> has been confirmed. Below is your official Ed25519 cryptographic license key to unlock your Pro capabilities.
      </p>

      <div class="key-card">
        <div class="key-label">Your License Key / \u60A8\u7684\u6FC0\u6D3B\u7801</div>
        <div class="key-value">${licenseKey}</div>
        <div class="key-hint">Click or double-click to select all and copy (\u70B9\u51FB\u6216\u53CC\u51FB\u5168\u9009\u590D\u5236)</div>
      </div>

      <div class="order-info">
        <div class="order-row">
          <span class="order-label">Product Plan / \u6388\u6743\u65B9\u6848:</span>
          <span class="order-val">${tierNameEn} (${tierNameZh})</span>
        </div>
        <div class="order-row">
          <span class="order-label">Quota & Duration / \u989D\u5EA6\u4E0E\u65F6\u6548:</span>
          <span class="order-val">${quotaDescEn}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Customer / \u8D2D\u4E70\u90AE\u7BB1:</span>
          <span class="order-val">${userEmail}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Order ID / \u8BA2\u5355\u53F7:</span>
          <span class="order-val">#${orderId}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Merchant of Record:</span>
          <span class="order-val">Lemon Squeezy (PCI-DSS L1)</span>
        </div>
      </div>

      <div class="steps">
        <h3 style="font-size: 15px; color: #f8fafc; margin-bottom: 16px;">Quick 3-Step Activation Guide / 3\u6B65\u5FEB\u901F\u6FC0\u6D3B\u6559\u7A0B:</h3>
        
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-body">
            <h4>Install or Open Extension / \u5B89\u88C5\u6216\u6253\u5F00\u63D2\u4EF6</h4>
            <p>Ensure BHM-PRO is installed from Chrome Web Store (CWS ID: <code>${EXTENSION_ID}</code>).</p>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-body">
            <h4>Open Dashboard & Click Upgrade / \u6253\u5F00\u4EEA\u8868\u76D8\u70B9\u51FB\u5347\u7EA7</h4>
            <p>Click the extension icon in Chrome toolbar &rarr; open Dashboard &rarr; click "Upgrade / Activate Pro" in the top bar.</p>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-body">
            <h4>Paste Key & Activate / \u7C98\u8D34\u5BC6\u94A5\u5373\u523B\u6FC0\u6D3B</h4>
            <p>Paste the license key shown above and click "Activate". Your Pro status unlocks 100% offline with zero external network delays!</p>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="${CWS_STORE_URL}" class="btn-action" target="_blank" rel="noopener noreferrer">
          Open BHM-PRO in Chrome Web Store &rarr;
        </a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">
        Need assistance or a refund? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
      </p>
      <p style="margin: 0;">
        14-day money-back guarantee. Payments securely managed by Lemon Squeezy (MoR). &copy; 2026 BHM-PRO Team.
      </p>
    </div>
  </div>
</body>
</html>`;
      return { subject, html, text };
    }
    __name(generateLicenseEmail2, "generateLicenseEmail");
    if (typeof module !== "undefined" && module.exports) {
      module.exports = {
        generateLicenseEmail: generateLicenseEmail2,
        EXTENSION_ID,
        CWS_STORE_URL,
        SUPPORT_EMAIL
      };
    }
  }
});

// src/index.js
var import_email_template = __toESM(require_email_template(), 1);
async function verifyHmacSignature(rawBodyText, signatureHex, secret) {
  if (!rawBodyText || !signatureHex || !secret) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify", "sign"]
    );
    const calculatedSignature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBodyText));
    const calculatedHex = Array.from(new Uint8Array(calculatedSignature)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const cleanSig = String(signatureHex).trim().toLowerCase();
    if (calculatedHex.length !== cleanSig.length) return false;
    let mismatch = 0;
    for (let i = 0; i < calculatedHex.length; i++) {
      mismatch |= calculatedHex.charCodeAt(i) ^ cleanSig.charCodeAt(i);
    }
    return mismatch === 0;
  } catch (err) {
    console.error("HMAC verification error:", err);
    return false;
  }
}
__name(verifyHmacSignature, "verifyHmacSignature");
function resolveOrderTier({ customData = {}, attributes = {} } = {}) {
  if (customData.tier) {
    const raw = String(customData.tier).trim().toUpperCase();
    if (raw.includes("WASH")) return "SINGLE_WASH";
    if (raw.includes("LTD") || raw.includes("PRO")) return "LTD";
    return raw;
  }
  const firstItem = attributes.first_order_item || {};
  const productName = (firstItem.product_name || "").toLowerCase();
  const variantName = (firstItem.variant_name || "").toLowerCase();
  if (productName.includes("lifetime") || productName.includes("ltd") || productName.includes("\u7EC8\u8EAB") || productName.includes("\u4E70\u65AD") || variantName.includes("lifetime") || variantName.includes("ltd")) {
    return "LTD";
  }
  if (productName.includes("wash") || productName.includes("single") || productName.includes("30\u5929") || productName.includes("\u5355\u6B21") || variantName.includes("wash") || variantName.includes("single")) {
    return "SINGLE_WASH";
  }
  const itemPrice = typeof firstItem.price === "number" ? firstItem.price : null;
  if (itemPrice !== null) {
    return itemPrice <= 1500 ? "SINGLE_WASH" : "LTD";
  }
  const total = typeof attributes.total === "number" ? attributes.total : 2490;
  return total < 2e3 ? "SINGLE_WASH" : "LTD";
}
__name(resolveOrderTier, "resolveOrderTier");
function base64ToUint8Array(base64) {
  const clean = base64.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(base64ToUint8Array, "base64ToUint8Array");
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(arrayBufferToBase64Url, "arrayBufferToBase64Url");
function stringToBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  return arrayBufferToBase64Url(bytes);
}
__name(stringToBase64Url, "stringToBase64Url");
async function signEd25519License(payload, privateKeyPkcs8Base64) {
  const privKeyBytes = base64ToUint8Array(privateKeyPkcs8Base64);
  const privateCryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privKeyBytes,
    { name: "Ed25519" },
    false,
    ["sign"]
  );
  const payloadJson = JSON.stringify(payload);
  const payloadB64Url = stringToBase64Url(payloadJson);
  const headerAndPayload = "BHM1." + payloadB64Url;
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    privateCryptoKey,
    new TextEncoder().encode(headerAndPayload)
  );
  const sigB64Url = arrayBufferToBase64Url(signature);
  return headerAndPayload + "." + sigB64Url;
}
__name(signEd25519License, "signEd25519License");
async function sendEmailViaResend({ apiKey, fromEmail, to, subject, html, text }) {
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set; skipping automated email dispatch");
    return { sent: false, reason: "No API Key" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail || "BHM-PRO Licensing <licenses@bhm-pro.com>",
        to: [to],
        subject,
        html,
        text
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", response.status, errorText);
      return { sent: false, error: errorText };
    }
    const result = await response.json();
    return { sent: true, id: result.id };
  } catch (err) {
    console.error("Resend API network exception:", err);
    return { sent: false, error: err.message };
  }
}
__name(sendEmailViaResend, "sendEmailViaResend");
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Signature"
        }
      });
    }
    if (pathname === "/health" || pathname === "/healthz") {
      return new Response(JSON.stringify({
        status: "ok",
        service: "bhm-pro-lemon-squeezy-webhook",
        environment: env.ENVIRONMENT || "production",
        version: "2.1.0",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (request.method === "GET" && (pathname === "/license" || pathname === "/lookup")) {
      const rawOrderId = url.searchParams.get("order_id");
      const rawEmail = url.searchParams.get("email");
      if (!rawOrderId || !rawEmail) {
        return new Response(JSON.stringify({
          error: "Missing required query parameters: order_id and email"
        }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      if (!env.BHM_LICENSE_KV) {
        return new Response(JSON.stringify({ error: "Storage KV not bound" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      const cleanOrderId = rawOrderId.trim().replace(/^#/, "");
      const emailQuery = rawEmail.trim().toLowerCase();
      const emailQueryPlus = emailQuery.replace(/ /g, "+");
      let rawRecord = await env.BHM_LICENSE_KV.get(`order:${cleanOrderId}`, "json");
      if (!rawRecord) {
        const primaryId = await env.BHM_LICENSE_KV.get(`orderNum:${cleanOrderId}`, "text");
        if (primaryId) {
          rawRecord = await env.BHM_LICENSE_KV.get(`order:${primaryId}`, "json");
        }
      }
      const storedEmail = rawRecord ? (rawRecord.userEmail || "").trim().toLowerCase() : "";
      const emailMatches = rawRecord && (storedEmail === emailQuery || storedEmail === emailQueryPlus);
      if (!rawRecord || !emailMatches) {
        return new Response(JSON.stringify({ error: "Order not found or email does not match" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        orderId: rawRecord.orderId,
        orderNumber: rawRecord.orderNumber || null,
        tier: rawRecord.tier,
        status: rawRecord.status,
        licenseKey: rawRecord.licenseKey,
        createdAt: rawRecord.createdAt
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    if (request.method === "POST" && pathname === "/v1/licenses/verify") {
      try {
        const body = await request.json();
        const key = body.licenseKey;
        if (!key) {
          return new Response(JSON.stringify({ valid: false, error: "Missing licenseKey" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (env.BHM_LICENSE_KV) {
          const keyRecord = await env.BHM_LICENSE_KV.get(`key:${key}`, "json");
          if (keyRecord && keyRecord.status === "revoked") {
            return new Response(JSON.stringify({ valid: false, revoked: true, reason: "Order refunded or revoked" }), {
              headers: { "Content-Type": "application/json" }
            });
          }
        }
        return new Response(JSON.stringify({ valid: true, revoked: false }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ valid: false, error: e.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (request.method === "POST" && (pathname === "/webhook" || pathname === "/api/webhook" || pathname === "/")) {
      const signatureHex = request.headers.get("x-signature");
      const webhookSecret = env.LEMON_SQUEEZY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("LEMON_SQUEEZY_WEBHOOK_SECRET secret is not configured in Worker");
        return new Response(JSON.stringify({ error: "Webhook secret unconfigured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      const rawBody = await request.text();
      const isSignatureValid = await verifyHmacSignature(rawBody, signatureHex, webhookSecret);
      if (!isSignatureValid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      let payloadData;
      try {
        payloadData = JSON.parse(rawBody);
      } catch (err) {
        return new Response(JSON.stringify({ error: "Malformed JSON payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const eventName = payloadData.meta?.event_name || request.headers.get("x-event-name") || "order_created";
      const orderId = String(payloadData.data?.id || `ord_${Date.now()}`);
      const attributes = payloadData.data?.attributes || {};
      const orderNumber = attributes.order_number ? String(attributes.order_number) : null;
      const status = (attributes.status || "").toLowerCase();
      const isRefunded = attributes.refunded === true || status === "refunded";
      if (eventName === "order_refunded" || isRefunded) {
        if (env.BHM_LICENSE_KV) {
          const existingOrder = await env.BHM_LICENSE_KV.get(`order:${orderId}`, "json");
          if (existingOrder) {
            existingOrder.status = "revoked";
            existingOrder.refundedAt = (/* @__PURE__ */ new Date()).toISOString();
            await env.BHM_LICENSE_KV.put(`order:${orderId}`, JSON.stringify(existingOrder));
            if (existingOrder.licenseKey) {
              await env.BHM_LICENSE_KV.put(
                `key:${existingOrder.licenseKey}`,
                JSON.stringify({ orderId, status: "revoked" })
              );
            }
          }
        }
        return new Response(JSON.stringify({
          success: true,
          event: "order_refunded",
          orderId,
          orderNumber,
          revoked: true
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      if (eventName === "order_created" || eventName === "order_updated") {
        if (status && status !== "paid") {
          return new Response(JSON.stringify({
            success: true,
            event: eventName,
            orderId,
            orderNumber,
            status,
            fulfilled: false,
            message: `Order status '${status}' recorded; awaiting payment confirmation`
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        if (env.BHM_LICENSE_KV) {
          const cached = await env.BHM_LICENSE_KV.get(`order:${orderId}`, "json");
          if (cached && cached.licenseKey) {
            if (cached.emailDispatched !== true && env.RESEND_API_KEY) {
              const emailContent2 = (0, import_email_template.generateLicenseEmail)({
                tier: cached.tier,
                licenseKey: cached.licenseKey,
                userEmail: cached.userEmail,
                orderId: cached.orderId
              });
              const retryResult = await sendEmailViaResend({
                apiKey: env.RESEND_API_KEY,
                fromEmail: env.FROM_EMAIL,
                to: cached.userEmail,
                subject: emailContent2.subject,
                html: emailContent2.html,
                text: emailContent2.text
              });
              if (retryResult.sent) {
                cached.emailDispatched = true;
                cached.emailDispatchedAt = (/* @__PURE__ */ new Date()).toISOString();
                await env.BHM_LICENSE_KV.put(`order:${orderId}`, JSON.stringify(cached));
              }
            }
            return new Response(JSON.stringify({
              success: true,
              duplicated: true,
              orderId,
              orderNumber: cached.orderNumber || orderNumber,
              tier: cached.tier,
              userEmail: cached.userEmail,
              licenseKey: cached.licenseKey,
              emailDispatched: cached.emailDispatched
            }), {
              headers: { "Content-Type": "application/json" }
            });
          }
        }
        const customData = payloadData.meta?.custom_data || {};
        const userEmail = customData.email || attributes.user_email || attributes.customer_email || "customer@example.com";
        const tier = resolveOrderTier({ customData, attributes });
        const privateKeyPkcs8 = env.BHM_ED25519_PRIVATE_KEY_PKCS8;
        if (!privateKeyPkcs8) {
          console.error("BHM_ED25519_PRIVATE_KEY_PKCS8 private key is not configured in Worker");
          return new Response(JSON.stringify({ error: "Private key unconfigured on server" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
        const iat = Math.floor(Date.now() / 1e3);
        const validDays = tier === "SINGLE_WASH" ? 30 : 36500;
        const maxCleanQuota = tier === "SINGLE_WASH" ? 500 : 9999999;
        const exp = iat + validDays * 86400;
        const randId = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
        const licId = `lic_${tier.toLowerCase()}_${iat}_${randId}`;
        const licensePayload = {
          id: licId,
          tier,
          sub: userEmail,
          iat,
          exp,
          maxCleanQuota
        };
        const licenseKey = await signEd25519License(licensePayload, privateKeyPkcs8);
        const emailContent = (0, import_email_template.generateLicenseEmail)({
          tier,
          licenseKey,
          userEmail,
          orderId
        });
        let emailResult = { sent: false };
        if (env.RESEND_API_KEY) {
          emailResult = await sendEmailViaResend({
            apiKey: env.RESEND_API_KEY,
            fromEmail: env.FROM_EMAIL,
            to: userEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          });
        }
        const orderRecord = {
          orderId,
          orderNumber,
          tier,
          userEmail,
          licenseKey,
          payload: licensePayload,
          status: "active",
          emailDispatched: Boolean(emailResult.sent),
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (env.BHM_LICENSE_KV) {
          await env.BHM_LICENSE_KV.put(`order:${orderId}`, JSON.stringify(orderRecord));
          if (orderNumber) {
            await env.BHM_LICENSE_KV.put(`orderNum:${orderNumber}`, orderId);
          }
          await env.BHM_LICENSE_KV.put(`key:${licenseKey}`, JSON.stringify({
            orderId,
            orderNumber,
            tier,
            sub: userEmail,
            exp,
            status: "active"
          }));
        }
        return new Response(JSON.stringify({
          success: true,
          orderId,
          orderNumber,
          tier,
          userEmail,
          licenseKey,
          emailDispatched: orderRecord.emailDispatched,
          createdAt: orderRecord.createdAt
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        acknowledgedEvent: eventName
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      error: "Not Found",
      endpoints: {
        webhook: "POST /webhook",
        licenseLookup: "GET /license?order_id=<id>&email=<email>",
        health: "GET /health"
      }
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
