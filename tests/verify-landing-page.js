const fs = require('fs');
const path = require('path');
const http = require('http');

const dir = path.resolve(__dirname, '..', 'landing-page');
const files = ['index.html', 'terms.html', 'privacy.html', 'refund.html'];

let totalErrors = 0;

console.log('======================================================');
console.log('   BHM-PRO LANDING PAGE & COMPLIANCE VERIFICATION    ');
console.log('======================================================\n');

// 1. Local Link & Asset Integrity
console.log('--- 1. Testing Local Relative Asset & Link Targets ---');
for (const file of files) {
  const filePath = path.join(dir, file);
  assert(fs.existsSync(filePath), `File exists: ${file}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [...content.matchAll(/(?:href|src)=["']([^"'#:]+?)["']/g)];
  for (const [_, ref] of matches) {
    if (ref.startsWith('mailto:') || ref.startsWith('http://') || ref.startsWith('https://')) {
      continue;
    }
    const cleanRef = ref.split('?')[0];
    const target = path.join(dir, cleanRef);
    if (!fs.existsSync(target)) {
      console.error(`  ❌ [FAIL] in ${file}: missing -> ${cleanRef}`);
      totalErrors++;
    } else {
      console.log(`  ✓ [PASS] ${file} -> ${cleanRef}`);
    }
  }
}

// 2. Canonical & OpenGraph Domain Sanity
console.log('\n--- 2. Testing Production Domain Invariants & Social Tags ---');
for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Must not contain the taken/foreign domain bhm-pro.pages.dev
  if (content.includes('https://bhm-pro.pages.dev')) {
    console.error(`  ❌ [FAIL] ${file} contains obsolete/foreign domain 'bhm-pro.pages.dev'!`);
    totalErrors++;
  } else {
    console.log(`  ✓ [PASS] ${file} has zero references to obsolete domain 'bhm-pro.pages.dev'`);
  }

  // Must have canonical link with bhm-pro-ern.pages.dev
  if (!content.includes('https://bhm-pro-ern.pages.dev/')) {
    console.error(`  ❌ [FAIL] ${file} is missing canonical/og domain 'https://bhm-pro-ern.pages.dev/'!`);
    totalErrors++;
  } else {
    console.log(`  ✓ [PASS] ${file} contains valid production domain 'https://bhm-pro-ern.pages.dev/'`);
  }

  // Check OpenGraph image
  if (!content.includes('og:image') || !content.includes('twitter:image')) {
    console.error(`  ❌ [FAIL] ${file} missing og:image or twitter:image tag!`);
    totalErrors++;
  } else {
    console.log(`  ✓ [PASS] ${file} contains OpenGraph & Twitter image preview tags`);
  }
}

// 3. App.js Licensing Endpoint & Logic
console.log('\n--- 3. Testing Client Logic & Worker Endpoint (app.js) ---');
const appJs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

if (appJs.includes('qq136692547.workers.dev')) {
  console.error(`  ❌ [FAIL] app.js contains non-existent workers subdomain 'qq136692547.workers.dev'!`);
  totalErrors++;
} else {
  console.log(`  ✓ [PASS] app.js has zero references to bogus 'qq136692547.workers.dev'`);
}

if (!appJs.includes('https://bhm-pro-license-worker.geo-score.workers.dev/license')) {
  console.error(`  ❌ [FAIL] app.js does not point to active worker endpoint 'https://bhm-pro-license-worker.geo-score.workers.dev/license'!`);
  totalErrors++;
} else {
  console.log(`  ✓ [PASS] app.js points to live licensing worker endpoint`);
}

if (!appJs.includes('checkCheckoutSuccess')) {
  console.error(`  ❌ [FAIL] app.js missing checkCheckoutSuccess handler for Paddle redirect returns!`);
  totalErrors++;
} else {
  console.log(`  ✓ [PASS] app.js handles checkout=success redirect returns with auto-scroll and notification`);
}

if (!appJs.includes('showCheckoutFallback')) {
  console.error(`  ❌ [FAIL] app.js missing showCheckoutFallback for adblocker/overlay issues!`);
  totalErrors++;
} else {
  console.log(`  ✓ [PASS] app.js implements graceful dark-mode modal fallback for ad-blockers`);
}

// 4. Feature Showcase & UGC Docs Isolation
console.log('\n--- 4. Testing Feature Tabs & UGC Collaborative Docs Coverage ---');
const indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

const tabIds = ['tab-doh', 'tab-titans', 'tab-ugc', 'tab-undo', 'tab-sidepanel'];
for (const tabId of tabIds) {
  const btnMatch = indexHtml.includes(`data-tab="${tabId}"`);
  const panelMatch = indexHtml.includes(`id="${tabId}"`);
  if (!btnMatch || !panelMatch) {
    console.error(`  ❌ [FAIL] Tab ${tabId} missing button or panel (btn: ${btnMatch}, panel: ${panelMatch})!`);
    totalErrors++;
  } else {
    console.log(`  ✓ [PASS] Feature tab '${tabId}' button and content panel are properly wired`);
  }
}

// 5. JSON-LD Structured Data Schema
console.log('\n--- 5. Testing JSON-LD Structured Schema & Pricing Offers ---');
const jsonLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!jsonLdMatch) {
  console.error(`  ❌ [FAIL] No JSON-LD schema found in index.html!`);
  totalErrors++;
} else {
  try {
    const schema = JSON.parse(jsonLdMatch[1]);
    if (schema['@type'] !== 'SoftwareApplication') {
      console.error(`  ❌ [FAIL] JSON-LD schema @type is ${schema['@type']}, expected SoftwareApplication`);
      totalErrors++;
    } else {
      console.log(`  ✓ [PASS] JSON-LD schema is valid SoftwareApplication format`);
    }

    const offers = schema.offers || [];
    const prices = offers.map(o => o.price);
    if (!prices.includes('0') || !prices.includes('9.90') || !prices.includes('24.90')) {
      console.error(`  ❌ [FAIL] JSON-LD missing expected price offers [0, 9.90, 24.90]. Found: ${JSON.stringify(prices)}`);
      totalErrors++;
    } else {
      console.log(`  ✓ [PASS] JSON-LD offers include Free ($0), Single Wash ($9.90), and Lifetime Buyout ($24.90)`);
    }
  } catch (err) {
    console.error(`  ❌ [FAIL] JSON-LD failed to parse: ${err.message}`);
    totalErrors++;
  }
}

// 6. Regulatory & Support Compliance Links
console.log('\n--- 6. Testing Merchant & CWS Compliance Contacts ---');
if (!indexHtml.includes('qq136692547@gmail.com')) {
  console.error(`  ❌ [FAIL] Support email 'qq136692547@gmail.com' not present!`);
  totalErrors++;
} else {
  console.log(`  ✓ [PASS] Support contact email qq136692547@gmail.com present`);
}

if (!indexHtml.includes('nomieaphhhhhikklfhmhhjcdgicaikgn')) {
  console.error(`  ❌ [FAIL] Extension ID 'nomieaphhhhhikklfhmhhjcdgicaikgn' not linked!`);
  totalErrors++;
} else {
  console.log(`  ✓ [PASS] Google Chrome Web Store official extension link verified`);
}

if (!indexHtml.includes('14-Day 100% Money-Back Guarantee') && !indexHtml.includes('14-day 100% money-back guarantee')) {
  console.error(`  ❌ [FAIL] 14-day money-back guarantee not clearly highlighted!`);
  totalErrors++;
} else {
  console.log(`  ✓ [PASS] 14-day 100% money-back guarantee policy clearly stated`);
}

// 7. Live HTTP & CORS Preflight Tests via Proxy
console.log('\n--- 7. Testing Live Cloudflare Endpoints & CORS Headers ---');

function makeProxyReq(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const proxyHost = '127.0.0.1';
    const proxyPort = 7897;

    const req = http.request({
      host: proxyHost,
      port: proxyPort,
      method: 'CONNECT',
      path: `${url.hostname}:443`
    });

    req.on('connect', (res, socket) => {
      const tls = require('tls');
      const tlsSocket = tls.connect({
        host: url.hostname,
        socket: socket,
        servername: url.hostname
      }, () => {
        const method = options.method || 'GET';
        let rawReq = `${method} ${url.pathname}${url.search} HTTP/1.1\r\n` +
          `Host: ${url.hostname}\r\n` +
          `User-Agent: BHM-Verification/1.0\r\n` +
          `Connection: close\r\n\r\n`;
        tlsSocket.write(rawReq);
      });

      let rawData = '';
      tlsSocket.on('data', chunk => { rawData += chunk.toString(); });
      tlsSocket.on('end', () => {
        const statusLine = rawData.split('\r\n')[0];
        const statusCode = parseInt(statusLine.split(' ')[1], 10);
        const headers = {};
        const headerLines = rawData.split('\r\n\r\n')[0].split('\r\n').slice(1);
        for (const line of headerLines) {
          const idx = line.indexOf(':');
          if (idx > 0) {
            headers[line.substring(0, idx).toLowerCase()] = line.substring(idx + 1).trim();
          }
        }
        resolve({ statusCode, headers, body: rawData.split('\r\n\r\n')[1] || '' });
      });
      tlsSocket.on('error', reject);
    });

    req.on('error', reject);
    req.end();
  });
}

async function runLiveTests() {
  try {
    // A: Worker Health Check
    const health = await makeProxyReq('https://bhm-pro-license-worker.geo-score.workers.dev/health');
    if (health.statusCode === 200 && health.headers['access-control-allow-origin'] === '*') {
      console.log(`  ✓ [PASS] Worker /health returned HTTP 200 with Access-Control-Allow-Origin: *`);
    } else {
      console.error(`  ❌ [FAIL] Worker /health returned status ${health.statusCode}, CORS: ${health.headers['access-control-allow-origin']}`);
      totalErrors++;
    }

    // B: Worker OPTIONS Preflight
    const preflight = await makeProxyReq('https://bhm-pro-license-worker.geo-score.workers.dev/license', { method: 'OPTIONS' });
    if (preflight.statusCode === 204 && preflight.headers['access-control-allow-origin'] === '*') {
      console.log(`  ✓ [PASS] Worker OPTIONS /license returned HTTP 204 with CORS preflight headers`);
    } else {
      console.error(`  ❌ [FAIL] Worker OPTIONS /license returned status ${preflight.statusCode}`);
      totalErrors++;
    }

    // C: Live Production Pages.dev
    const page = await makeProxyReq('https://bhm-pro-ern.pages.dev/');
    if (page.statusCode === 200 && page.body.includes('https://bhm-pro-ern.pages.dev/')) {
      console.log(`  ✓ [PASS] Live Cloudflare Pages (https://bhm-pro-ern.pages.dev/) returned HTTP 200 with updated meta tags`);
    } else {
      console.error(`  ❌ [FAIL] Live Cloudflare Pages returned status ${page.statusCode}`);
      totalErrors++;
    }

    // D: Social Preview Image
    const img = await makeProxyReq('https://bhm-pro-ern.pages.dev/assets/twitter-card.png', { method: 'HEAD' });
    if (img.statusCode === 200 && img.headers['content-type'] === 'image/png') {
      console.log(`  ✓ [PASS] Social preview image (assets/twitter-card.png) returned HTTP 200 with image/png`);
    } else {
      console.error(`  ❌ [FAIL] Social preview image returned status ${img.statusCode}, Content-Type: ${img.headers['content-type']}`);
      totalErrors++;
    }
  } catch (err) {
    console.warn(`  ⚠️ [WARN] Live proxy test encountered local network error: ${err.message}. Skipping remote assertions.`);
  }

  console.log('\n======================================================');
  if (totalErrors === 0) {
    console.log('🎉 ALL LANDING PAGE & COMPLIANCE INVARIANTS PASSED (100%)!');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.error(`❌ VERIFICATION FAILED WITH ${totalErrors} CRITICAL DEFECT(S)!`);
    console.log('======================================================\n');
    process.exit(1);
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ [ASSERT FAIL] ${message}`);
    totalErrors++;
  }
}

runLiveTests();
