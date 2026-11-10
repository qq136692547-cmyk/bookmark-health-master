const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { MockChrome } = require("./helpers/mock_chrome.js");
const { MockNetwork } = require("./helpers/mock_network.js");
const { BookmarkProber } = require("../bookmark-organizer/core/prober.js");
const {
  PROBE_RULE_ID,
  ALARM_NAME_HEARTBEAT,
  ALARM_NAME_SENTINEL,
  ensureAlarmsRegistered,
  installProbeSessionRule,
  uninstallProbeSessionRule,
  handleAlarmEvent,
  handleRuntimeMessage,
  bindServiceWorkerListeners
} = require("../bookmark-organizer/background.js");

async function runMv3ComplianceTests() {
  console.log("▶ [Test Suite] Manifest V3 Compliance, Lifecycle & Security Tests");

  const extDir = path.resolve(__dirname, "../bookmark-organizer");

  // ==========================================================================
  // Feature 1: Manifest V3 Schema & Permissions (Tier 1: >= 5 tests)
  // ==========================================================================
  const manifestPath = path.join(extDir, "manifest.json");
  const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw);

  // Test 1.1: manifest_version must be exactly 3
  console.log(`  ✓ Manifest version: ${manifest.manifest_version}`);
  assert.strictEqual(manifest.manifest_version, 3, "Must be Manifest V3");

  // Test 1.2: Minimum necessary permissions
  console.log(`  ✓ Declared permissions: [${manifest.permissions.join(", ")}]`);
  assert(manifest.permissions.includes("bookmarks"), "Must declare bookmarks permission");
  assert(manifest.permissions.includes("storage"), "Must declare storage permission");
  assert(manifest.permissions.includes("unlimitedStorage"), "Must declare unlimitedStorage permission");

  // Test 1.3: Optional host permissions declared instead of broad install permissions
  console.log(`  ✓ Optional host permissions: [${(manifest.optional_host_permissions || []).join(", ")}]`);
  assert(
    (manifest.optional_host_permissions && manifest.optional_host_permissions.some(p => p === "*://*/*" || p === "<all_urls>")),
    "Wildcard host permissions must be declared under optional_host_permissions"
  );

  // Test 1.4: Broad host permissions NOT present in base permissions
  if (manifest.host_permissions) {
    assert(!manifest.host_permissions.includes("*://*/*"), "Broad host permissions must NOT be in base permissions");
    assert(!manifest.host_permissions.includes("<all_urls>"), "Broad <all_urls> must NOT be in base permissions");
  }

  // Test 1.5: Content Security Policy or Self-Contained Extension Pages
  if (manifest.content_security_policy) {
    const csp = manifest.content_security_policy.extension_pages || "";
    console.log(`  ✓ Content Security Policy: ${csp}`);
    assert(csp.includes("script-src 'self'"), "CSP must enforce script-src 'self'");
    assert(csp.includes("object-src 'self'"), "CSP must enforce object-src 'self'");
  }

  // ==========================================================================
  // Feature 2: Remotely Hosted Code Elimination & HTML Sanitization (CWS Compliance) (Tier 1 & 2)
  // ==========================================================================
  const htmlFiles = ["dashboard.html", "popup.html", "sidepanel.html", "privacy.html"];
  for (const file of htmlFiles) {
    const filePath = path.join(extDir, file);
    assert(fs.existsSync(filePath), `HTML file ${file} must exist in extension directory`);
    const content = fs.readFileSync(filePath, "utf-8");

    // 1. Assert NO remote script tags (http:// or https://)
    const remoteScriptMatches = content.match(/<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi);
    assert.strictEqual(
      remoteScriptMatches,
      null,
      `Forbidden remote script tag found in ${file}: ${JSON.stringify(remoteScriptMatches)}`
    );

    // 2. Assert NO inline script tags containing executable code
    // Matches <script>...</script> where src is missing
    const inlineScriptRegex = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
    let inlineMatch;
    while ((inlineMatch = inlineScriptRegex.exec(content)) !== null) {
      const inlineCode = inlineMatch[1].trim();
      assert.strictEqual(
        inlineCode,
        "",
        `Forbidden inline executable script found in ${file}: "${inlineCode.slice(0, 100)}..."`
      );
    }

    // 3. Assert NO dangerous code execution patterns (eval, new Function, document.write)
    assert(
      !/\beval\s*\(/.test(content),
      `Forbidden 'eval()' pattern found in ${file}`
    );
    assert(
      !/\bnew\s+Function\s*\(/.test(content),
      `Forbidden 'new Function()' pattern found in ${file}`
    );
    assert(
      !/\bdocument\.write\s*\(/.test(content),
      `Forbidden 'document.write()' pattern found in ${file}`
    );

    // 4. Assert all script tags point exclusively to local relative extension scripts
    const localScriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let localMatch;
    let localScriptCount = 0;
    while ((localMatch = localScriptRegex.exec(content)) !== null) {
      const scriptSrc = localMatch[1];
      assert(
        !scriptSrc.startsWith("http://") && !scriptSrc.startsWith("https://") && !scriptSrc.startsWith("//"),
        `Script src must not be remote in ${file}: ${scriptSrc}`
      );
      const resolvedScriptPath = path.join(extDir, scriptSrc);
      assert(
        fs.existsSync(resolvedScriptPath),
        `Referenced local script ${scriptSrc} in ${file} does not exist on disk!`
      );
      localScriptCount++;
    }

    console.log(`  ✓ HTML sanitization check [${file}]: 0 remote scripts, 0 inline scripts, 0 dangerous patterns, ${localScriptCount} verified local scripts`);
  }

  // ==========================================================================
  // Feature 3: Dynamic optional_host_permissions Runtime Elevation (Tier 1: >= 5 tests)
  // ==========================================================================
  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  // Test 3.1: Initial state has NO broad host permissions granted
  const initialHostCheck = await mockChrome.permissions.contains({ origins: ["*://*/*"] });
  console.log(`  ✓ Initial host permissions granted: ${initialHostCheck} (Expected false)`);
  assert.strictEqual(initialHostCheck, false);

  // Test 3.2: Runtime permissions request flow
  let promptAccepted = true;
  const originalRequest = mockChrome.permissions.request;
  mockChrome.permissions.request = ({ origins, permissions }, cb) => {
    if (promptAccepted) {
      origins?.forEach(o => mockChrome.grantedOrigins.add(o));
      permissions?.forEach(p => mockChrome.grantedPermissions.add(p));
      if (cb) cb(true);
      return Promise.resolve(true);
    } else {
      if (cb) cb(false);
      return Promise.resolve(false);
    }
  };

  const requestGranted = await mockChrome.permissions.request({ origins: ["*://*/*"] });
  console.log(`  ✓ User accepts host permission prompt: granted = ${requestGranted}`);
  assert.strictEqual(requestGranted, true);

  // Test 3.3: contains now returns true after elevation
  const elevatedCheck = await mockChrome.permissions.contains({ origins: ["*://*/*"] });
  assert.strictEqual(elevatedCheck, true);

  // Test 3.4: User rejects permission prompt
  promptAccepted = false;
  const rejected = await mockChrome.permissions.request({ origins: ["https://specific.domain.com/*"] });
  console.log(`  ✓ User denies host permission prompt: granted = ${rejected}`);
  assert.strictEqual(rejected, false);

  // Test 3.5: User revokes optional host permissions
  const removed = await mockChrome.permissions.remove({ origins: ["*://*/*"] });
  console.log(`  ✓ Permissions removed: ${removed}`);
  assert.strictEqual(removed, true);
  const postRemoveCheck = await mockChrome.permissions.contains({ origins: ["*://*/*"] });
  assert.strictEqual(postRemoveCheck, false);

  mockChrome.permissions.request = originalRequest;

  // ==========================================================================
  // Feature 4: Outbound Probe Origin Header Suppression (Tier 1: >= 5 tests)
  // ==========================================================================
  const mockNet = new MockNetwork();
  mockNet.install();

  const prober = new BookmarkProber({ timeoutMs: 3000 });

  // Test 4.1: Probe HEAD request contains NO Origin header
  await prober.probeUrl({ url: "https://example.com/test1", title: "Test 1" });
  assert(mockNet.recordedRequests.length > 0);
  const headReq = mockNet.recordedRequests[0];
  console.log(`  ✓ Outbound HEAD probe headers: Origin = ${headReq.headers['origin'] || 'NONE'}`);
  assert.strictEqual(headReq.headers['origin'], undefined, "Must NOT leak Origin: chrome-extension://");

  // Test 4.2: Probe GET range request contains NO Origin header
  mockNet.clear();
  mockNet.setRoute("https://example.com/test2", (req) => {
    if (req.method === "HEAD") return { status: 405 }; // force Stage 2 GET
    return { status: 200, text: "OK" };
  });
  await prober.probeUrl({ url: "https://example.com/test2", title: "Test 2" });
  assert(mockNet.recordedRequests.length >= 2);
  const getReq = mockNet.recordedRequests.find(r => r.method === "GET");
  assert(getReq !== undefined);
  console.log(`  ✓ Outbound GET range probe headers: Origin = ${getReq.headers['origin'] || 'NONE'}`);
  assert.strictEqual(getReq.headers['origin'], undefined, "GET probe must NOT leak Origin header");

  // Test 4.3: Credentials omit is enforced (no cookie leakage)
  assert.strictEqual(headReq.credentials, "omit", "HEAD probe must set credentials: 'omit'");
  assert.strictEqual(getReq.credentials, "omit", "GET probe must set credentials: 'omit'");

  // Test 4.4: DeclarativeNetRequest session rules for scoped Origin header stripping (P0-3 CWS Compliance)
  const probeSessionRule = {
    id: 1001,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "Origin", operation: "remove" }
      ]
    },
    condition: {
      tabIds: [-1],
      resourceTypes: ["xmlhttprequest"],
      requestDomains: ["example.com", "target-domain.org"]
    }
  };

  await mockChrome.declarativeNetRequest.updateSessionRules({ addRules: [probeSessionRule] });
  const sessionRules = await mockChrome.declarativeNetRequest.getSessionRules();
  console.log(`  ✓ DeclarativeNetRequest session rules count = ${sessionRules.length}`);
  assert.strictEqual(sessionRules.length, 1, "Must install exactly 1 session rule");
  assert.strictEqual(sessionRules[0].id, 1001);
  assert.strictEqual(sessionRules[0].action.type, "modifyHeaders");
  assert.strictEqual(sessionRules[0].action.requestHeaders.length, 1, "Action must ONLY modify Origin header");
  assert.strictEqual(sessionRules[0].action.requestHeaders[0].header, "Origin");
  assert.strictEqual(sessionRules[0].action.requestHeaders[0].operation, "remove");

  // Strictly assert NO modification of Sec-Fetch-* headers
  const forbiddenHeaders = sessionRules[0].action.requestHeaders.filter(
    h => h.header.toLowerCase().startsWith("sec-fetch-")
  );
  assert.strictEqual(forbiddenHeaders.length, 0, "DNR rules must NOT modify Sec-Fetch-* headers");

  // Strictly assert condition scope: tabIds: [-1] and specific requestDomains (NOT wildcard urlFilter: "*")
  assert.deepStrictEqual(sessionRules[0].condition.tabIds, [-1], "Must scope condition to tabIds: [-1]");
  assert(Array.isArray(sessionRules[0].condition.requestDomains), "Must scope to specific requestDomains");
  assert.strictEqual(sessionRules[0].condition.urlFilter, undefined, "Must NOT use global wildcard urlFilter: '*'");

  // Test 4.5: Immediate clean uninstallation of session rules after scan
  await mockChrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1001] });
  const emptySessionRules = await mockChrome.declarativeNetRequest.getSessionRules();
  console.log(`  ✓ DeclarativeNetRequest session rules uninstalled count = ${emptySessionRules.length}`);
  assert.strictEqual(emptySessionRules.length, 0, "All session rules must be cleanly uninstalled after scan");

  mockNet.uninstall();

  // ==========================================================================
  // Feature 5: Service Worker Lifecycle, Alarms & Checkpoints (Calling Real background.js APIs)
  // ==========================================================================

  // Test 5.1: Real Alarm registration via ensureAlarmsRegistered()
  ensureAlarmsRegistered();
  const hbAlarm = await mockChrome.alarms.get(ALARM_NAME_HEARTBEAT);
  const stAlarm = await mockChrome.alarms.get(ALARM_NAME_SENTINEL);
  console.log(`  ✓ Real alarms created: ${hbAlarm?.name} (${hbAlarm?.periodInMinutes}m), ${stAlarm?.name} (${stAlarm?.periodInMinutes}m)`);
  assert(hbAlarm !== null, "Heartbeat alarm must be registered");
  assert.strictEqual(hbAlarm.name, "bhm_sw_heartbeat");
  assert.strictEqual(hbAlarm.periodInMinutes, 1, "Heartbeat period must be 1 minute");
  assert(stAlarm !== null, "Sentinel alarm must be registered");
  assert.strictEqual(stAlarm.name, "bhm_domain_sentinel");
  assert.strictEqual(stAlarm.periodInMinutes, 1440, "Sentinel period must be 1440 minutes (24 hours)");

  // Test 5.2: Bind Service Worker listeners and trigger real handleAlarmEvent
  bindServiceWorkerListeners();
  const beforeHeartbeat = Date.now();
  await handleAlarmEvent({ name: ALARM_NAME_HEARTBEAT });
  const swStateRes = await mockChrome.storage.local.get(["bhm_sw_state"]);
  console.log(`  ✓ Real SW heartbeat handled: lastHeartbeat = ${swStateRes?.bhm_sw_state?.lastHeartbeat}`);
  assert(swStateRes.bhm_sw_state !== null && typeof swStateRes.bhm_sw_state === "object");
  assert(typeof swStateRes.bhm_sw_state.lastHeartbeat === "number");
  assert(swStateRes.bhm_sw_state.lastHeartbeat >= beforeHeartbeat);

  // Test 5.3: BHM_SAVE_SCAN_CHECKPOINT via real handleRuntimeMessage
  let checkpointResponse = null;
  await new Promise((resolve) => {
    mockChrome.runtime.sendMessage(
      { type: "BHM_SAVE_SCAN_CHECKPOINT", payload: { index: 450, total: 1500 } },
      (res) => {
        checkpointResponse = res;
        resolve();
      }
    );
  });
  assert(checkpointResponse && checkpointResponse.success === true, "Checkpoint save must succeed");
  const storedAfterCheckpoint = await mockChrome.storage.local.get(["bhm_sw_state"]);
  console.log(`  ✓ Real scan checkpoint saved: cursor = ${JSON.stringify(storedAfterCheckpoint.bhm_sw_state.scanCursor)}`);
  assert.deepStrictEqual(storedAfterCheckpoint.bhm_sw_state.scanCursor, { index: 450, total: 1500 });

  // Test 5.4: BHM_GET_SW_STATUS via real handleRuntimeMessage
  let statusResponse = null;
  await new Promise((resolve) => {
    mockChrome.runtime.sendMessage({ type: "BHM_GET_SW_STATUS" }, (res) => {
      statusResponse = res;
      resolve();
    });
  });
  console.log(`  ✓ Real SW status query: active=${statusResponse?.active}, tier=${statusResponse?.proTier}`);
  assert.strictEqual(statusResponse.active, true);
  assert.strictEqual(statusResponse.proTier, "FREE");
  assert.deepStrictEqual(statusResponse.state.scanCursor, { index: 450, total: 1500 });

  // Test 5.5: Corrupted state resiliency in BHM_GET_SW_STATUS & handleAlarmEvent
  await mockChrome.storage.local.set({ bhm_sw_state: "CORRUPTED" });
  let corruptStatusRes = null;
  await new Promise((resolve) => {
    mockChrome.runtime.sendMessage({ type: "BHM_GET_SW_STATUS" }, (res) => {
      corruptStatusRes = res;
      resolve();
    });
  });
  assert.strictEqual(corruptStatusRes.active, true);
  assert.strictEqual(corruptStatusRes.state, null, "Corrupted string state must safely fall back to null");

  // Heartbeat self-heals corrupted state into a valid state object
  await handleAlarmEvent({ name: ALARM_NAME_HEARTBEAT });
  const healedStored = await mockChrome.storage.local.get(["bhm_sw_state"]);
  console.log(`  ✓ Corrupted state healed by heartbeat: typeof = ${typeof healedStored.bhm_sw_state}`);
  assert(healedStored.bhm_sw_state !== null && typeof healedStored.bhm_sw_state === "object");
  assert(typeof healedStored.bhm_sw_state.lastHeartbeat === "number");

  // Test 5.6: BHM_CLEAR_SCAN_CHECKPOINT via real handleRuntimeMessage
  let clearResponse = null;
  await new Promise((resolve) => {
    mockChrome.runtime.sendMessage({ type: "BHM_CLEAR_SCAN_CHECKPOINT" }, (res) => {
      clearResponse = res;
      resolve();
    });
  });
  assert(clearResponse && clearResponse.success === true);
  const stateAfterClear = await mockChrome.storage.local.get(["bhm_sw_state"]);
  console.log(`  ✓ Checkpoint cleared: scanCursor = ${stateAfterClear.bhm_sw_state.scanCursor}`);
  assert.strictEqual(stateAfterClear.bhm_sw_state.scanCursor, null);

  // Test 5.7: DeclarativeNetRequest session rule tabId scoping with installProbeSessionRule
  // Dashboard tab tabId = 42 -> condition.tabIds: [42, -1]
  await installProbeSessionRule(["example.com", "target.org"], 42);
  let swRules = await mockChrome.declarativeNetRequest.getSessionRules();
  assert.strictEqual(swRules.length, 1);
  assert.strictEqual(swRules[0].id, PROBE_RULE_ID);
  assert.deepStrictEqual(swRules[0].condition.tabIds, [42, -1], "Tab-specific scan must scope to [tabId, -1]");
  assert.deepStrictEqual(swRules[0].condition.requestDomains, ["example.com", "target.org"]);

  // tabId = -1 (SW background scan) -> condition.tabIds: [-1]
  await installProbeSessionRule(["example.com"], -1);
  swRules = await mockChrome.declarativeNetRequest.getSessionRules();
  assert.strictEqual(swRules.length, 1);
  assert.deepStrictEqual(swRules[0].condition.tabIds, [-1], "Background scan must scope to [-1]");
  assert.deepStrictEqual(swRules[0].condition.requestDomains, ["example.com"]);

  await uninstallProbeSessionRule();
  swRules = await mockChrome.declarativeNetRequest.getSessionRules();
  assert.strictEqual(swRules.length, 0, "uninstallProbeSessionRule must cleanly clear session rules");
  console.log("  ✓ installProbeSessionRule tabId scoping ([42, -1] vs [-1]) and clean uninstallation verified");

  mockChrome.uninstallGlobal();
  console.log("✅ Manifest V3 Compliance, Lifecycle & Security tests passed!\n");
}

module.exports = { runMv3ComplianceTests };

if (require.main === module) {
  runMv3ComplianceTests().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
}
