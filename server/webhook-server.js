/**
 * BHM-PRO Standalone Native Node.js Lemon Squeezy Webhook Server
 * Zero External Dependencies (Node.js native http, crypto, fs)
 *
 * Provides:
 * 1. HMAC-SHA256 verified Webhook receiver for Lemon Squeezy order_created & order_refunded
 * 2. Automated Ed25519 cryptographic license generation
 * 3. Idempotent ACID persistence via OrderStorage
 * 4. Automated transactional email delivery via EmailDispatcher
 * 5. Customer self-service license retrieval API (GET /license)
 * 6. Online license status & revocation verification (POST /v1/licenses/verify)
 */

const http = require("node:http");
const url = require("node:url");
const path = require("node:path");
const {
  loadPrivateKey,
  issueCommercialLicense,
  verifyLemonSqueezySignature,
  resolveOrderTier
} = require("../scripts/keygen-license.js");
const { LicenseManager } = require("../bookmark-organizer/core/license.js");
const { OrderStorage } = require("./storage.js");
const { EmailDispatcher } = require("./email-dispatcher.js");

function createServer(options = {}) {
  const webhookSecret = options.webhookSecret || process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "default_test_secret";
  const storage = options.storage || new OrderStorage(options.storagePath);
  const emailDispatcher = options.emailDispatcher || new EmailDispatcher({
    resendApiKey: options.resendApiKey || process.env.RESEND_API_KEY,
    isDryRun: options.isDryRun || (!options.resendApiKey && !process.env.RESEND_API_KEY)
  });
  const privateKeyPkcs8 = options.privateKeyPkcs8 || loadPrivateKey(options.customKeyPath);

  const server = http.createServer(async (req, res) => {
    const host = req.headers.host || "127.0.0.1";
    const reqUrl = new URL(req.url, `http://${host}`);
    const pathname = reqUrl.pathname;
    const method = req.method.toUpperCase();

    // CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Signature, X-Event-Name");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const sendJson = (statusCode, data) => {
      res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(data, null, 2));
    };

    // Healthcheck: GET /health
    if (method === "GET" && (pathname === "/health" || pathname === "/healthz")) {
      sendJson(200, {
        status: "ok",
        service: "bhm-pro-lemon-squeezy-server",
        version: "2.1.0",
        timestamp: new Date().toISOString()
      });
      return;
    }

    // License Lookup Self-Service: GET /license?order_id=...&email=...
    if (method === "GET" && (pathname === "/license" || pathname === "/lookup")) {
      const rawOrderId = reqUrl.searchParams.get("order_id");
      const rawEmail = reqUrl.searchParams.get("email");

      if (!rawOrderId || !rawEmail) {
        sendJson(400, { error: "Missing required query parameters: order_id and email" });
        return;
      }

      const orderId = rawOrderId.trim();
      const emailQuery = rawEmail.trim().toLowerCase();
      // Handle '+' in query parameter which might be decoded as a space
      const emailQueryPlus = emailQuery.replace(/ /g, "+");

      const record = storage.getOrder(orderId);
      const storedEmail = record ? (record.userEmail || "").trim().toLowerCase() : "";
      const emailMatches = record && (storedEmail === emailQuery || storedEmail === emailQueryPlus);

      if (!record || !emailMatches) {
        sendJson(404, { error: "Order not found or email does not match" });
        return;
      }

      sendJson(200, {
        orderId: record.orderId,
        orderNumber: record.orderNumber || null,
        tier: record.tier,
        status: record.status || "active",
        licenseKey: record.licenseKey,
        createdAt: record.createdAt
      });
      return;
    }

    // Online License Revocation Probe: POST /v1/licenses/verify
    if (method === "POST" && pathname === "/v1/licenses/verify") {
      let bodyStr = "";
      req.on("data", (chunk) => { bodyStr += chunk; });
      req.on("end", async () => {
        try {
          const body = JSON.parse(bodyStr || "{}");
          const key = body.licenseKey;
          if (!key) {
            sendJson(400, { valid: false, error: "Missing licenseKey" });
            return;
          }

          // 1. Offline cryptographic verification
          const offlineCheck = await LicenseManager.verifyLicense(key);
          if (!offlineCheck.valid) {
            sendJson(200, { valid: false, reason: offlineCheck.reason || offlineCheck.error });
            return;
          }

          // 2. Storage revocation check
          const keyRecord = storage.getKey(key);
          if (keyRecord && keyRecord.status === "revoked") {
            sendJson(200, { valid: false, revoked: true, reason: "Order refunded or revoked" });
            return;
          }

          sendJson(200, {
            valid: true,
            revoked: false,
            tier: offlineCheck.tier,
            sub: offlineCheck.sub,
            exp: offlineCheck.exp
          });
        } catch (e) {
          sendJson(400, { valid: false, error: "Invalid JSON: " + e.message });
        }
      });
      return;
    }

    // Lemon Squeezy Webhook Handler: POST /webhook (or /api/webhook)
    if (method === "POST" && (pathname === "/webhook" || pathname === "/api/webhook" || pathname === "/")) {
      const chunks = [];
      req.on("data", (chunk) => { chunks.push(chunk); });
      req.on("end", async () => {
        try {
          const rawBuffer = Buffer.concat(chunks);
          const signatureHex = req.headers["x-signature"];

          // Step 1: Verify HMAC signature
          if (!verifyLemonSqueezySignature(rawBuffer, signatureHex, webhookSecret)) {
            sendJson(401, { error: "Lemon Squeezy signature verification failed" });
            return;
          }

          let data;
          try {
            data = JSON.parse(rawBuffer.toString("utf8"));
          } catch {
            sendJson(400, { error: "Malformed JSON payload" });
            return;
          }

          const eventName = data.meta?.event_name || req.headers["x-event-name"] || "order_created";
          const orderId = String(data.data?.id || `ord_${Date.now()}`);
          const attributes = data.data?.attributes || {};
          const orderNumber = attributes.order_number ? String(attributes.order_number) : null;
          const status = (attributes.status || "").toLowerCase();
          const isRefunded = attributes.refunded === true || status === "refunded";

          // Event: order_refunded or refund status
          if (eventName === "order_refunded" || isRefunded) {
            const revoked = storage.revokeOrder(orderId);
            sendJson(200, {
              success: true,
              event: "order_refunded",
              orderId,
              orderNumber,
              revoked: Boolean(revoked)
            });
            return;
          }

          // Handle order fulfillment events (order_created or order_updated with paid status)
          if (eventName === "order_created" || eventName === "order_updated") {
            // Security gate: If status is explicitly present and not "paid", do not fulfill
            if (status && status !== "paid") {
              const existing = storage.getOrder(orderId);
              if (existing) {
                existing.status = status;
                storage.saveOrder(existing);
              }
              sendJson(200, {
                success: true,
                event: eventName,
                orderId,
                orderNumber,
                status,
                fulfilled: false,
                message: `Order status '${status}' recorded; awaiting payment confirmation`
              });
              return;
            }

            // Step 2: Idempotency check
            const cached = storage.getOrder(orderId);
            if (cached && cached.licenseKey) {
              // Retry email dispatch if prior attempt failed
              if (cached.emailDispatched !== true) {
                const retryResult = await emailDispatcher.dispatchLicenseEmail({
                  tier: cached.tier,
                  licenseKey: cached.licenseKey,
                  userEmail: cached.userEmail,
                  orderId: cached.orderId
                });
                if (retryResult.sent) {
                  cached.emailDispatched = true;
                  cached.emailDispatchedAt = new Date().toISOString();
                  storage.saveOrder(cached);
                }
              }

              sendJson(200, {
                success: true,
                duplicated: true,
                orderId,
                orderNumber: cached.orderNumber || orderNumber,
                tier: cached.tier,
                userEmail: cached.userEmail,
                licenseKey: cached.licenseKey,
                emailDispatched: cached.emailDispatched
              });
              return;
            }

            const customData = data.meta?.custom_data || {};
            const userEmail = customData.email || attributes.user_email || attributes.customer_email || "customer@example.com";

            // Tier detection with coupon protection
            const tier = resolveOrderTier({ customData, attributes });

            // Issue license key
            const { licenseKey, payload } = await issueCommercialLicense({
              tier,
              sub: userEmail,
              privateKeyPkcs8Base64: privateKeyPkcs8
            });

            // Dispatch transactional email asynchronously
            const emailResult = await emailDispatcher.dispatchLicenseEmail({
              tier,
              licenseKey,
              userEmail,
              orderId
            });

            // Save order record
            const orderRecord = {
              orderId,
              orderNumber,
              tier,
              userEmail,
              licenseKey,
              payload,
              status: "active",
              emailDispatched: Boolean(emailResult.sent),
              createdAt: new Date().toISOString()
            };
            storage.saveOrder(orderRecord);

            sendJson(200, {
              success: true,
              orderId,
              orderNumber,
              tier,
              userEmail,
              licenseKey,
              emailDispatched: orderRecord.emailDispatched,
              createdAt: orderRecord.createdAt
            });
            return;
          }

          // Default acknowledge
          sendJson(200, { success: true, acknowledgedEvent: eventName });
        } catch (err) {
          console.error("Webhook processing error:", err);
          sendJson(500, { error: "Internal server error: " + err.message });
        }
      });
      return;
    }

    sendJson(404, {
      error: "Not Found",
      endpoints: {
        webhook: "POST /webhook",
        licenseLookup: "GET /license?order_id=<id>&email=<email>",
        verify: "POST /v1/licenses/verify",
        health: "GET /health"
      }
    });
  });

  return server;
}

// CLI Execution entry point
if (require.main === module) {
  const port = parseInt(process.env.PORT, 10) || 3000;
  const server = createServer();
  server.listen(port, () => {
    console.log(`\n===============================================================`);
    console.log(`🚀 BHM-PRO Lemon Squeezy Webhook Server running on port ${port}`);
    console.log(`   Webhook Endpoint:  http://localhost:${port}/webhook`);
    console.log(`   License Lookup:    http://localhost:${port}/license`);
    console.log(`   Health Check:      http://localhost:${port}/health`);
    console.log(`===============================================================\n`);
  });
}

module.exports = { createServer };
