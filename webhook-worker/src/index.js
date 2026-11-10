/**
 * BHM-PRO Lemon Squeezy Automated Webhook Receiver & License Dispatch Worker
 * Cloudflare Worker Serverless Edge Implementation (Native Web Crypto Ed25519 & HMAC-SHA256)
 */

import { generateLicenseEmail } from "../../shared/email-template.js";

/**
 * Timing-safe HMAC-SHA256 verification using Web Crypto API
 */
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
    const calculatedHex = Array.from(new Uint8Array(calculatedSignature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const cleanSig = String(signatureHex).trim().toLowerCase();
    if (calculatedHex.length !== cleanSig.length) return false;

    // Timing-safe comparison
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
 * Base64 / Base64URL Helpers
 */
function base64ToUint8Array(base64) {
  const clean = base64.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function stringToBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  return arrayBufferToBase64Url(bytes);
}

/**
 * Signs an Ed25519 commercial license key
 */
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

/**
 * Dispatches transactional email via Resend API
 */
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight
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

    // Health Check Endpoint
    if (pathname === "/health" || pathname === "/healthz") {
      return new Response(JSON.stringify({
        status: "ok",
        service: "bhm-pro-lemon-squeezy-webhook",
        environment: env.ENVIRONMENT || "production",
        version: "2.1.0",
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // License Lookup Self-Service Endpoint: GET /license?order_id=...&email=...
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
        // Try aliased store order number
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

    // License Online Revocation Probe: POST /v1/licenses/verify
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

    // Lemon Squeezy Webhook Handler: POST /webhook (or POST /)
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

      // Step 1: Verify HMAC-SHA256 signature
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

      // Handle Event: order_refunded or refund status
      if (eventName === "order_refunded" || isRefunded) {
        if (env.BHM_LICENSE_KV) {
          const existingOrder = await env.BHM_LICENSE_KV.get(`order:${orderId}`, "json");
          if (existingOrder) {
            existingOrder.status = "revoked";
            existingOrder.refundedAt = new Date().toISOString();
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

      // Handle Event: order_created or order_updated (Automated License Generation & Dispatch)
      if (eventName === "order_created" || eventName === "order_updated") {
        // Security gate: If status is explicitly present and not "paid", do not fulfill
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

        // Step 2: Idempotency check against KV
        if (env.BHM_LICENSE_KV) {
          const cached = await env.BHM_LICENSE_KV.get(`order:${orderId}`, "json");
          if (cached && cached.licenseKey) {
            // Retry email dispatch if prior attempt failed
            if (cached.emailDispatched !== true && env.RESEND_API_KEY) {
              const emailContent = generateLicenseEmail({
                tier: cached.tier,
                licenseKey: cached.licenseKey,
                userEmail: cached.userEmail,
                orderId: cached.orderId
              });
              const retryResult = await sendEmailViaResend({
                apiKey: env.RESEND_API_KEY,
                fromEmail: env.FROM_EMAIL,
                to: cached.userEmail,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text
              });
              if (retryResult.sent) {
                cached.emailDispatched = true;
                cached.emailDispatchedAt = new Date().toISOString();
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

        // Tier classification with coupon protection
        const tier = resolveOrderTier({ customData, attributes });

        // Generate Ed25519 License Key
        const privateKeyPkcs8 = env.BHM_ED25519_PRIVATE_KEY_PKCS8;
        if (!privateKeyPkcs8) {
          console.error("BHM_ED25519_PRIVATE_KEY_PKCS8 private key is not configured in Worker");
          return new Response(JSON.stringify({ error: "Private key unconfigured on server" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }

        const iat = Math.floor(Date.now() / 1000);
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

        // Dispatch Transactional Email via Resend
        const emailContent = generateLicenseEmail({
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

        // Record in KV
        const orderRecord = {
          orderId,
          orderNumber,
          tier,
          userEmail,
          licenseKey,
          payload: licensePayload,
          status: "active",
          emailDispatched: Boolean(emailResult.sent),
          createdAt: new Date().toISOString()
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

      // Other events acknowledged with 200 OK
      return new Response(JSON.stringify({
        success: true,
        acknowledgedEvent: eventName
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Default 404
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
