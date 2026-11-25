// tests/test_badge_and_paywall.js - Dynamic SVG Health Badge & Paywall Alignment Tests
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { BHM_I18N } = require("../bookmark-organizer/core/i18n.js");

async function main() {
  console.log("================================================================");
  console.log("▶ [Test Suite] Dynamic SVG Health Badge & Extension Paywall");
  console.log("================================================================");

  const workerModule = await import("../webhook-worker/src/paddle-worker.js");
  const worker = workerModule.default;
  const env = {};
  const ctx = { waitUntil() {} };

  // --------------------------------------------------------------------------
  // 1. Default GET /badge.svg
  // --------------------------------------------------------------------------
  const defaultRes = await worker.fetch(
    new Request("https://worker.example.com/badge.svg", { method: "GET" }),
    env,
    ctx
  );
  assert.strictEqual(defaultRes.status, 200, "GET /badge.svg must return 200");
  assert(
    (defaultRes.headers.get("Content-Type") || "").includes("image/svg+xml"),
    "Content-Type must be image/svg+xml"
  );
  assert.strictEqual(
    defaultRes.headers.get("Cache-Control"),
    "public, max-age=3600",
    "Cache-Control must be public, max-age=3600"
  );
  assert.strictEqual(
    defaultRes.headers.get("Access-Control-Allow-Origin"),
    "*",
    "CORS Allow-Origin header must be present"
  );
  const defaultSvg = await defaultRes.text();
  assert(defaultSvg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), "Must return valid SVG root");
  assert(defaultSvg.includes("Bookmark Health"), "Default label must be Bookmark Health");
  assert(defaultSvg.includes("98/100"), "Default score must be 98/100");
  assert(defaultSvg.includes("#10b981"), "Score 98 must use emerald #10b981");
  console.log("  ✓ Test 1: Default GET /badge.svg renders 98/100 emerald SVG with proper headers");

  // --------------------------------------------------------------------------
  // 2. Score + dead count + color tier thresholds + clamping
  // --------------------------------------------------------------------------
  const tiers = [
    { url: "https://worker.example.com/badge.svg?score=92&dead=3", expectedText: "92/100 · 3 dead", expectedColor: "#10b981" },
    { url: "https://worker.example.com/badge.svg?score=75&dead=0", expectedText: "75/100 · 0 dead", expectedColor: "#3b82f6" },
    { url: "https://worker.example.com/badge.svg?score=55", expectedText: "55/100", expectedColor: "#f59e0b" },
    { url: "https://worker.example.com/badge.svg?score=32&dead=19", expectedText: "32/100 · 19 dead", expectedColor: "#ef4444" },
    { url: "https://worker.example.com/badge.svg?score=999", expectedText: "100/100", expectedColor: "#10b981" },
    { url: "https://worker.example.com/badge.svg?score=-15&dead=-5", expectedText: "0/100 · 0 dead", expectedColor: "#ef4444" }
  ];

  for (const t of tiers) {
    const res = await worker.fetch(new Request(t.url, { method: "GET" }), env, ctx);
    assert.strictEqual(res.status, 200, `Expected 200 for ${t.url}`);
    const body = await res.text();
    assert(body.includes(t.expectedText), `Expected "${t.expectedText}" in SVG for ${t.url}`);
    assert(body.includes(t.expectedColor), `Expected color ${t.expectedColor} in SVG for ${t.url}`);
  }
  console.log("  ✓ Test 2: Score tiers (#10b981/#3b82f6/#f59e0b/#ef4444), dead count & 0..100 clamping verified");

  // --------------------------------------------------------------------------
  // 3. XSS / <script> label sanitization & 28-char truncation + HEAD support
  // --------------------------------------------------------------------------
  const xssRes = await worker.fetch(
    new Request("https://worker.example.com/badge.svg?label=%3Cscript%3Ealert(1)%3C%2Fscript%3E", { method: "GET" }),
    env,
    ctx
  );
  assert.strictEqual(xssRes.status, 200);
  const xssSvg = await xssRes.text();
  assert(!xssSvg.toLowerCase().includes("<script"), "SVG must not contain <script tag");
  assert(!xssSvg.includes("</script>"), "SVG must not contain </script>");

  const longLabel = "ABCDEFGHIJKLMNO_1234567890_EXTRA_OVERFLOW";
  const longRes = await worker.fetch(
    new Request(`https://worker.example.com/badge.svg?label=${encodeURIComponent(longLabel)}`, { method: "GET" }),
    env,
    ctx
  );
  const longSvg = await longRes.text();
  assert(!longSvg.includes(longLabel), "Label longer than 28 chars must be truncated");
  assert(longSvg.includes(longLabel.slice(0, 28)), "Truncated 28-char label must be present");

  const headRes = await worker.fetch(
    new Request("https://worker.example.com/badge.svg?score=88", { method: "HEAD" }),
    env,
    ctx
  );
  assert.strictEqual(headRes.status, 200, "HEAD /badge.svg must return 200");
  assert(
    (headRes.headers.get("Content-Type") || "").includes("image/svg+xml"),
    "HEAD /badge.svg must include image/svg+xml Content-Type"
  );
  assert.strictEqual(await headRes.text(), "", "HEAD /badge.svg must return empty body");
  console.log("  ✓ Test 3: Malicious <script> label sanitization, 28-char truncation & HEAD route verified");

  // --------------------------------------------------------------------------
  // 4. Chrome Extension dashboard.html & core/i18n.js Paywall Alignment
  // --------------------------------------------------------------------------
  const dashboardHtml = fs.readFileSync(
    path.resolve(__dirname, "../bookmark-organizer/dashboard.html"),
    "utf8"
  );
  const i18nJs = fs.readFileSync(
    path.resolve(__dirname, "../bookmark-organizer/core/i18n.js"),
    "utf8"
  );

  const requiredIds = [
    "paywallModal",
    "closePaywallBtn",
    "paywallHeadline",
    "paywallSubheadline",
    "paywallValueAnchor",
    "pwDeadCount",
    "pwDupCount",
    "pwSavedMinutes",
    "tierCard30d",
    "paywallBuy30dBtn",
    "tierCardLtd",
    "paywallBuyLtdBtn",
    "paywallBuyTeamBtn",
    "paywallViralUnlockBtn",
    "paywallLicenseInput",
    "paywallActivateBtn"
  ];
  for (const id of requiredIds) {
    assert(dashboardHtml.includes(`id="${id}"`), `dashboard.html must preserve DOM id="${id}"`);
  }

  const teamUrl = "https://dengli.gumroad.com/l/bhm-pro-team";
  assert(dashboardHtml.includes(teamUrl), `dashboard.html must contain ${teamUrl}`);
  assert(dashboardHtml.includes("5 independent offline Ed25519 keys • Instant VAT invoice"), "dashboard.html must include Team Pack VAT invoice copy");
  assert(dashboardHtml.includes("16 Cloud &amp; Dev Ecosystems") || dashboardHtml.includes("16 Cloud & Dev Ecosystems"), "dashboard.html must use 16 Cloud & Dev Ecosystems");
  assert(dashboardHtml.includes("Auth-Gated Cloud Docs"), "dashboard.html must align copy to Auth-Gated Cloud Docs");
  assert(dashboardHtml.includes("3 personal browsers"), "dashboard.html must specify 3 personal browsers");
  assert(dashboardHtml.includes("$29.00"), "dashboard.html must show $29.00 strikethrough original price");

  assert(!dashboardHtml.includes("16-Tech-Giant"), "dashboard.html must have zero legacy 16-Tech-Giant occurrences");
  assert(!dashboardHtml.includes("16大科技巨头生态树"), "dashboard.html must have zero legacy 16大科技巨头生态树 occurrences");
  assert(!dashboardHtml.includes("$39.00"), "dashboard.html must have zero legacy $39.00 strikethrough occurrences");

  assert(i18nJs.includes("16 Cloud & Dev Ecosystems"), "core/i18n.js must contain 16 Cloud & Dev Ecosystems");
  assert(i18nJs.includes("16 大云与开发者生态树"), "core/i18n.js must contain 16 大云与开发者生态树");
  assert(i18nJs.includes("Auth-Gated Cloud Docs"), "core/i18n.js must contain Auth-Gated Cloud Docs");
  assert(i18nJs.includes("3 personal browsers"), "core/i18n.js must contain 3 personal browsers");
  assert(i18nJs.includes("3 台个人浏览器"), "core/i18n.js must contain 3 台个人浏览器");
  assert(i18nJs.includes("5 independent offline Ed25519 keys • Instant VAT invoice"), "core/i18n.js must contain Team Pack VAT copy");
  assert(!i18nJs.includes("16-Tech-Giant"), "core/i18n.js must have zero legacy 16-Tech-Giant occurrences");
  assert(!i18nJs.includes("16大科技巨头生态树"), "core/i18n.js must have zero legacy 16大科技巨头生态树 occurrences");
  assert(!i18nJs.includes("$39.00"), "core/i18n.js must have zero legacy $39.00 occurrences");

  // Dictionary symmetry & zero Chinese characters in English dictionary
  const enKeys = Object.keys(BHM_I18N.DICTS.en).sort();
  const zhKeys = Object.keys(BHM_I18N.DICTS.zh).sort();
  assert.deepStrictEqual(enKeys, zhKeys, "BHM_I18N en and zh dictionaries must have 1:1 key parity");
  for (const key of enKeys) {
    if (key === "langToggleText" || key === "langToggleTitle") continue;
    assert(
      !/[\u4e00-\u9fa5]/.test(BHM_I18N.DICTS.en[key]),
      `English i18n key '${key}' must not contain Chinese characters: ${BHM_I18N.DICTS.en[key]}`
    );
  }
  console.log("  ✓ Test 4: Extension paywall DOM IDs, Team Pack CTA, copy alignment & i18n parity verified");

  console.log("================================================================");
  console.log("🎉 ALL BADGE & PAYWALL TESTS PASSED (100%)!");
  console.log("================================================================");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
