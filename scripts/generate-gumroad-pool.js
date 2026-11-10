// scripts/generate-gumroad-pool.js - Generate production-verified Ed25519 license keys for Gumroad
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { LicenseManager } = require('../bookmark-organizer/core/license.js');

const keyPath = path.resolve(__dirname, '../private-keys/bhm_prod_ed25519_private.json');
if (!fs.existsSync(keyPath)) {
  console.error('Error: Production private key not found at', keyPath);
  process.exit(1);
}

const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const privKey = crypto.createPrivateKey({
  key: Buffer.from(keyData.privateKeyPkcs8Base64, 'base64'),
  format: 'der',
  type: 'pkcs8'
});

function generateSignedKey(tier, sub, durationDays, maxQuota) {
  const nowSec = Math.floor(Date.now() / 1000);
  const payloadObj = {
    sub: sub,
    exp: nowSec + durationDays * 86400,
    tier: tier,
    maxCleanQuota: maxQuota,
    iat: nowSec
  };
  const payloadJson = JSON.stringify(payloadObj);
  const payloadB64Url = Buffer.from(payloadJson).toString('base64url');
  const headerAndPayload = 'BHM1.' + payloadB64Url;

  const sig = crypto.sign(null, Buffer.from(headerAndPayload, 'utf8'), privKey);
  const sigB64Url = sig.toString('base64url');
  return headerAndPayload + '.' + sigB64Url;
}

async function main() {
  console.log('🔑 Generating verified Gumroad License Key Pools...');

  const ltdKeys = [];
  const washKeys = [];

  // 1. Generate 100 LTD keys
  for (let i = 1; i <= 100; i++) {
    const pad = String(i).padStart(4, '0');
    const sub = `gumroad-ltd-${pad}-${Date.now().toString(36)}`;
    const key = generateSignedKey('LTD', sub, 3650, 999999);
    
    // Verify
    const verifyRes = await LicenseManager.verifyLicense(key);
    if (!verifyRes.valid || verifyRes.tier !== 'LTD') {
      throw new Error(`Verification failed for key ${sub}`);
    }
    ltdKeys.push(key);
  }

  // 2. Generate 100 30-Day keys
  for (let i = 1; i <= 100; i++) {
    const pad = String(i).padStart(4, '0');
    const sub = `gumroad-wash-${pad}-${Date.now().toString(36)}`;
    const key = generateSignedKey('SINGLE_WASH', sub, 30, 500);

    // Verify
    const verifyRes = await LicenseManager.verifyLicense(key);
    if (!verifyRes.valid || verifyRes.tier !== 'SINGLE_WASH') {
      throw new Error(`Verification failed for key ${sub}: ` + JSON.stringify(verifyRes));
    }
    washKeys.push(key);
  }

  const outDir = path.resolve(__dirname, '../private-keys');
  fs.writeFileSync(path.join(outDir, 'gumroad-ltd-keys.txt'), ltdKeys.join('\n'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'gumroad-wash-keys.txt'), washKeys.join('\n'), 'utf8');

  console.log(`✅ Successfully generated and verified 100 Lifetime keys -> private-keys/gumroad-ltd-keys.txt`);
  console.log(`✅ Successfully generated and verified 100 30-Day keys -> private-keys/gumroad-wash-keys.txt`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
