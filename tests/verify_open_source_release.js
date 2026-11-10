/**
 * Bookmark Health Master (BHM-PRO)
 * Open Source Release, Compliance & Governance Verification Suite
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('================================================================================');
console.log('   BHM-PRO Open Source Release & Compliance Verification Suite');
console.log('================================================================================\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failCount++;
  }
}

// 1. File Existence & Non-Empty Checks
const REQUIRED_FILES = [
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'SECURITY.md',
  '.gitignore',
  'OPEN_SOURCE_LAUNCH_KIT.md',
  path.join('.github', 'ISSUE_TEMPLATE', 'bug_report.yml'),
  path.join('.github', 'ISSUE_TEMPLATE', 'feature_request.yml'),
  path.join('.github', 'ISSUE_TEMPLATE', 'config.yml')
];

for (const relPath of REQUIRED_FILES) {
  test(`Required open-source file exists: ${relPath}`, () => {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert(fs.existsSync(fullPath), `File missing: ${relPath}`);
    const stat = fs.statSync(fullPath);
    assert(stat.size > 50, `File appears empty: ${relPath} (${stat.size} bytes)`);
  });
}

// 2. .gitignore Security & Secret Shielding
test('.gitignore strictly shields private keys, tokens, .agents/, .gemini/, .env* and archives', () => {
  const gitignoreContent = fs.readFileSync(path.join(ROOT_DIR, '.gitignore'), 'utf8');
  const requiredPatterns = [
    'private-keys/',
    '*.pem',
    '*.key',
    '.env.paddle',
    '.env*',
    '*_private.json',
    '*private_key*',
    '.agents/',
    '.gemini/',
    '.wrangler/',
    '*.zip'
  ];
  for (const pattern of requiredPatterns) {
    assert(gitignoreContent.includes(pattern), `.gitignore missing required security pattern: ${pattern}`);
  }
});

// 3. LICENSE verification
test('LICENSE is valid standard MIT license dated 2026', () => {
  const licenseContent = fs.readFileSync(path.join(ROOT_DIR, 'LICENSE'), 'utf8');
  assert(licenseContent.includes('MIT License'), 'LICENSE must be MIT');
  assert(licenseContent.includes('2026'), 'LICENSE must include year 2026');
  assert(licenseContent.includes('BHM-PRO Team / L.D. Studio'), 'LICENSE must mention BHM-PRO Team / L.D. Studio');
});

// 4. README.md Components Verification
test('README.md contains badges, links, and accurate metadata', () => {
  const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
  assert(readme.includes('nomieaphhhhhikklfhmhhjcdgicaikgn'), 'Missing CWS extension ID badge/link');
  assert(readme.includes('v2.1.0'), 'Missing v2.1.0 version tag');
  assert(readme.includes('MIT'), 'Missing MIT license reference');
  assert(readme.includes('Manifest V3'), 'Missing Manifest V3 reference');
  assert(readme.includes('100% Local-First') && readme.includes('Zero Telemetry'), 'Missing local-first / zero telemetry badge');
  assert(readme.includes('https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn'), 'Missing quick install button to CWS');
  assert(readme.includes('https://bhm-pro-ern.pages.dev/'), 'Missing landing page upgrade link');
});

test('README.md visual walkthrough assets exist on disk', () => {
  const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
  const imageRegex = /src=["']([^"']+\.png)["']/g;
  let match;
  let imgCount = 0;
  while ((match = imageRegex.exec(readme)) !== null) {
    const relImgPath = match[1];
    const fullImgPath = path.join(ROOT_DIR, relImgPath);
    assert(fs.existsSync(fullImgPath), `README.md references missing image: ${relImgPath}`);
    assert(fs.statSync(fullImgPath).size > 1000, `Image asset is corrupt/empty: ${relImgPath}`);
    imgCount++;
  }
  assert(imgCount >= 4, `Expected at least 4 walkthrough images, found ${imgCount}`);
});

test('README.md contains feature comparison matrix ($24.90 lifetime) & architecture diagram', () => {
  const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
  assert(readme.includes('Feature Comparison Matrix'), 'Missing Feature Comparison Matrix');
  assert(readme.includes('Community Edition (Free)'), 'Missing Community Edition in table');
  assert(readme.includes('$24.90'), 'Missing $24.90 lifetime price');
  assert(readme.includes('DoH'), 'Missing DoH in architecture');
  assert(readme.includes('16 Tech Titans'), 'Missing 16 Tech Titans');
  assert(readme.includes('Move Journal') || readme.includes('MoveJournal'), 'Missing Move Journal');
  assert(readme.includes('Ed25519'), 'Missing Ed25519 WebCrypto');
  assert(readme.includes('chrome://extensions/'), 'Missing developer load instructions');
});

// 5. SECURITY.md Architectural Disclosures
test('SECURITY.md documents zero telemetry, RFC 1918 shielding and offline Ed25519', () => {
  const sec = fs.readFileSync(path.join(ROOT_DIR, 'SECURITY.md'), 'utf8');
  assert(sec.includes('Zero Telemetry'), 'Missing Zero Telemetry section');
  assert(sec.includes('RFC 1918') || sec.includes('RFC1918'), 'Missing RFC 1918 section');
  assert(sec.includes('Ed25519'), 'Missing Ed25519 offline section');
  assert(sec.includes('DeclarativeNetRequest') || sec.includes('DNR'), 'Missing DNR session isolation');
});

// 6. CONTRIBUTING.md Guidelines & Real Test Verification
test('CONTRIBUTING.md provides accurate developer guide with verified real test files and directories', () => {
  const contrib = fs.readFileSync(path.join(ROOT_DIR, 'CONTRIBUTING.md'), 'utf8');
  assert(contrib.includes('node tests/run_all_tests.js'), 'Missing test suite command');
  assert(contrib.includes('chrome://extensions/'), 'Missing developer mode instructions');
  assert(contrib.includes('Pull Request'), 'Missing PR process');
  assert(contrib.includes('https://github.com/bhm-pro/bookmark-health-master.git'), 'Missing or invalid GitHub clone URL');

  // Verify that bookmark-organizer/core/ is referenced and NOT modules/
  assert(contrib.includes('core/'), 'CONTRIBUTING.md must accurately document the core/ directory');
  assert(!contrib.includes('bookmark-organizer/modules/'), 'CONTRIBUTING.md must NOT reference nonexistent modules/ directory');

  // Extract all test commands and verify every single file exists on disk
  const testCmdRegex = /node (tests\/[a-zA-Z0-9_\-\.]+\.js)/g;
  let match;
  let cmdCount = 0;
  while ((match = testCmdRegex.exec(contrib)) !== null) {
    const relTestPath = match[1];
    const fullTestPath = path.join(ROOT_DIR, relTestPath);
    assert(fs.existsSync(fullTestPath), `CONTRIBUTING.md references non-existent test file: ${relTestPath}`);
    cmdCount++;
  }
  assert(cmdCount >= 6, `Expected at least 6 verified test commands in CONTRIBUTING.md, found ${cmdCount}`);
});

// 7. GitHub Issue Templates & Configuration
test('GitHub issue templates and config are valid', () => {
  const bugReport = fs.readFileSync(path.join(ROOT_DIR, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml'), 'utf8');
  const featureReq = fs.readFileSync(path.join(ROOT_DIR, '.github', 'ISSUE_TEMPLATE', 'feature_request.yml'), 'utf8');
  const config = fs.readFileSync(path.join(ROOT_DIR, '.github', 'ISSUE_TEMPLATE', 'config.yml'), 'utf8');
  assert(bugReport.includes('name: Bug Report'), 'Invalid bug report template');
  assert(featureReq.includes('name: Feature Request'), 'Invalid feature request template');
  assert(config.includes('blank_issues_enabled: false'), 'Invalid issue config template');
});

// 8. OPEN_SOURCE_LAUNCH_KIT.md Marketing Kit & Integrity
test('OPEN_SOURCE_LAUNCH_KIT.md contains HN, Reddit, Twitter drafts and authentic paths', () => {
  const kit = fs.readFileSync(path.join(ROOT_DIR, 'OPEN_SOURCE_LAUNCH_KIT.md'), 'utf8');
  assert(kit.includes('Show HN'), 'Missing Show HN draft');
  assert(kit.includes('r/opensource'), 'Missing r/opensource draft');
  assert(kit.includes('r/SideProject'), 'Missing r/SideProject draft');
  assert(kit.includes('r/webdev'), 'Missing r/webdev draft');
  assert(kit.includes('Twitter / X'), 'Missing Twitter / X draft');
  assert(kit.includes('https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn'), 'Missing CWS link in launch kit');
  assert(kit.includes('https://bhm-pro-ern.pages.dev/'), 'Missing landing page link in launch kit');
  assert(kit.includes('https://github.com/bhm-pro/bookmark-health-master'), 'Missing GitHub repo link in launch kit');
  assert(!kit.includes('modules/classifier.js'), 'Launch kit must NOT reference nonexistent modules/classifier.js');
});

console.log('\n================================================================================');
console.log(`Open Source Verification Summary: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
