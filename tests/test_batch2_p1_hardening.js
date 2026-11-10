// ============================================================================
// Batch 2 P1/P2 Hardening Regression Test Suite (Suite 11)
// Rigorous assertions for Netscape HTML restore, Move Journal enrichment,
// Atomic host throttling, DoH 503 error handling, in-flight abort, and ZIP purity.
// ============================================================================

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { MockChrome } = require("./helpers/mock_chrome.js");
const { MockNetwork } = require("./helpers/mock_network.js");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");
const { BookmarkProber } = require("../bookmark-organizer/core/prober.js");
const {
  installProbeSessionRule,
  uninstallProbeSessionRule
} = require("../bookmark-organizer/background.js");

/**
 * 纯原生零依赖 PKZIP 校验函数：从 ZIP 二进制 Buffer 中提取所有 Central Directory 文件名
 * @param {Buffer} zipBuffer
 * @returns {string[]}
 */
function extractZipEntryPaths(zipBuffer) {
  const entries = [];
  let offset = 0;
  while (offset < zipBuffer.length - 4) {
    const sig = zipBuffer.readUInt32LE(offset);
    if (sig === 0x02014b50) {
      // Central directory file header
      const fileNameLen = zipBuffer.readUInt16LE(offset + 28);
      const extraLen = zipBuffer.readUInt16LE(offset + 30);
      const commentLen = zipBuffer.readUInt16LE(offset + 32);
      const name = zipBuffer.toString("utf8", offset + 46, offset + 46 + fileNameLen);
      entries.push(name);
      offset += 46 + fileNameLen + extraLen + commentLen;
    } else if (sig === 0x06054b50) {
      // End of central directory record
      break;
    } else {
      offset++;
    }
  }
  return entries;
}

async function runBatch2P1HardeningTests() {
  console.log("================================================================================");
  console.log("▶ [Test Suite 11] Batch 2 P1/P2 Hardening: Snapshot, Throttle & ZIP Purity");
  console.log("================================================================================");

  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  const mockNet = new MockNetwork();
  mockNet.install();

  try {
    // ========================================================================
    // 1. Netscape HTML 标准与快照解析恢复闭环 (core/safety.js)
    // ========================================================================
    console.log("\n[Sub-test 1/4] Netscape HTML Standard Timestamp & Snapshot Restore Loop");

    const sampleTree = {
      id: "1",
      title: "书签栏",
      dateAdded: 1730000000123, // 毫秒级 13 位时间戳
      children: [
        {
          id: "folder_dev",
          title: "嵌套分类 & \"Special Category\"",
          children: [
            {
              id: "bm_doc",
              title: "文档 & \"API Reference\" <Guide>",
              url: "https://example.com/api?name=doc&query=\"test\"&version=2"
            }
          ]
        }
      ]
    };

    // 1.1: 序列化 Netscape HTML
    const html = SafetyManager.serializeToNetscapeHtml(sampleTree);
    console.log(`  ✓ Serialized Netscape HTML (length: ${html.length} chars)`);

    // 断言 10 位秒级时间戳，杜绝 13 位毫秒溢出
    assert(
      html.includes('ADD_DATE="1730000000"'),
      "ADD_DATE must be normalized to standard 10-digit unix seconds (1730000000)"
    );
    assert(
      !html.includes('ADD_DATE="1730000000123"'),
      "ADD_DATE must NOT contain 13-digit millisecond timestamp (1730000000123)"
    );

    // 断言书签栏属性
    assert(
      html.includes('PERSONAL_TOOLBAR_FOLDER="true"'),
      "Bookmarks bar must contain PERSONAL_TOOLBAR_FOLDER=\"true\" attribute"
    );
    assert(
      html.includes('LAST_MODIFIED="1730000000"'),
      "Bookmarks bar must contain valid LAST_MODIFIED unix seconds attribute"
    );

    // 断言特殊字符 HTML 转义
    assert(html.includes("&amp;"), "Special character '&' must be escaped as &amp;");
    assert(html.includes("&quot;"), "Double quote '\"' must be escaped as &quot;");
    assert(html.includes("&lt;"), "Angle bracket '<' must be escaped as &lt;");

    // 1.2: 正向解析 Netscape HTML 文本为结构化树
    const parsedNodes = SafetyManager.parseNetscapeHtml(html);
    assert(Array.isArray(parsedNodes) && parsedNodes.length > 0, "Parsed result must be non-empty array");
    const barNode = parsedNodes[0];
    assert.strictEqual(barNode.title, "书签栏", "Root title should match");
    assert.strictEqual(barNode.children.length, 1, "Should have 1 child folder");
    const subFolder = barNode.children[0];
    assert.strictEqual(subFolder.title, "嵌套分类 & \"Special Category\"", "Folder title unescaped correctly");
    assert.strictEqual(subFolder.children.length, 1, "Subfolder should have 1 child bookmark");
    const subBookmark = subFolder.children[0];
    assert.strictEqual(subBookmark.title, "文档 & \"API Reference\" <Guide>", "Bookmark title unescaped correctly");
    assert.strictEqual(
      subBookmark.url,
      "https://example.com/api?name=doc&query=\"test\"&version=2",
      "Bookmark URL unescaped correctly"
    );
    console.log("  ✓ ParseNetscapeHtml parses nested folders & unescapes special characters with 100% fidelity");

    // 1.3: 快照创建与实际书签栏恢复闭环
    const safety = new SafetyManager(mockChrome.storage.local);
    const snap = await safety.createSnapshot(sampleTree, "P1加固验证快照");
    assert(snap && snap.id.startsWith("snap_"), "Snapshot ID must be generated");
    assert.strictEqual(snap.label, "P1加固验证快照");

    const restoreRes = await safety.restoreSnapshot(snap.id);
    console.log(`  ✓ Snapshot restored: restoredCount=${restoreRes.restoredCount}, folderCount=${restoreRes.folderCount}, rootTitle=${restoreRes.rootTitle}`);
    assert.strictEqual(restoreRes.success, true, "Restore operation must succeed");
    assert.strictEqual(restoreRes.restoredCount, 1, "Must restore exactly 1 bookmark");
    assert.strictEqual(restoreRes.folderCount, 1, "Must restore exactly 1 subfolder");
    assert(restoreRes.rootTitle.includes("🕰️ [快照恢复]"), "Restored root title must have restore emoji prefix");

    // 1.4: 校验 MockChrome 书签栏目录真实树结构
    const mockBar = mockChrome.nodesById.get("1");
    assert(mockBar && Array.isArray(mockBar.children), "Bookmarks Bar must exist in MockChrome");
    const createdRoot = mockBar.children.find(c => c.id === restoreRes.rootFolderId);
    assert(createdRoot !== undefined, "Restored safe folder must be created under Bookmarks Bar (id: 1)");
    assert.strictEqual(createdRoot.children.length, 1, "Restored safe folder must contain 1 subfolder");
    const restoredNestedFolder = createdRoot.children[0];
    assert.strictEqual(
      restoredNestedFolder.title,
      "嵌套分类 & \"Special Category\"",
      "Nested folder title in MockChrome tree must match"
    );
    assert.strictEqual(restoredNestedFolder.children.length, 1, "Nested folder must contain 1 restored bookmark");
    const restoredDocBm = restoredNestedFolder.children[0];
    assert.strictEqual(
      restoredDocBm.title,
      "文档 & \"API Reference\" <Guide>",
      "Restored bookmark title must match"
    );
    assert.strictEqual(
      restoredDocBm.url,
      "https://example.com/api?name=doc&query=\"test\"&version=2",
      "Restored bookmark URL must match"
    );
    console.log("  ✓ Full Netscape snapshot creation and restoration loop verified under Bookmarks Bar");

    // ========================================================================
    // 2. recordJournal 自动补全 oldChildren 回归 (core/safety.js)
    // ========================================================================
    console.log("\n[Sub-test 2/4] recordJournal oldChildren Context Auto-enrichment");

    // 在 MockChrome 中真实创建待测试书签
    const bmToJournal = await mockChrome.bookmarks.create({
      parentId: "1",
      title: "待迁移测试书签",
      url: "https://journal-audit.example.com"
    });

    // 模拟入参缺失 oldChildren 的场景
    const incompleteMoves = [
      {
        id: bmToJournal.id,
        oldParentId: "1"
        // oldChildren 缺失
      }
    ];

    const recordedJournal = await safety.recordJournal("QUARANTINE_DEAD", incompleteMoves);
    console.log(`  ✓ Move Journal recorded: ID=${recordedJournal.id}, count=${recordedJournal.count}`);
    assert(recordedJournal && Array.isArray(recordedJournal.moves), "Journal moves must be an array");
    assert.strictEqual(recordedJournal.moves.length, 1, "Journal moves must have 1 entry");

    const enrichedMove = recordedJournal.moves[0];
    assert(
      Array.isArray(enrichedMove.oldChildren),
      "oldChildren must be auto-enriched into an array by recordJournal"
    );
    assert(
      enrichedMove.oldChildren.length > 0,
      "enriched oldChildren array must not be empty"
    );
    assert(
      enrichedMove.oldChildren.includes(bmToJournal.id),
      "enriched oldChildren must include target bookmark id"
    );
    assert.strictEqual(
      typeof enrichedMove.oldIndex,
      "number",
      "oldIndex must be auto-enriched as number"
    );
    console.log(`  ✓ oldChildren enriched successfully: length=${enrichedMove.oldChildren.length}, oldIndex=${enrichedMove.oldIndex}`);

    // ========================================================================
    // 3. Prober 原子化同域节流锁、协议大小写、DoH 503 与在飞请求取消 (core/prober.js)
    // ========================================================================
    console.log("\n[Sub-test 3/4] Prober Atomic Throttle, Protocol Casing, DoH 503 & Abort");

    // 3.1: 同域原子化串行排队与平滑节流锁
    const hostHitTimestamps = [];
    mockNet.setRoute("https://rate-test.example.com", async () => {
      hostHitTimestamps.push(Date.now());
      return { status: 200, text: "OK" };
    });

    const rateProber = new BookmarkProber({ minHostIntervalMs: 60, concurrency: 6 });
    const sameHostItems = [
      { url: "https://rate-test.example.com/p1" },
      { url: "https://rate-test.example.com/p2" },
      { url: "https://rate-test.example.com/p3" },
      { url: "https://rate-test.example.com/p4" },
      { url: "https://rate-test.example.com/p5" }
    ];

    await rateProber.probeAll(sameHostItems);
    assert.strictEqual(hostHitTimestamps.length, 5, "All 5 same-host requests must reach network");
    const totalSpan = hostHitTimestamps[hostHitTimestamps.length - 1] - hostHitTimestamps[0];
    console.log(`  ✓ 5 same-host concurrent probes total time span: ${totalSpan}ms (min requirement: >= 200ms)`);
    assert(
      totalSpan >= 200,
      `Total span for 5 items with 60ms minHostIntervalMs must be >= 200ms, got ${totalSpan}ms`
    );

    for (let i = 1; i < hostHitTimestamps.length; i++) {
      const step = hostHitTimestamps[i] - hostHitTimestamps[i - 1];
      assert(
        step >= 45,
        `Adjacent interval between request ${i} and ${i + 1} must be >= 45ms, got ${step}ms`
      );
    }
    console.log("  ✓ Atomic Per-Host slot mutex serialized 5 concurrent requests without race condition");

    // 3.2: 协议大小写鲁棒性与畸形协议过滤
    mockNet.setRoute("https://valid-upper.example.com/doc", () => ({ status: 200, text: "UPPER_OK" }));
    const caseProber = new BookmarkProber({ timeoutMs: 2000 });

    const upperRes = await caseProber.probeUrl("HTTPS://valid-upper.example.com/doc");
    assert.strictEqual(upperRes.status, "HEALTHY", "Uppercase HTTPS must be parsed as HEALTHY");
    assert.strictEqual(upperRes.httpCode, 200);

    const malformedProtoRes1 = await caseProber.probeUrl("httpfoo://bar/path");
    assert.strictEqual(malformedProtoRes1.status, "SKIPPED", "Non-http protocol httpfoo must be SKIPPED");

    const malformedProtoRes2 = await caseProber.probeUrl("javascript:alert(1)");
    assert.strictEqual(malformedProtoRes2.status, "SKIPPED", "javascript: URI scheme must be SKIPPED");
    console.log("  ✓ Protocol normalization verified: HTTPS:// accepted, httpfoo/javascript skipped");

    // 3.3: Cloudflare DoH 503 异常处理（防误报 RESOLVED）
    mockNet.dohMap.set("down.example.com", { httpStatus: 503 });
    const dohResult = await BookmarkProber.verifyWithDoH("down.example.com");
    console.log(`  ✓ DoH HTTP 503 returned status: "${dohResult}"`);
    assert.strictEqual(
      dohResult,
      "ERROR",
      "DoH returning HTTP 503 must yield 'ERROR', must never return false-positive 'RESOLVED'"
    );

    // 3.4: 慢请求在飞取消 (prober.abort)
    mockNet.setRoute("https://slow-abort.example.com", async (req) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ status: 200, text: "SLOW_OK" }), 500);
        if (req.signal) {
          req.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    });

    const abortProber = new BookmarkProber({ timeoutMs: 5000, concurrency: 2 });
    const slowItems = [
      { url: "https://slow-abort.example.com/item1" },
      { url: "https://slow-abort.example.com/item2" },
      { url: "https://slow-abort.example.com/item3" },
      { url: "https://slow-abort.example.com/item4" }
    ];

    const abortStart = Date.now();
    const probePromise = abortProber.probeAll(slowItems);
    setTimeout(() => {
      abortProber.abort();
    }, 30);

    const resultsAfterAbort = await probePromise;
    const abortDuration = Date.now() - abortStart;
    console.log(`  ✓ Probe aborted in ${abortDuration}ms (well below full 5000ms+ timeout)`);
    assert(
      abortDuration < 2500,
      `prober.abort() must rapidly stop probeAll execution, took ${abortDuration}ms (expected < 2500ms)`
    );
    assert.strictEqual(abortProber.isAborted, true, "prober.isAborted must be true");
    // 严格消除恒真右支 || results.every(r => r.status !== undefined)，真断言工作队列被物理截断
    assert(
      resultsAfterAbort.length < slowItems.length,
      `Worker queue must be cut off upon abort: got ${resultsAfterAbort.length} items, strictly < ${slowItems.length}`
    );

    // ========================================================================
    // 4. DNR 空域名防泄漏守卫与 UI/打包静态合规
    // ========================================================================
    console.log("\n[Sub-test 4/4] DNR Empty Domain Guard & Bundle Purity Verification");

    // 4.1: 空域名列表安装 DNR 保护
    mockChrome.sessionRules = [
      {
        id: 1001,
        priority: 1,
        action: { type: "modifyHeaders" },
        condition: { tabIds: [-1], resourceTypes: ["xmlhttprequest"], requestDomains: ["old.com"] }
      }
    ];

    await installProbeSessionRule([]);
    const activeRules = await mockChrome.declarativeNetRequest.getSessionRules();
    console.log(`  ✓ installProbeSessionRule([]) executed: active rules count = ${activeRules.length}`);
    assert.strictEqual(
      activeRules.length,
      0,
      "installProbeSessionRule with empty array must uninstall rules and never install broad rules"
    );

    // 4.2: 源码文件静态规范校验
    const extDir = path.resolve(__dirname, "../bookmark-organizer");

    const manifestPath = path.join(extDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    assert.strictEqual(
      manifest.minimum_chrome_version,
      "114",
      "manifest.json minimum_chrome_version must be '114'"
    );

    const dashboardJs = fs.readFileSync(path.join(extDir, "dashboard.js"), "utf-8");
    assert(dashboardJs.includes("{ ifAvailable: true }"), "dashboard.js must contain { ifAvailable: true }");
    assert(dashboardJs.includes("restoreSnapshot("), "dashboard.js must contain restoreSnapshot(");
    assert(dashboardJs.includes("BHM_INSTALL_PROBE_RULE"), "dashboard.js must contain BHM_INSTALL_PROBE_RULE");
    assert(dashboardJs.includes("BHM_UNINSTALL_PROBE_RULE"), "dashboard.js must contain BHM_UNINSTALL_PROBE_RULE");

    const sidepanelJs = fs.readFileSync(path.join(extDir, "sidepanel.js"), "utf-8");
    assert(sidepanelJs.includes("onCreated.addListener"), "sidepanel.js must contain onCreated.addListener");
    assert(sidepanelJs.includes("appendNextBatch"), "sidepanel.js must contain appendNextBatch");
    console.log("  ✓ Source files verified: manifest.json, dashboard.js and sidepanel.js adhere to v2.1 contracts");

    // 4.3: 二进制校验根目录 bhm-pro-extension.zip
    const rootZipPath = path.resolve(__dirname, "../bhm-pro-extension.zip");
    assert(fs.existsSync(rootZipPath), `Production archive ${rootZipPath} must exist! Run package script first.`);

    const zipBuffer = fs.readFileSync(rootZipPath);
    const zipEntries = extractZipEntryPaths(zipBuffer);
    console.log(`  ✓ Scanned binary bhm-pro-extension.zip: entries count = ${zipEntries.length}`);

    // 断言不含任何 .md 文件
    const mdFiles = zipEntries.filter(e => e.toLowerCase().endsWith(".md"));
    assert.strictEqual(
      mdFiles.length,
      0,
      `Zip archive must not contain any .md files, found: ${mdFiles.join(", ")}`
    );

    // 断言不含 dict.js
    const hasDict = zipEntries.some(e => e === "dict.js" || e.endsWith("/dict.js"));
    assert.strictEqual(hasDict, false, "Zip archive must not contain dict.js");

    // 断言不含 .zip 嵌套
    const nestedZips = zipEntries.filter(e => e.toLowerCase().endsWith(".zip"));
    assert.strictEqual(nestedZips.length, 0, "Zip archive must not contain nested zip files");

    // 断言正好包含 22 个核心生产文件 (含双语 _locales 与 core/i18n.js)
    assert.strictEqual(
      zipEntries.length,
      22,
      `Zip archive must contain exactly 22 core production files, found ${zipEntries.length}`
    );

    const expected22 = [
      "_locales/en/messages.json",
      "_locales/zh_CN/messages.json",
      "background.js",
      "core/classifier.js",
      "core/ecosystem_rules.js",
      "core/i18n.js",
      "core/license.js",
      "core/prober.js",
      "core/safety.js",
      "css/tailwind.css",
      "dashboard.html",
      "dashboard.js",
      "icons/icon128.png",
      "icons/icon16.png",
      "icons/icon32.png",
      "icons/icon48.png",
      "manifest.json",
      "popup.html",
      "popup.js",
      "privacy.html",
      "sidepanel.html",
      "sidepanel.js"
    ];

    for (const exp of expected22) {
      assert(
        zipEntries.includes(exp),
        `Zip archive is missing required core production file: ${exp}`
      );
    }
    console.log("  ✓ Binary zip purity verified: 0 markdown, 0 dict.js, exactly 22 core production files present");

    console.log("\n✅ [PASS] All 4 Sub-tests in Suite 11 (Batch 2 P1/P2 Hardening) Passed Successfully!\n");
  } finally {
    mockChrome.uninstallGlobal();
    mockNet.uninstall();
  }
}

if (require.main === module) {
  runBatch2P1HardeningTests().catch((err) => {
    console.error("\n❌ [FAIL] Test Suite 11 Failed:", err);
    process.exit(1);
  });
}

module.exports = { runBatch2P1HardeningTests };
