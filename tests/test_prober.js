const assert = require("node:assert");
const { BookmarkProber } = require("../bookmark-organizer/core/prober.js");
const { MockNetwork } = require("./helpers/mock_network.js");
const { MockChrome } = require("./helpers/mock_chrome.js");

async function runProberTests() {
  console.log("▶ [Test Suite] BookmarkProber Engine, RFC1918 Shielding & DoH Tests");

  // --------------------------------------------------------------------------
  // Test 1: Calculate Health Score (Tier 1 & PA-6 Strict Assertion)
  // --------------------------------------------------------------------------
  const sampleResults = [
    { status: "HEALTHY", httpCode: 200 },
    { status: "HEALTHY", httpCode: 200 },
    { status: "HEALTHY", httpCode: 200 },
    { status: "HEALTHY", httpCode: 200 },
    { status: "DEAD", httpCode: 404 },
    { status: "DEAD", httpCode: 0 },
    { status: "SKIPPED_INTERNAL", httpCode: 0 },
    { status: "SKIPPED_DANGEROUS", httpCode: 0 }
  ];
  const score = BookmarkProber.calculateHealthScore(sampleResults);
  console.log(`  ✓ Health Score calculation: ${score}/100 (Internal & Dangerous skipped from penalty)`);
  // PA-6 Fix: 6 effective items (4 healthy, 2 dead), penalty = (2 * 2.5) / 6 = 5/6 = 0.8333... -> score is exactly 17
  assert.strictEqual(score, 17, "Health score for sampleResults must be exactly 17");

  // Verify empty results returns 100
  assert.strictEqual(BookmarkProber.calculateHealthScore([]), 100);
  // Verify only internal items returns 100
  assert.strictEqual(BookmarkProber.calculateHealthScore([{ status: "SKIPPED_INTERNAL", httpCode: 0 }]), 100);

  // --------------------------------------------------------------------------
  // Test 2: Protocol Skipping (Tier 1)
  // --------------------------------------------------------------------------
  const prober = new BookmarkProber({ timeoutMs: 2000 });
  const skippedChrome = await prober.probeUrl({ url: "chrome://bookmarks", name: "Chrome Bookmarks" });
  console.log(`  ✓ Protocol skipping test: ${skippedChrome.status}`);
  assert.strictEqual(skippedChrome.status, "SKIPPED");

  // --------------------------------------------------------------------------
  // Test 3: RFC1918 & Extended Private Subnet & Localhost Shielding (P0-8 Hardening)
  // --------------------------------------------------------------------------
  const intranetUrls = [
    // Standard RFC1918
    "http://localhost:3000/dev",
    "http://127.0.0.1:8080/api",
    "http://10.0.4.12/internal-service",
    "http://172.16.0.1:9000/cluster",
    "http://172.24.100.5/admin",
    "http://172.31.255.254/status",
    "http://192.168.1.1/router-login",
    "http://192.168.10.50:8443/app",
    // 169.254.0.0/16 Link-Local / Cloud Metadata
    "http://169.254.169.254/latest/meta-data/",
    "http://169.254.1.25:8080/health",
    // 100.64.0.0/10 CGNAT / Tailscale
    "http://100.64.0.1/status",
    "http://100.101.102.103:8080/dashboard",
    "http://100.127.255.254/internal",
    // 198.18.0.0/15 Benchmarking / Inter-network
    "http://198.18.0.1/benchmark",
    "http://198.19.100.50/proxy",
    // IPv6 Private & Loopback (with bracket syntax)
    "http://[::1]:8080/api",
    "http://[fc00::1]/service",
    "http://[fd12:3456:789a::1]:3000/dashboard",
    "http://[fe80::1ff:fe00:1]/device",
    "http://[2001:db8::1]/doc",
    "http://[::ffff:192.168.1.1]/setup",
    // Enterprise & local TLDs
    "http://jenkins.local/job/build",
    "http://confluence.internal/pages",
    "http://auth.corp/sso",
    "http://nas.lan/storage",
    "http://gitlab/developer/repo"
  ];

  for (const u of intranetUrls) {
    const isIntranet = BookmarkProber.isIntranetUrl(u);
    assert.strictEqual(isIntranet, true, `URL should be identified as intranet: ${u}`);
    const probeRes = await prober.probeUrl({ url: u, title: "Intranet Item" });
    assert.strictEqual(probeRes.status, "SKIPPED_INTERNAL", `Prober must return SKIPPED_INTERNAL for: ${u}`);
    assert.strictEqual(probeRes.httpCode, 0);
  }
  console.log(`  ✓ RFC1918 & Extended private subnets verified across ${intranetUrls.length} internal formats`);

  // Verify public URLs and public IPv6 (with brackets) are NOT shielded
  assert.strictEqual(BookmarkProber.isIntranetUrl("https://google.com"), false);
  assert.strictEqual(BookmarkProber.isIntranetUrl("https://172.15.255.254"), false);
  assert.strictEqual(BookmarkProber.isIntranetUrl("https://172.32.0.1"), false);
  assert.strictEqual(BookmarkProber.isIntranetUrl("https://github.com"), false);
  assert.strictEqual(BookmarkProber.isIntranetUrl("http://100.63.255.255/"), false); // Before CGNAT
  assert.strictEqual(BookmarkProber.isIntranetUrl("http://100.128.0.1/"), false);    // After CGNAT
  assert.strictEqual(BookmarkProber.isIntranetUrl("http://198.17.255.254/"), false); // Before Benchmarking
  assert.strictEqual(BookmarkProber.isIntranetUrl("http://198.20.0.1/"), false);     // After Benchmarking

  // P0-8: Public IPv6 literal with brackets MUST NOT be misclassified as intranet
  const publicIpv6Urls = [
    "http://[2606:4700:4700::1111]/",
    "https://[2001:4860:4860::8888]:443/dns-query",
    "http://[2400:cb00:2048:1::c629:d7a2]/index.html"
  ];
  for (const u of publicIpv6Urls) {
    const isIntranet = BookmarkProber.isIntranetUrl(u);
    assert.strictEqual(isIntranet, false, `Public IPv6 address must NOT be classified as intranet: ${u}`);
  }
  console.log(`  ✓ Public IPv6 literal address passthrough verified across ${publicIpv6Urls.length} public IPv6 endpoints`);

  // --------------------------------------------------------------------------
  // Test 4: Dangerous Side-Effect URL Skipping (Tier 1)
  // --------------------------------------------------------------------------
  const dangerousUrls = [
    "https://auth.example.com/logout?redirect=home",
    "https://service.com/api/sign_out",
    "https://newsletter.org/unsubscribe?token=abc",
    "https://forum.net/user/delete_account",
    "https://app.com/reset_password?id=123"
  ];

  for (const du of dangerousUrls) {
    assert.strictEqual(BookmarkProber.isDangerousActionUrl(du), true);
    const dRes = await prober.probeUrl({ url: du, title: "Dangerous Action" });
    assert.strictEqual(dRes.status, "SKIPPED_DANGEROUS");
    assert.strictEqual(dRes.httpCode, 0);
  }
  console.log(`  ✓ Dangerous action URL shielding verified across ${dangerousUrls.length} mutation patterns`);

  // --------------------------------------------------------------------------
  // Test 5: Cloudflare DoH NXDOMAIN Cross-Validation (Tier 1 & Tier 2)
  // --------------------------------------------------------------------------
  const mockNet = new MockNetwork();
  mockNet.install();

  // Scenario A: Candidate domain is truly dead (DoH Status 3 NXDOMAIN)
  mockNet.setDoHResult("dead-domain-999.xyz", { status: 3 });
  const dohResultDead = await BookmarkProber.verifyDomainDns("dead-domain-999.xyz");
  console.log(`  ✓ DoH NXDOMAIN query test: isNxDomain = ${dohResultDead.isNxDomain}`);
  assert.strictEqual(dohResultDead.isNxDomain, true);

  // Test prober end-to-end with network error falling through to DoH NXDOMAIN
  mockNet.setRoute("https://dead-domain-999.xyz", () => {
    throw new Error("getaddrinfo ENOTFOUND dead-domain-999.xyz");
  });
  const probeDeadRes = await prober.probeUrl({ url: "https://dead-domain-999.xyz/home", title: "Defunct Site" });
  console.log(`  ✓ Prober with DoH NXDOMAIN confirmed DEAD: status=${probeDeadRes.status}, reason=${probeDeadRes.reason}`);
  assert.strictEqual(probeDeadRes.status, "DEAD");
  assert(probeDeadRes.reason.includes("NXDOMAIN"));

  // Scenario B: Candidate domain resolves via DNS (DoH Status 0 NOERROR with IP),
  // but HTTP probe timed out or was blocked by WAF -> MUST NOT be marked DEAD!
  mockNet.setDoHResult("active-corp-vpn.com", { status: 0, answers: [{ name: "active-corp-vpn.com", type: 1, TTL: 300, data: "198.51.100.10" }] });
  mockNet.setRoute("https://active-corp-vpn.com", () => {
    throw new Error("ETIMEDOUT");
  });
  const probeProtectedRes = await prober.probeUrl({ url: "https://active-corp-vpn.com/login", title: "VPN Portal" });
  console.log(`  ✓ Prober with DoH NOERROR preserved: status=${probeProtectedRes.status}`);
  assert.strictEqual(probeProtectedRes.status, "UNREACHABLE_OR_PROTECTED", "Domain resolving via DNS must NEVER be marked as DEAD");

  // Scenario C: DoH query itself fails (network timeout / server 500) -> fail-safe protection
  mockNet.setDoHResult("intermittent-service.com", { error: "Network Aborted" });
  mockNet.setRoute("https://intermittent-service.com", () => {
    throw new Error("Connection reset");
  });
  const probeFailSafeRes = await prober.probeUrl({ url: "https://intermittent-service.com", title: "Flaky Server" });
  console.log(`  ✓ DoH network error fail-safe: status=${probeFailSafeRes.status}`);
  assert.strictEqual(probeFailSafeRes.status, "UNREACHABLE_OR_PROTECTED");
  assert.notStrictEqual(probeFailSafeRes.status, "DEAD");

  // --------------------------------------------------------------------------
  // Test 6: Concurrency Batch Queue
  // --------------------------------------------------------------------------
  const dummyItems = [
    { url: "javascript:void(0)", name: "JS Void" },
    { url: "data:text/html,test", name: "Data URI" },
    { url: "about:blank", name: "Blank" }
  ];
  const batchResults = await prober.probeAll(dummyItems);
  console.log(`  ✓ Batch queue handled ${batchResults.length} items`);
  assert.strictEqual(batchResults.length, 3);

  // --------------------------------------------------------------------------
  // Test 7: TCP Socket Leak Prevention via Stream Cancellation (P0-9 Verification)
  // --------------------------------------------------------------------------
  // Test 7.1: Direct _fetchWithTimeout stream cancellation
  mockNet.setRoute("https://socket-leak-test.com/stream", {
    status: 200,
    text: "Long response content stream that must be cancelled early"
  });

  const fetchStreamRes = await prober._fetchWithTimeout("https://socket-leak-test.com/stream", { method: "GET" }, 2000);
  console.log(`  ✓ _fetchWithTimeout stream cancellation: streamCancelled = ${fetchStreamRes.streamCancelled}`);
  assert.strictEqual(fetchStreamRes.status, 200);
  assert.strictEqual(fetchStreamRes.streamCancelled, true, "fetch response stream reader.cancel() must be called in finally block");

  // Test 7.2: probeUrl end-to-end stream cancellation
  const probeStreamRes = await prober.probeUrl({ url: "https://socket-leak-test.com/stream", title: "Socket Test" });
  console.log(`  ✓ probeUrl stream cancellation: status = ${probeStreamRes.status}, streamCancelled = ${probeStreamRes.streamCancelled}`);
  assert.strictEqual(probeStreamRes.status, "HEALTHY");
  assert.strictEqual(probeStreamRes.streamCancelled, true, "probeUrl result must indicate response stream was cancelled");

  mockNet.uninstall();

  // --------------------------------------------------------------------------
  // Test 8: DeclarativeNetRequest Session Rules Isolation & Narrowing (P0-3 Verification)
  // --------------------------------------------------------------------------
  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  // Require background.js with mock environment active
  const bg = require("../bookmark-organizer/background.js");

  // Test 8.1: Install session rules scoped to tabIds: [-1], resourceTypes: ["xmlhttprequest"], and domains
  const targetDomains = ["example.com", "https://api.github.com/v1", "probe-target.org"];
  await bg.installProbeSessionRule(targetDomains, -1);

  const sessionRules = await mockChrome.declarativeNetRequest.getSessionRules();
  console.log(`  ✓ Session DNR rules count = ${sessionRules.length}`);
  assert.strictEqual(sessionRules.length, 1, "Exactly 1 session DNR rule must be installed");
  assert.strictEqual(sessionRules[0].id, bg.PROBE_RULE_ID);

  // Verify scope narrowing
  const ruleCond = sessionRules[0].condition;
  assert.deepStrictEqual(ruleCond.tabIds, [-1], "DNR rule must be strictly scoped to tabIds: [-1]");
  assert.deepStrictEqual(ruleCond.resourceTypes, ["xmlhttprequest"], "DNR rule must only apply to xmlhttprequest");
  assert(ruleCond.requestDomains.includes("example.com"), "requestDomains must include target domains");
  assert(ruleCond.requestDomains.includes("api.github.com"), "requestDomains must normalize URLs to hostnames");
  assert(ruleCond.requestDomains.includes("probe-target.org"), "requestDomains must include target domains");
  assert.strictEqual(ruleCond.urlFilter, undefined, "DNR rule MUST NOT use wildcard urlFilter: '*'");

  // Verify header action hygiene (ONLY Origin removal, NEVER touch Sec-Fetch-*)
  const ruleAction = sessionRules[0].action;
  assert.strictEqual(ruleAction.type, "modifyHeaders");
  assert.strictEqual(ruleAction.requestHeaders.length, 1, "Action must ONLY contain 1 header modification");
  assert.strictEqual(ruleAction.requestHeaders[0].header, "Origin");
  assert.strictEqual(ruleAction.requestHeaders[0].operation, "remove");

  const touchesSecFetch = ruleAction.requestHeaders.some(h => h.header.toLowerCase().startsWith("sec-fetch"));
  assert.strictEqual(touchesSecFetch, false, "DNR rule MUST NOT modify or touch Sec-Fetch-* headers");

  // Test 8.2: Uninstall session rules
  await bg.uninstallProbeSessionRule();
  const emptySessionRules = await mockChrome.declarativeNetRequest.getSessionRules();
  console.log(`  ✓ Session DNR rules uninstalled count = ${emptySessionRules.length}`);
  assert.strictEqual(emptySessionRules.length, 0, "Session DNR rules must be cleanly uninstalled post-scan");

  // Test 8.3: Dynamic rules remain completely untouched (0 permanent dynamic rules)
  const dynamicRules = await mockChrome.declarativeNetRequest.getDynamicRules();
  assert.strictEqual(dynamicRules.length, 0, "No permanent dynamic DNR rules should be installed");

  // Test 8.4: Message dispatcher installation & uninstallation
  await new Promise((resolve) => {
    mockChrome.runtime.sendMessage({
      type: "BHM_INSTALL_PROBE_RULES",
      payload: { domains: ["dispatched-target.net"] }
    }, (res) => {
      assert.strictEqual(res.success, true);
      resolve();
    });
  });

  const dispatchedRules = await mockChrome.declarativeNetRequest.getSessionRules();
  assert.strictEqual(dispatchedRules.length, 1);
  assert(dispatchedRules[0].condition.requestDomains.includes("dispatched-target.net"));

  await new Promise((resolve) => {
    mockChrome.runtime.sendMessage({
      type: "BHM_CHECK_ORIGIN_RULE"
    }, (res) => {
      assert.strictEqual(res.ruleActive, true);
      resolve();
    });
  });

  await new Promise((resolve) => {
    mockChrome.runtime.sendMessage({
      type: "BHM_UNINSTALL_PROBE_RULES"
    }, (res) => {
      assert.strictEqual(res.success, true);
      resolve();
    });
  });

  const postUninstallRules = await mockChrome.declarativeNetRequest.getSessionRules();
  assert.strictEqual(postUninstallRules.length, 0);

  await new Promise((resolve) => {
    mockChrome.runtime.sendMessage({
      type: "BHM_CHECK_ORIGIN_RULE"
    }, (res) => {
      assert.strictEqual(res.ruleActive, false);
      resolve();
    });
  });
  console.log("  ✓ Message dispatch bus for DNR session rules installation & uninstallation verified");

  mockChrome.uninstallGlobal();
  console.log("✅ BookmarkProber, RFC1918, DoH & DNR Session Isolation tests passed!\n");
}

module.exports = { runProberTests };

if (require.main === module) {
  runProberTests().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
}
