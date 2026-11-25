// tests/test_gumroad_integration.js - Gumroad Integration & Automated Issuance E2E Test Suite
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { LicenseManager } = require('../bookmark-organizer/core/license.js');

async function main() {
  console.log('================================================================');
  console.log('▶ [Test Suite] Gumroad Payment Integration & Automated Issuance');
  console.log('================================================================');

  // Test 1: Verify CSP in landing-page/_headers includes Gumroad
  const headers = fs.readFileSync(path.resolve(__dirname, '../landing-page/_headers'), 'utf8');
  assert(headers.includes('https://gumroad.com'), 'CSP must permit https://gumroad.com');
  assert(headers.includes('https://*.gumroad.com'), 'CSP must permit https://*.gumroad.com');
  console.log('  ✓ Test 1: Content-Security-Policy correctly permits Gumroad scripts, styles, frames, and connections');

  // Test 2: Verify Gumroad CDN script and buttons in landing-page/index.html
  const indexHtml = fs.readFileSync(path.resolve(__dirname, '../landing-page/index.html'), 'utf8');
  assert(indexHtml.includes('https://gumroad.com/js/gumroad.js'), 'index.html must include gumroad.js');
  assert(indexHtml.includes('https://dengli.gumroad.com/l/bhm-pro-lifetime'), 'index.html must link to Lifetime Buyout on Gumroad');
  assert(indexHtml.includes('https://dengli.gumroad.com/l/bhm-pro-30day'), 'index.html must link to 30-Day Pass on Gumroad');
  assert(indexHtml.includes('gumroad-button'), 'index.html must have gumroad-button classes for modal overlay');
  console.log('  ✓ Test 2: Landing page includes Gumroad JS SDK and official checkout links');

  // Test 3: Verify Pricing in i18n.js matches Option A ($4.90 / ¥35 and $14.90 / ¥99)
  const i18n = fs.readFileSync(path.resolve(__dirname, '../landing-page/i18n.js'), 'utf8');
  assert(i18n.includes('"price.washAmount": "4.90"'), 'Wash amount must be 4.90 in English');
  assert(i18n.includes('"price.ltdAmount": "14.90"'), 'Lifetime amount must be 14.90 in English');
  assert(i18n.includes('"price.washAmount": "35"'), 'Wash amount must be 35 in Chinese');
  assert(i18n.includes('"price.ltdAmount": "99"'), 'Lifetime amount must be 99 in Chinese');
  console.log('  ✓ Test 3: Option A pricing ($4.90 / ¥35 and $14.90 / ¥99) 100% synchronized in i18n dictionaries');

  // Test 4: Verify Pre-generated Gumroad Key Pools
  const ltdPoolPath = path.resolve(__dirname, '../private-keys/gumroad-ltd-keys.txt');
  const washPoolPath = path.resolve(__dirname, '../private-keys/gumroad-wash-keys.txt');
  assert(fs.existsSync(ltdPoolPath), 'gumroad-ltd-keys.txt must exist');
  assert(fs.existsSync(washPoolPath), 'gumroad-wash-keys.txt must exist');

  const ltdKeys = fs.readFileSync(ltdPoolPath, 'utf8').trim().split('\n');
  const washKeys = fs.readFileSync(washPoolPath, 'utf8').trim().split('\n');
  assert.strictEqual(ltdKeys.length, 100, 'Must have 100 pre-generated LTD keys');
  assert.strictEqual(washKeys.length, 100, 'Must have 100 pre-generated Wash keys');

  // Sample verify 5 keys from each pool
  for (let i = 0; i < 5; i++) {
    const ltdRes = await LicenseManager.verifyLicense(ltdKeys[i]);
    assert.strictEqual(ltdRes.valid, true, `LTD key ${i} must verify`);
    assert.strictEqual(ltdRes.tier, 'LTD', `LTD key ${i} must have tier LTD`);

    const washRes = await LicenseManager.verifyLicense(washKeys[i]);
    assert.strictEqual(washRes.valid, true, `Wash key ${i} must verify`);
    assert.strictEqual(washRes.tier, 'SINGLE_WASH', `Wash key ${i} must have tier SINGLE_WASH`);
  }
  console.log('  ✓ Test 4: Pre-generated Gumroad key pools verified offline via Ed25519 LicenseManager');

  // Test 5: Verify Worker code includes /webhook/gumroad handler
  const workerCode = fs.readFileSync(path.resolve(__dirname, '../webhook-worker/src/paddle-worker.js'), 'utf8');
  assert(workerCode.includes('/webhook/gumroad'), 'Worker must contain /webhook/gumroad route');
  assert(workerCode.includes('mintLicense'), 'Worker must invoke mintLicense for Gumroad');
  assert(workerCode.includes('email:'), 'Worker must index email for self-service lookup');
  console.log('  ✓ Test 5: Cloudflare Worker incorporates Gumroad webhook handler and KV index');

  // Test 6: Verify Team Pack Gumroad URL in landing-page/index.html & landing-page/app.js
  const appJs = fs.readFileSync(path.resolve(__dirname, '../landing-page/app.js'), 'utf8');
  const teamUrl = 'https://dengli.gumroad.com/l/bhm-pro-team';
  assert(indexHtml.includes(teamUrl), `index.html must include ${teamUrl}`);
  assert(appJs.includes(teamUrl), `app.js must include ${teamUrl}`);
  console.log('  ✓ Test 6: Landing page index.html and app.js both reference bhm-pro-team checkout URL');

  // Test 7: E2E 5-Seat Team Pack (/webhook/gumroad minting + Ed25519 verifyLicense + GET /license lookup)
  const privKeyPath = path.resolve(__dirname, '../private-keys/bhm_prod_ed25519_private.json');
  const privKeyData = JSON.parse(fs.readFileSync(privKeyPath, 'utf8'));
  const workerModule = await import('../webhook-worker/src/paddle-worker.js');
  const worker = workerModule.default;

  const kvStore = new Map();
  const mockKv = {
    async get(key) { return kvStore.has(key) ? kvStore.get(key) : null; },
    async put(key, val) { kvStore.set(key, val); }
  };
  const env = {
    ENVIRONMENT: 'production',
    ED25519_PRIVATE_KEY_B64: privKeyData.privateKeyPkcs8Base64,
    GUMROAD_WEBHOOK_TOKEN: 'test_gumroad_secret_token_2026',
    GUMROAD_SELLER_ID: 'seller_bhm_prod_001',
    BHM_LICENSES_KV: mockKv
  };
  const ctx = { waitUntil() {} };

  const teamOrderId = 'GUM_TEAM_5_TEST_001';
  const teamOrderNumber = '99887766';
  const teamEmail = 'TeamLead@Example.com';
  const formBody = new URLSearchParams({
    seller_id: 'seller_bhm_prod_001',
    sale_id: teamOrderId,
    order_number: teamOrderNumber,
    email: teamEmail,
    product_permalink: 'bhm-pro-team',
    price: '3900'
  }).toString();

  // Test 7a: Unauthenticated request MUST fail closed (401)
  const unauthReq = new Request('https://worker.example.com/webhook/gumroad', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody
  });
  const unauthRes = await worker.fetch(unauthReq, env, ctx);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated Gumroad webhook must be rejected with HTTP 401');

  // Test 7b: Authenticated Team Pack request mints 5 keys into KV without leaking plaintext keys in HTTP response
  const webhookReq = new Request('https://worker.example.com/webhook/gumroad?token=test_gumroad_secret_token_2026', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody
  });
  const webhookRes = await worker.fetch(webhookReq, env, ctx);
  assert.strictEqual(webhookRes.status, 200, 'Authenticated team webhook must return HTTP 200');
  const webhookData = await webhookRes.json();

  assert.strictEqual(webhookData.success, true, 'Team webhook response success must be true');
  assert.strictEqual(webhookData.tier, 'TEAM_5', 'Team webhook response tier must be TEAM_5');
  assert.strictEqual(webhookData.seatCount, 5, 'Team webhook response seatCount must be 5');
  assert.strictEqual(webhookData.licenseKey, undefined, 'Webhook HTTP response must NEVER leak raw licenseKey');
  assert.strictEqual(webhookData.licenseKeys, undefined, 'Webhook HTTP response must NEVER leak raw licenseKeys');

  // Verify idempotency preserves KV record and still leaks zero keys
  const dupReq = new Request('https://worker.example.com/webhook/gumroad?token=test_gumroad_secret_token_2026', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody
  });
  const dupRes = await worker.fetch(dupReq, env, ctx);
  assert.strictEqual(dupRes.status, 200, 'Duplicate team webhook must return HTTP 200');
  const dupData = await dupRes.json();
  assert.strictEqual(dupData.duplicate, true, 'Duplicate team webhook must set duplicate: true');
  assert.strictEqual(dupData.licenseKeys, undefined, 'Idempotent webhook response must not leak keys');

  // Verify GET /license by sale_id + matching email returns all 5 valid Ed25519 keys
  const lookupReq = new Request(
    `https://worker.example.com/license?order_id=${encodeURIComponent(teamOrderId)}&email=${encodeURIComponent('teamlead@example.com')}`,
    { method: 'GET' }
  );
  const lookupRes = await worker.fetch(lookupReq, env, ctx);
  assert.strictEqual(lookupRes.status, 200, 'GET /license for team order must return HTTP 200');
  const lookupData = await lookupRes.json();
  assert.strictEqual(lookupData.success, true, 'GET /license must return success: true');
  assert.strictEqual(lookupData.tier, 'TEAM_5', 'GET /license must return tier TEAM_5');
  assert(Array.isArray(lookupData.licenseKeys) && lookupData.licenseKeys.length === 5, 'GET /license must return all 5 minted team keys');
  assert.strictEqual(new Set(lookupData.licenseKeys).size, 5, 'All 5 minted team keys must be distinct');

  for (let i = 0; i < lookupData.licenseKeys.length; i++) {
    const key = lookupData.licenseKeys[i];
    const verifyRes = await LicenseManager.verifyLicense(key);
    assert.strictEqual(verifyRes.valid, true, `Team seat #${i + 1} key must pass offline Ed25519 verification`);
    assert.strictEqual(verifyRes.tier, 'LTD', `Team seat #${i + 1} key payload tier must be LTD`);
  }

  // Verify GET /license by Gumroad order_number alias also succeeds
  const aliasReq = new Request(
    `https://worker.example.com/license?order_id=${encodeURIComponent(teamOrderNumber)}&email=${encodeURIComponent('teamlead@example.com')}`,
    { method: 'GET' }
  );
  const aliasRes = await worker.fetch(aliasReq, env, ctx);
  assert.strictEqual(aliasRes.status, 200, 'GET /license via Gumroad order_number alias must return HTTP 200');

  // Verify GET /license rejects forged order_id + real email (P0-3: no email-only bypass!)
  const forgedReq = new Request(
    `https://worker.example.com/license?order_id=NON_EXISTENT_ID&email=${encodeURIComponent('teamlead@example.com')}`,
    { method: 'GET' }
  );
  const forgedRes = await worker.fetch(forgedReq, env, ctx);
  assert.strictEqual(forgedRes.status, 404, 'GET /license MUST reject unknown order_id even if email matches');

  console.log('  ✓ Test 7: Authenticated Team Pack (/webhook/gumroad) mints 5 distinct LTD keys, leaks zero keys, blocks unauth & forged lookups');

  console.log('================================================================');
  console.log('🎉 ALL GUMROAD INTEGRATION TESTS PASSED (100%)!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
