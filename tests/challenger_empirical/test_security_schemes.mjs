// tests/challenger_empirical/test_security_schemes.mjs
import { performance } from 'node:perf_hooks';

console.log('=== EMPIRICAL STRESS TEST 4: SECURITY & URL SCHEME EDGE CASES ===\n');

const testUrls = [
  { desc: 'Chrome Internal Page', url: 'chrome://bookmarks' },
  { desc: 'Chrome Settings', url: 'chrome://settings' },
  { desc: 'Chrome Extension Resource', url: 'chrome-extension://abcdefghijklmnop/options.html' },
  { desc: 'Local File Scheme', url: 'file:///C:/Windows/win.ini' },
  { desc: 'JavaScript Scheme (Bookmarklet)', url: 'javascript:(function(){alert(1);})()' },
  { desc: 'Data URI', url: 'data:text/html,<h1>Hello</h1>' },
  { desc: 'About Blank', url: 'about:blank' },
  { desc: 'Localhost Web Server', url: 'http://localhost:3000' },
  { desc: 'Loopback IP', url: 'http://127.0.0.1:8080/api' },
  { desc: 'Router / Gateway Intranet', url: 'http://192.168.1.1' },
  { desc: 'Private Class A Intranet', url: 'http://10.0.0.1' },
  { desc: 'Malformed Scheme', url: 'htp:/invalid-url' },
  { desc: 'Empty String', url: '' }
];

// Test URL parsing and domain extraction
console.log('--- Phase 1: URL Parsing & Domain Extraction in Architecture ---');
function extractDomain(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch (err) {
    return 'unknown-host (EXCEPTION: ' + err.message + ')';
  }
}

for (const t of testUrls) {
  const domain = extractDomain(t.url);
  console.log(`[${t.desc}] "${t.url}" -> Domain: "${domain}"`);
}

// Test fetch() behavior on non-HTTP schemes
console.log('\n--- Phase 2: fetch() Behavior on Special Schemes ---');
for (const t of testUrls) {
  if (!t.url) continue;
  try {
    const res = await fetch(t.url, { method: 'HEAD', signal: AbortSignal.timeout(1000) });
    console.log(`[${t.desc}] fetch SUCCESS -> status: ${res.status}`);
  } catch (err) {
    console.log(`[${t.desc}] fetch FAILED -> ${err.name}: ${err.message}`);
  }
}
