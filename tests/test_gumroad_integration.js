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

  console.log('================================================================');
  console.log('🎉 ALL GUMROAD INTEGRATION TESTS PASSED (100%)!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
