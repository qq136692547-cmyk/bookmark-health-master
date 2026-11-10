/**
 * Cloudflare Worker for Paddle Billing Webhook & Automated Ed25519 Issuance
 * Includes Root Landing Page with CWS Store Links, Terms of Service, Privacy Policy, and Refund Policy for Paddle Domain Approval.
 */

const KEY_ID = "bhm-prod-ed25519-2026-v1";
const CWS_STORE_URL = "https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn";

// Professional HTML for Paddle Reviewers and End-Users
const LANDING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bookmark Health Master (BHM-PRO) - Official Licensing & Support Portal</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --emerald: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid var(--border);
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.2);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.4);
      margin-bottom: 16px;
    }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; }
    p.lead { font-size: 17px; color: var(--text-muted); }
    .store-btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 28px;
      border-radius: 10px;
      background: var(--primary);
      color: #fff;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.2s;
    }
    .store-btn:hover { background: var(--primary-hover); }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    h2 { font-size: 20px; font-weight: 700; margin-bottom: 14px; color: #38bdf8; }
    p, li { color: #cbd5e1; font-size: 15px; margin-bottom: 8px; }
    ul { padding-left: 20px; margin-bottom: 12px; }
    .policy-box {
      font-size: 14px;
      background: #020617;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-top: 10px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      color: var(--text-muted);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">● Live on Google Chrome Web Store</span>
      <h1>Bookmark Health Master (BHM-PRO)</h1>
      <p class="lead">Official Licensing, Support & Payment Verification Portal for Chrome Extension (ID: nomieaphhhhhikklfhmhhjcdgicaikgn)</p>
      <a href="${CWS_STORE_URL}" target="_blank" class="store-btn">View on Chrome Web Store →</a>
    </div>

    <div class="card">
      <h2>1. Product Overview & Pricing</h2>
      <p>Bookmark Health Master is a privacy-first Chrome browser extension built to audit broken 404 bookmark links, reorganize platform ecosystems, and provide zero-loss atomic undo snapshots.</p>
      <ul>
        <li><strong>BHM-PRO 30-Day Single Wash Pass ($9.90 USD):</strong> 30-day access, batch quarantine up to 500 dead links with atomic undo protection.</li>
        <li><strong>BHM-PRO Lifetime Buyout ($24.90 USD):</strong> Perpetual lifetime license for unlimited dead link cleanups and 16 tech ecosystems reorganization.</li>
      </ul>
    </div>

    <div class="card">
      <h2>2. Terms of Service (ToS)</h2>
      <div class="policy-box">
        <p>• <strong>License Grant:</strong> Upon purchase, you are granted a non-exclusive, non-transferable cryptographic license key generated via Ed25519 digital signature to activate Pro features on your local Chrome browsers.</p>
        <p>• <strong>Local-First:</strong> All bookmark scanning, classification, and reorganization happen 100% locally on your machine. No bookmark URLs or browsing data are ever sent to our servers.</p>
      </div>
    </div>

    <div class="card">
      <h2>3. Refund Policy (14-Day Money-Back Guarantee)</h2>
      <div class="policy-box">
        <p>We stand behind our software. We offer a <strong>14-day 100% money-back guarantee</strong> for any customer unsatisfied with their purchase or experiencing technical issues. To request a refund, simply email our support team at <strong>qq136692547@gmail.com</strong> with your order ID, and your refund will be processed immediately through Paddle.</p>
      </div>
    </div>

    <div class="card">
      <h2>4. Privacy Policy & Customer Support</h2>
      <div class="policy-box">
        <p>• <strong>Zero Telemetry:</strong> We do not track, collect, or sell your personal data. Payments are securely processed by Paddle as the Merchant of Record under PCI-DSS compliance.</p>
        <p>• <strong>Support Email:</strong> qq136692547@gmail.com (Responses typically within 24 hours).</p>
      </div>
    </div>

    <div class="footer">
      <p>© 2026 L.D. Studio • Bookmark Health Master (BHM-PRO). All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

// Helper: base64url encode
function base64UrlEncode(strOrBuf) {
  const buf = typeof strOrBuf === "string" ? new TextEncoder().encode(strOrBuf) : strOrBuf;
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Convert base64 to Uint8Array
function base64ToUint8(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// Verify Paddle Billing Signature (ts=...;h1=...) with 300s window & constant-time compare (WRK-01, WRK-02)
async function verifyPaddleSignature(rawBody, signatureHeader, secretKey) {
  if (!signatureHeader || !secretKey) return false;

  const delimiter = signatureHeader.includes(";") ? ";" : ",";
  const parts = signatureHeader.split(delimiter).reduce((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const tsStr = parts["ts"];
  const h1 = parts["h1"];
  if (!tsStr || !h1) return false;

  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;

  // WRK-01: Verify 300-second (5 minute) timestamp tolerance window
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    console.warn(`[Paddle Security] Signature timestamp expired: ts=${ts}, now=${now}`);
    return false;
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey.trim()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signedPayload = enc.encode(`${tsStr}:${rawBody}`);
  const signatureBytes = await crypto.subtle.sign("HMAC", key, signedPayload);
  const expectedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const cleanSig = h1.toLowerCase().trim();
  const cleanExp = expectedHash.toLowerCase().trim();
  if (cleanSig.length !== cleanExp.length) return false;

  // WRK-02: Constant-time comparison against timing side-channel attacks
  let mismatch = 0;
  for (let i = 0; i < cleanExp.length; i++) {
    mismatch |= cleanExp.charCodeAt(i) ^ cleanSig.charCodeAt(i);
  }
  return mismatch === 0;
}

// Import Ed25519 Private Key in Worker
async function getEd25519PrivateKey(pkcs8Base64) {
  const binaryDer = base64ToUint8(pkcs8Base64);
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "Ed25519" },
    false,
    ["sign"]
  );
}

// Mint License Key in Worker (WRK-04, WRK-05, WRK-06: sub, exp, quota contract)
async function mintLicense(privateKey, { orderId, email, tier, durationDays = 30 }) {
  const iat = Math.floor(Date.now() / 1000);
  const cleanEmail = String(email).trim().toLowerCase();

  const payload = {
    v: 1,
    id: `lic_pdl_${orderId}`,
    orderId: String(orderId),
    sub: cleanEmail,    // WRK-04: Standard sub field for client offline verification
    email: cleanEmail,  // Backwards compatibility
    tier,
    iat,
    kid: KEY_ID
  };

  if (tier === "SINGLE_WASH") {
    payload.exp = iat + durationDays * 86400;
    payload.maxCleanQuota = 500;
  } else if (tier === "LTD" || tier === "PRO") {
    // WRK-05 & WRK-06: 100-year perpetual timestamp & 9999999 quota (no -1 locking clients)
    payload.exp = iat + 36500 * 86400;
    payload.maxCleanQuota = 9999999;
  }

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  // Sign canonical format: "BHM1." + payloadB64
  const sigBuffer = await crypto.subtle.sign("Ed25519", privateKey, new TextEncoder().encode(`BHM1.${payloadB64}`));
  const sigB64 = base64UrlEncode(new Uint8Array(sigBuffer));

  return { licenseKey: `BHM1.${payloadB64}.${sigB64}`, payload };
}

// Resolve tier (ENV-04: Accurate price_id matching & unit clarity)
function resolveTier(data) {
  const customTier = data.custom_data?.tier;
  if (customTier === "LTD" || customTier === "PRO") return "LTD";
  if (customTier === "SINGLE_WASH") return "SINGLE_WASH";

  const items = data.items || [];
  for (const item of items) {
    const priceId = item.price?.id || item.price_id;
    if (priceId === "pri_01m708eevn06vvarffpabpyprd") return "LTD";
    if (priceId === "pri_01m708ecngjxf937bz9zcs9m6f") return "SINGLE_WASH";

    const name = (item.price?.description || item.price?.name || item.product?.name || "").toLowerCase();
    if (name.includes("lifetime") || name.includes("ltd") || name.includes("buyout") || name.includes("终身")) {
      return "LTD";
    }
    if (name.includes("single") || name.includes("wash") || name.includes("30-day") || name.includes("单次")) {
      return "SINGLE_WASH";
    }
  }

  // Fallback by total cents (Paddle details.totals.total is in cents: $24.90 -> 2490, $9.90 -> 990)
  const totalCents = Number(data.details?.totals?.total || data.details?.totals?.grand_total || 0);
  if (totalCents >= 2000) return "LTD";
  return "SINGLE_WASH";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Paddle-Signature, X-Signature",
  "Access-Control-Max-Age": "86400"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight requests (WRK-12: allow Paddle-Signature)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Root / Checkout / Landing Page (Display terms, refund policy, and CWS link for Paddle approval)
    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/" || url.pathname === "/checkout" || url.pathname === "/terms")) {
      return new Response(LANDING_PAGE_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders }
      });
    }

    // Health check
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "healthy", engine: "paddle-ed25519" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // WRK-09: Online license revocation verification endpoint
    if (request.method === "POST" && url.pathname === "/v1/licenses/verify") {
      try {
        const body = await request.json();
        const key = body.licenseKey;
        if (!key) {
          return new Response(JSON.stringify({ valid: false, error: "Missing licenseKey" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        if (env.BHM_LICENSES_KV) {
          const keyRecordStr = await env.BHM_LICENSES_KV.get(`key:${key}`);
          if (keyRecordStr) {
            const keyRecord = JSON.parse(keyRecordStr);
            if (keyRecord && keyRecord.status === "revoked") {
              return new Response(JSON.stringify({ valid: false, revoked: true, reason: "Order refunded or revoked" }), {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders }
              });
            }
          }
        }
        return new Response(JSON.stringify({ valid: true, revoked: false }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ valid: false, error: e.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // Customer self-service lookup (WRK-08: Check revoked orders)
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/license") {
      const orderId = (url.searchParams.get("order_id") || "").replace(/^#/, "").trim();
      const email = (url.searchParams.get("email") || "").trim().toLowerCase();
      if (!orderId || !email) {
        return new Response(JSON.stringify({ error: "Missing order_id or email" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (env.BHM_LICENSES_KV) {
        // WRK-08: Intercept refunded / revoked orders
        const isRevoked = await env.BHM_LICENSES_KV.get(`revoked:order:${orderId}`);
        if (isRevoked) {
          return new Response(JSON.stringify({ error: "Order has been refunded and license is revoked", revoked: true }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const recordStr = await env.BHM_LICENSES_KV.get(`order:${orderId}`);
        if (recordStr) {
          const rec = JSON.parse(recordStr);
          if (rec.status === "revoked") {
            return new Response(JSON.stringify({ error: "Order has been refunded and license is revoked", revoked: true }), {
              status: 403,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          if (rec.email === email) {
            return new Response(JSON.stringify({ success: true, licenseKey: rec.licenseKey, tier: rec.tier }), {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
        }
      }
      return new Response(JSON.stringify({ error: "Order not found or email mismatch" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Webhook receiver
    if (request.method === "POST" && (url.pathname === "/webhook" || url.pathname === "/")) {
      const signature = request.headers.get("Paddle-Signature");
      const rawBody = await request.text();
      const secret = env.PADDLE_WEBHOOK_SECRET;

      const isValid = await verifyPaddleSignature(rawBody, signature, secret);
      if (!isValid) {
        // WRK-11: Content-Type application/json
        return new Response(JSON.stringify({ error: "Invalid Paddle signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      let event;
      try {
        event = JSON.parse(rawBody);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const eventType = event.event_type;
      const eventId = event.event_id;
      const data = event.data || {};
      const orderId = data.id || `txn_${Date.now()}`;
      const status = (data.status || "").toLowerCase();

      // WRK-03: Event ID idempotency / deduplication (cache for 7 days)
      if (eventId && env.BHM_LICENSES_KV) {
        const processedEvent = await env.BHM_LICENSES_KV.get(`event:${eventId}`);
        if (processedEvent) {
          return new Response(JSON.stringify({ success: true, duplicated: true, eventId }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil(env.BHM_LICENSES_KV.put(`event:${eventId}`, "processed", { expirationTtl: 604800 }));
        } else {
          await env.BHM_LICENSES_KV.put(`event:${eventId}`, "processed", { expirationTtl: 604800 });
        }
      }

      // ENV-01: Support transaction.completed, transaction.paid, and transaction.updated (status === 'paid')
      const isPaidEvent = (
        eventType === "transaction.completed" ||
        eventType === "transaction.paid" ||
        (eventType === "transaction.updated" && status === "paid")
      );

      if (isPaidEvent) {
        const customerEmail = data.customer?.email || (data.details?.customer?.email) || data.custom_data?.email || "customer@example.com";
        const tier = resolveTier(data);

        // Check idempotency in KV
        if (env.BHM_LICENSES_KV) {
          const existing = await env.BHM_LICENSES_KV.get(`order:${orderId}`);
          if (existing) {
            const parsed = JSON.parse(existing);
            return new Response(JSON.stringify({ success: true, duplicated: true, licenseKey: parsed.licenseKey }), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
        }

        // Mint license using Ed25519
        const privateKey = await getEd25519PrivateKey(env.ED25519_PRIVATE_KEY_B64);
        const { licenseKey, payload } = await mintLicense(privateKey, {
          orderId,
          email: customerEmail,
          tier
        });

        // Store in KV: order record & key index
        if (env.BHM_LICENSES_KV) {
          const orderRecord = {
            orderId,
            email: customerEmail,
            tier,
            licenseKey,
            payload,
            status: "active",
            createdAt: new Date().toISOString()
          };
          await env.BHM_LICENSES_KV.put(`order:${orderId}`, JSON.stringify(orderRecord));
          await env.BHM_LICENSES_KV.put(`key:${licenseKey}`, JSON.stringify({
            orderId,
            email: customerEmail,
            tier,
            status: "active"
          }));
        }

        return new Response(JSON.stringify({ success: true, licenseKey, tier }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // WRK-08: Handle refund / adjustment with full revocation synchronization
      if (eventType === "adjustment.updated" || eventType === "adjustment.created") {
        if (env.BHM_LICENSES_KV && data.action === "refund") {
          const refundTxnId = data.transaction_id;
          if (refundTxnId) {
            await env.BHM_LICENSES_KV.put(`revoked:order:${refundTxnId}`, "true");
            const existingOrder = await env.BHM_LICENSES_KV.get(`order:${refundTxnId}`);
            if (existingOrder) {
              const parsed = JSON.parse(existingOrder);
              parsed.status = "revoked";
              parsed.refundedAt = new Date().toISOString();
              await env.BHM_LICENSES_KV.put(`order:${refundTxnId}`, JSON.stringify(parsed));
              if (parsed.licenseKey) {
                await env.BHM_LICENSES_KV.put(`key:${parsed.licenseKey}`, JSON.stringify({
                  orderId: refundTxnId,
                  status: "revoked"
                }));
              }
            }
          }
        }
        return new Response(JSON.stringify({ success: true, action: "refund_recorded" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ received: true, event_type: eventType }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};
