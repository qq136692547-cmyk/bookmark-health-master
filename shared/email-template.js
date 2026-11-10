/**
 * BHM-PRO Transactional Email Template Generator (Isomorphic: Node.js & Cloudflare Worker)
 * Generates bilingual (EN & ZH) responsive HTML & plain-text fulfillment emails
 * for Lemon Squeezy automated license issuance.
 */

const EXTENSION_ID = "nomieaphhhhhikklfhmhhjcdgicaikgn";
const CWS_STORE_URL = `https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn`;
const SUPPORT_EMAIL = "support@bhm-pro.com";

/**
 * @param {object} params
 * @param {string} params.tier - "LTD" | "SINGLE_WASH" | "PRO"
 * @param {string} params.licenseKey - Full Ed25519 license key (BHM1....)
 * @param {string} params.userEmail - Buyer email
 * @param {string} params.orderId - Lemon Squeezy Order ID
 * @param {"en"|"zh"|"auto"} [params.lang="auto"]
 * @returns {{ subject: string, html: string, text: string }}
 */
function generateLicenseEmail({
  tier = "LTD",
  licenseKey,
  userEmail = "customer@example.com",
  orderId = "N/A",
  lang = "auto"
}) {
  const normTier = (tier || "LTD").toUpperCase();
  const isSingleWash = normTier === "SINGLE_WASH";

  const tierNameEn = isSingleWash ? "30-Day Single Wash Pass ($9.90)" : "Pro Lifetime Buyout ($24.90)";
  const tierNameZh = isSingleWash ? "30天全量大扫除卡 ($9.90)" : "Pro 终身买断授权 ($24.90)";
  const quotaDescEn = isSingleWash ? "500 bookmarks / 30 days validity" : "Unlimited bookmarks / Lifetime perpetual";
  const quotaDescZh = isSingleWash ? "500 条书签全量清理额度 / 30 天有效期" : "无限书签清理额度 / 终身永久有效";

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
      <h1>🔖 Bookmark Health Master</h1>
      <div class="badge-cws">Official Chrome Web Store Extension</div>
    </div>
    <div class="content">
      <h2 class="hero-title">Thank you for your purchase! / 感谢您的购买！</h2>
      <p style="font-size: 13px; color: #cbd5e1; margin-top: 0;">
        Your order <strong>#${orderId}</strong> has been confirmed. Below is your official Ed25519 cryptographic license key to unlock your Pro capabilities.
      </p>

      <div class="key-card">
        <div class="key-label">Your License Key / 您的激活码</div>
        <div class="key-value">${licenseKey}</div>
        <div class="key-hint">Click or double-click to select all and copy (点击或双击全选复制)</div>
      </div>

      <div class="order-info">
        <div class="order-row">
          <span class="order-label">Product Plan / 授权方案:</span>
          <span class="order-val">${tierNameEn} (${tierNameZh})</span>
        </div>
        <div class="order-row">
          <span class="order-label">Quota & Duration / 额度与时效:</span>
          <span class="order-val">${quotaDescEn}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Customer / 购买邮箱:</span>
          <span class="order-val">${userEmail}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Order ID / 订单号:</span>
          <span class="order-val">#${orderId}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Merchant of Record:</span>
          <span class="order-val">Lemon Squeezy (PCI-DSS L1)</span>
        </div>
      </div>

      <div class="steps">
        <h3 style="font-size: 15px; color: #f8fafc; margin-bottom: 16px;">Quick 3-Step Activation Guide / 3步快速激活教程:</h3>
        
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-body">
            <h4>Install or Open Extension / 安装或打开插件</h4>
            <p>Ensure BHM-PRO is installed from Chrome Web Store (CWS ID: <code>${EXTENSION_ID}</code>).</p>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-body">
            <h4>Open Dashboard & Click Upgrade / 打开仪表盘点击升级</h4>
            <p>Click the extension icon in Chrome toolbar &rarr; open Dashboard &rarr; click "Upgrade / Activate Pro" in the top bar.</p>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-body">
            <h4>Paste Key & Activate / 粘贴密钥即刻激活</h4>
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    generateLicenseEmail,
    EXTENSION_ID,
    CWS_STORE_URL,
    SUPPORT_EMAIL
  };
}
