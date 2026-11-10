const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('================================================================');
console.log('BHM-PRO CWS STORE ASSETS - MANDATORY VERIFICATION AUDIT');
console.log('================================================================\n');

let allPassed = true;

function checkPng(filePath, expectedW, expectedH) {
  if (!fs.existsSync(filePath)) {
    console.error(`[FAIL] File missing: ${filePath}`);
    allPassed = false;
    return;
  }
  const buf = fs.readFileSync(filePath);
  const sig = buf.slice(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') {
    console.error(`[FAIL] Not PNG: ${filePath}`);
    allPassed = false;
    return;
  }
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);

  const okW = w === expectedW;
  const okH = h === expectedH;
  const okDepth = bitDepth === 8;
  const okType = colorType === 2; // 2 = 24-bit RGB, NO Alpha

  if (okW && okH && okDepth && okType) {
    console.log(`[PASS] ${path.basename(filePath)}: ${w}x${h}, bitDepth=${bitDepth}, colorType=${colorType} (24-bit RGB, No Alpha), size=${buf.length} bytes`);
  } else {
    console.error(`[FAIL] ${path.basename(filePath)} header mismatch: w=${w} (expected ${expectedW}), h=${h} (expected ${expectedH}), bitDepth=${bitDepth} (expected 8), colorType=${colorType} (expected 2)`);
    allPassed = false;
  }
}

// Check 1: 4 screenshots
console.log('--- Check 1: Screenshots (1280x800, bitDepth=8, colorType=2) ---');
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
checkPng(path.join(screenshotsDir, '01-health-scan-doh.png'), 1280, 800);
checkPng(path.join(screenshotsDir, '02-16-titans-organizer.png'), 1280, 800);
checkPng(path.join(screenshotsDir, '03-time-machine-undo.png'), 1280, 800);
checkPng(path.join(screenshotsDir, '04-native-sidepanel.png'), 1280, 800);

// Check 2: Promo tile
console.log('\n--- Check 2: Small Promo Tile (440x280, bitDepth=8, colorType=2) & Icon ---');
const promoDir = path.join(__dirname, '..', 'promo');
checkPng(path.join(promoDir, 'promo-tile-440x280.png'), 440, 280);

const iconPath = path.join(promoDir, 'store-icon-128x128.png');
if (fs.existsSync(iconPath)) {
  const iconBuf = fs.readFileSync(iconPath);
  console.log(`[PASS] store-icon-128x128.png exists: ${iconBuf.readUInt32BE(16)}x${iconBuf.readUInt32BE(20)}, size=${iconBuf.length} bytes`);
} else {
  console.error(`[FAIL] store-icon-128x128.png missing!`);
  allPassed = false;
}

// Check 3: P0-D Forbidden words scan across cws-store-assets/
console.log('\n--- Check 3: P0-D Compliance Forbidden Words Scan ---');
const forbiddenWords = ['301', 'bi-weekly', 'sentinel', 'phishing'];
const cwsDir = path.join(__dirname, '..');

function getAllTextFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTextFiles(full));
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
      results.push(full);
    }
  }
  return results;
}

const textFiles = getAllTextFiles(cwsDir);
let totalForbiddenHits = 0;

for (const f of textFiles) {
  const content = fs.readFileSync(f, 'utf8');
  for (const word of forbiddenWords) {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    const matches = content.match(regex);
    if (matches && matches.length > 0) {
      console.error(`[FAIL] Forbidden word "${word}" found in ${path.relative(cwsDir, f)} (${matches.length} hits)`);
      totalForbiddenHits += matches.length;
      allPassed = false;
    }
  }
  // Check for wrong pricing claim
  if (/single\s*wash[^\n\r]*unlimited/i.test(content)) {
    console.error(`[FAIL] Illegal claim: Single Wash described as unlimited in ${path.relative(cwsDir, f)}`);
    totalForbiddenHits++;
    allPassed = false;
  }
}

if (totalForbiddenHits === 0) {
  console.log(`[PASS] Scanned ${textFiles.length} HTML/MD files in cws-store-assets/: 0 forbidden word hits!`);
}

// Check 4: Zip integrity check
console.log('\n--- Check 4: Production Extension Zip Integrity ---');
const zipPath = 'd:\\谷歌反重力空间\\基本日常\\bhm-pro-extension.zip';
const expectedSize = 99801;
const expectedHash = '8BF40E9FDAB55914F5B74D241AEB1AB898922F0F2B60F00ABADE0DEDF48C6DEC';

if (fs.existsSync(zipPath)) {
  const zipBuf = fs.readFileSync(zipPath);
  const hash = crypto.createHash('sha256').update(zipBuf).digest('hex').toUpperCase();
  const size = zipBuf.length;

  if (size === expectedSize && hash === expectedHash) {
    console.log(`[PASS] bhm-pro-extension.zip: size=${size} bytes, sha256=${hash}`);
  } else {
    console.error(`[FAIL] bhm-pro-extension.zip mismatch! size=${size} (expected ${expectedSize}), hash=${hash} (expected ${expectedHash})`);
    allPassed = false;
  }
} else {
  console.error(`[FAIL] bhm-pro-extension.zip missing!`);
  allPassed = false;
}

console.log('\n================================================================');
if (allPassed) {
  console.log('OVERALL RESULT: ALL AUDIT CHECKS PASSED PERFECTLY (100% COMPLIANT)');
} else {
  console.error('OVERALL RESULT: SOME CHECKS FAILED');
}
console.log('================================================================');

process.exit(allPassed ? 0 : 1);
