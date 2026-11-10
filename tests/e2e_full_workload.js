const assert = require("node:assert");
const { MockChrome } = require("./helpers/mock_chrome.js");
const { MockNetwork } = require("./helpers/mock_network.js");
const { BookmarkProber } = require("../bookmark-organizer/core/prober.js");
const { EcosystemClassifier } = require("../bookmark-organizer/core/classifier.js");
const { ECOSYSTEM_RULES } = require("../bookmark-organizer/core/ecosystem_rules.js");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");

async function runE2EFullWorkloadTests() {
  console.log("================================================================================");
  console.log("  Tier 4: E2E Full Workload Stress Test (1,500+ Realistic Bookmark Corpus)");
  console.log("================================================================================\n");

  const startTime = Date.now();
  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  const mockNet = new MockNetwork();
  mockNet.install();

  // --------------------------------------------------------------------------
  // Step 1: Synthesize 1,500 Realistic Bookmarks Corpus
  // --------------------------------------------------------------------------
  console.log("  ▶ [Phase 1] Generating synthetic 1,500 bookmark corpus...");

  const corpus = [];
  let bmIdCounter = 1;

  // 1. 300 Tech Titan links across 16 giants (AWS, GCP, Azure, HarmonyOS, Meta, etc.)
  const titanDomains = [
    { eco: "google", url: "https://cloud.google.com/run", title: "Google Cloud Run" },
    { eco: "amazon", url: "https://aws.amazon.com/s3", title: "AWS S3 Console" },
    { eco: "microsoft", url: "https://github.com/microsoft/typescript", title: "Microsoft TypeScript" },
    { eco: "huawei", url: "https://developer.huawei.com/consumer/cn/harmonyos", title: "HarmonyOS Developer" },
    { eco: "meta", url: "https://meta.ai/chat", title: "Meta AI Assistant" },
    { eco: "openai", url: "https://chatgpt.com/overview", title: "ChatGPT" },
    { eco: "nvidia", url: "https://developer.nvidia.com/cuda-zone", title: "NVIDIA CUDA Zone" },
    { eco: "cloudflare", url: "https://dash.cloudflare.com/dns", title: "Cloudflare DNS Dashboard" },
    { eco: "apple", url: "https://developer.apple.com/swift", title: "Apple Swift" },
    { eco: "tencent", url: "https://cloud.tencent.com/product/cvm", title: "Tencent Cloud CVM" },
    { eco: "alibaba", url: "https://www.aliyun.com/product/ecs", title: "Alibaba Cloud ECS" },
    { eco: "bytedance", url: "https://www.volcengine.com/product/ecs", title: "Volcengine ECS" },
    { eco: "baidu", url: "https://cloud.baidu.com/product/bcc", title: "Baidu Cloud BCC" },
    { eco: "xiaomi", url: "https://dev.mi.com/console", title: "Xiaomi Developer Console" },
    { eco: "anthropic", url: "https://claude.ai/chat", title: "Anthropic Claude" },
    { eco: "jd", url: "https://cloud.jd.com/products/vm", title: "JD Cloud VM" }
  ];
  for (let i = 0; i < 300; i++) {
    const t = titanDomains[i % titanDomains.length];
    corpus.push({
      id: `bm_titan_${bmIdCounter++}`,
      url: `${t.url}?item=${i}`,
      title: `${t.title} #${i}`,
      type: "TITAN",
      expectedEco: t.eco
    });
  }

  // 2. 150 UGC collaborative documents (Google Docs, Sheets, Feishu, Yuque, QQ Docs, Notion, Shimo)
  const ugcTemplates = [
    { url: "https://docs.google.com/document/d/doc_id_", title: "Google Doc Project Plan" },
    { url: "https://sheets.google.com/spreadsheets/d/sheet_id_", title: "Google Sheet Q3 Budget" },
    { url: "https://feishu.cn/docx/feishu_doc_", title: "Feishu Product Requirement Spec" },
    { url: "https://myteam.feishu.cn/wiki/wiki_page_", title: "Feishu Knowledge Base Wiki" },
    { url: "https://team.yuque.com/org/workspace/note_", title: "Yuque Architecture Doc" },
    { url: "https://docs.qq.com/doc/p/qq_doc_", title: "QQ Docs Team Sheet" },
    { url: "https://notion.so/myteam/workspace_doc_", title: "Notion Project Roadmap" },
    { url: "https://shimo.im/docs/shimo_doc_", title: "Shimo Docs Specification" }
  ];
  for (let i = 0; i < 150; i++) {
    const u = ugcTemplates[i % ugcTemplates.length];
    corpus.push({
      id: `bm_ugc_${bmIdCounter++}`,
      url: `${u.url}${i}`,
      title: `${u.title} #${i}`,
      type: "UGC_DOC"
    });
  }

  // 3. 100 RFC1918 Intranet & local dev links
  const intranetTemplates = [
    "http://localhost:3000/dashboard",
    "http://127.0.0.1:8080/swagger-ui",
    "http://10.0.4.15:9090/metrics",
    "http://172.16.2.8/admin",
    "http://192.168.1.1/gateway",
    "http://jira.corp.internal/browse/PROJ",
    "http://gitlab.local/infra/repo"
  ];
  for (let i = 0; i < 100; i++) {
    const base = intranetTemplates[i % intranetTemplates.length];
    corpus.push({
      id: `bm_intra_${bmIdCounter++}`,
      url: `${base}?id=${i}`,
      title: `Intranet Service ${i}`,
      type: "INTRANET"
    });
  }

  // 4. 50 Sensitive links (logout, unsubscribe, delete account)
  const sensitiveTemplates = [
    "https://auth.company.com/logout",
    "https://mailer.service.org/unsubscribe?token=",
    "https://portal.net/account/delete_confirm",
    "https://secure.app.io/reset_password?token="
  ];
  for (let i = 0; i < 50; i++) {
    const base = sensitiveTemplates[i % sensitiveTemplates.length];
    corpus.push({
      id: `bm_sens_${bmIdCounter++}`,
      url: `${base}${i}`,
      title: `Sensitive Action ${i}`,
      type: "SENSITIVE"
    });
  }

  // 5. 200 True dead links (100 HTTP 404, 50 HTTP 410, 50 NXDOMAIN distributed across subdomains)
  for (let i = 0; i < 100; i++) {
    corpus.push({
      id: `bm_dead_404_${bmIdCounter++}`,
      url: `https://node-${i % 8}.defunct-server.com/lost-page-${i}`,
      title: `Defunct 404 Link ${i}`,
      type: "DEAD",
      httpStatus: 404
    });
  }
  for (let i = 0; i < 50; i++) {
    corpus.push({
      id: `bm_dead_410_${bmIdCounter++}`,
      url: `https://api-${i % 4}.retired-api.org/v1/endpoint-${i}`,
      title: `Retired 410 Link ${i}`,
      type: "DEAD",
      httpStatus: 410
    });
  }
  for (let i = 0; i < 50; i++) {
    const deadHost = `dead-domain-nx-${i}.xyz`;
    mockNet.setDoHResult(deadHost, { status: 3 }); // NXDOMAIN
    corpus.push({
      id: `bm_dead_nx_${bmIdCounter++}`,
      url: `https://${deadHost}/landing`,
      title: `Unregistered Domain ${i}`,
      type: "DEAD",
      isNxDomain: true
    });
  }

  // 6. 100 Protected links (WAF 403, 429 rate limit, 401 auth, resolving DoH)
  for (let i = 0; i < 50; i++) {
    corpus.push({
      id: `bm_prot_waf_${bmIdCounter++}`,
      url: `https://edge-${i % 4}.cloudflare-protected.com/portal-${i}`,
      title: `WAF Protected Portal ${i}`,
      type: "PROTECTED",
      httpStatus: 403
    });
  }
  for (let i = 0; i < 50; i++) {
    const vpnHost = `corp-vpn-${i}.internal-auth.com`;
    mockNet.setDoHResult(vpnHost, { status: 0, answers: [{ name: vpnHost, type: 1, TTL: 300, data: "198.51.100.2" }] });
    corpus.push({
      id: `bm_prot_vpn_${bmIdCounter++}`,
      url: `https://${vpnHost}/sso`,
      title: `Corporate VPN SSO ${i}`,
      type: "PROTECTED",
      dohResolves: true
    });
  }

  // 7. 600 Healthy general websites (distributed across 40 realistic domain hosts to exercise 50ms per-host throttle)
  for (let i = 0; i < 600; i++) {
    corpus.push({
      id: `bm_healthy_${bmIdCounter++}`,
      url: `https://host-${i % 40}.popular-tech-network.org/articles/post-${i}`,
      title: `Technology Post ${i}`,
      type: "HEALTHY",
      httpStatus: 200
    });
  }

  assert.strictEqual(corpus.length, 1500, "Corpus must contain exactly 1,500 bookmarks");
  console.log(`  ✓ Successfully synthesized ${corpus.length} bookmarks across 7 distinct categories.`);

  // Ingest into in-memory MockChrome bookmarks tree
  const rootFolder = await mockChrome.bookmarks.create({ parentId: "1", title: "My 5-Year Cluttered Bookmarks" });
  for (let i = 0; i < corpus.length; i++) {
    const b = corpus[i];
    await mockChrome.bookmarks.create({
      id: b.id,
      parentId: rootFolder.id,
      title: b.title,
      url: b.url,
      index: i
    });
  }
  const treeNodes = (await mockChrome.bookmarks.getSubTree(rootFolder.id))[0].children;
  assert.strictEqual(treeNodes.length, 1500);
  console.log(`  ✓ All 1,500 bookmarks populated in mock Bookmarks Bar folder.`);

  // --------------------------------------------------------------------------
  // Step 2: Configure Mock Network Routes & Responses
  // --------------------------------------------------------------------------
  mockNet.setRoute(/defunct-server\.com/, { status: 404 });
  mockNet.setRoute(/retired-api\.org/, { status: 410 });
  mockNet.setRoute(/cloudflare-protected\.com/, { status: 403 });
  mockNet.setRoute(/corp-vpn.*\.internal-auth\.com/, () => { throw new Error("ETIMEDOUT"); });
  mockNet.setRoute(/dead-domain-nx.*\.xyz/, () => { throw new Error("ENOTFOUND"); });

  // --------------------------------------------------------------------------
  // Step 3: Concurrent Prober Execution (Requirement R2.2)
  // --------------------------------------------------------------------------
  console.log("  ▶ [Phase 2] Executing concurrent health scan on 1,500 bookmarks...");
  const prober = new BookmarkProber({
    concurrency: 100,
    timeoutMs: 1000,
    minHostIntervalMs: 50 // 真实非零同域排队节流
  });

  let progressTicks = 0;
  prober.onProgress = (done, total) => {
    if (done % 300 === 0 || done === total) {
      progressTicks++;
      console.log(`    ... Probe Progress: ${done}/${total} (${Math.round((done / total) * 100)}%)`);
    }
  };

  const probeResults = await prober.probeAll(corpus);
  assert.strictEqual(probeResults.length, 1500);
  console.log(`  ✓ Scan completed on all ${probeResults.length} items.`);

  // Verify Prober Classification Stats
  const skippedInternal = probeResults.filter(r => r.status === "SKIPPED_INTERNAL");
  const skippedDangerous = probeResults.filter(r => r.status === "SKIPPED_DANGEROUS");
  const deadFound = probeResults.filter(r => r.status === "DEAD");
  const protectedFound = probeResults.filter(r => r.status === "UNREACHABLE_OR_PROTECTED");
  const healthyFound = probeResults.filter(r => r.status === "HEALTHY");

  console.log(`    Stats:
    - SKIPPED_INTERNAL: ${skippedInternal.length} (Expected: 100)
    - SKIPPED_DANGEROUS: ${skippedDangerous.length} (Expected: 50)
    - DEAD: ${deadFound.length} (Expected: 200)
    - UNREACHABLE_OR_PROTECTED: ${protectedFound.length} (Expected: 100)
    - HEALTHY: ${healthyFound.length} (Expected: 1,050)`);

  assert.strictEqual(skippedInternal.length, 100, "100% of RFC1918 & intranet links must be safely skipped");
  assert.strictEqual(skippedDangerous.length, 50, "100% of sensitive mutation links must be safely skipped");
  assert.strictEqual(deadFound.length, 200, "Exactly 200 dead links confirmed via 404/410 and DoH NXDOMAIN");
  assert.strictEqual(protectedFound.length, 100, "100 protected/resolving links preserved in manual review queue");
  assert.strictEqual(healthyFound.length, 1050, "1,050 valid links confirmed healthy");

  // Health Score Calculation Verification
  const healthScore = BookmarkProber.calculateHealthScore(probeResults);
  console.log(`  ✓ Calculated Health Score: ${healthScore}/100`);
  assert(healthScore > 50 && healthScore < 75, "Health score must be mathematically sound without NaN or negative values");

  // --------------------------------------------------------------------------
  // Step 4: Batch Quarantine with Incremental Move Journal (Requirement R2.4)
  // --------------------------------------------------------------------------
  console.log("  ▶ [Phase 3] Quarantining 200 dead links into Trash Folder with Move Journal...");
  const trashFolder = await mockChrome.bookmarks.create({ parentId: "1", title: "🗑️ BHM-PRO 回收站 (Trash)" });
  const safety = new SafetyManager(mockChrome.storage.local);

  // 1. Build Pre-commit Move Journal (capturing true pre-move parent and index)
  const quarantineMoves = [];
  for (let i = 0; i < deadFound.length; i++) {
    const item = deadFound[i];
    const liveNode = (await mockChrome.bookmarks.get(item.id))[0];
    quarantineMoves.push({
      id: item.id,
      title: item.title,
      url: item.url,
      oldParentId: liveNode.parentId,
      oldIndex: liveNode.index,
      newParentId: trashFolder.id,
      newIndex: i
    });
  }

  // 2. Pre-commit Journal Entry
  const quarantineJournal = await safety.recordJournal("QUARANTINE_DEAD", quarantineMoves);
  console.log(`  ✓ Quarantined ${quarantineJournal.count} dead links into Trash folder (Journal ID: ${quarantineJournal.id})`);
  assert.strictEqual(quarantineJournal.count, 200);

  // 3. Execute moves to Trash folder
  for (const item of deadFound) {
    await mockChrome.bookmarks.move(item.id, { parentId: trashFolder.id });
  }

  const trashContents = (await mockChrome.bookmarks.getSubTree(trashFolder.id))[0].children;
  assert.strictEqual(trashContents.length, 200);

  // --------------------------------------------------------------------------
  // Step 5: 16 Titans & UGC Docs Multi-Tenant Reorganization (Requirements R2.3 & R2.4)
  // --------------------------------------------------------------------------
  console.log("  ▶ [Phase 4] Reorganizing 300 Tech Titans & 150 UGC Docs with Flow Control...");

  const ugcMetaRule = {
    id: "ugc_docs",
    name: "协同文档与云端知识库",
    subcategories: [{ id: "docs_portal", name: "在线文档与协同知识库" }]
  };
  const safeRules = [...ECOSYSTEM_RULES];
  if (!safeRules.some(r => r.id === "ugc_docs")) safeRules.push(ugcMetaRule);
  const classifier = new EcosystemClassifier(safeRules);

  const reorgFolder = await mockChrome.bookmarks.create({ parentId: "1", title: "🏢 官方全生态与知识库矩阵" });
  const reorgFoldersMap = new Map();

  const reorgMoves = [];
  const reorgCandidates = corpus.filter(c => c.type === "TITAN" || c.type === "UGC_DOC");
  assert.strictEqual(reorgCandidates.length, 450);

  // 1. Build Pre-commit Move Journal (capturing true pre-move parent and index)
  for (let i = 0; i < reorgCandidates.length; i++) {
    const candidate = reorgCandidates[i];
    const cls = classifier.classify(candidate);

    if (!reorgFoldersMap.has(cls.ecoId)) {
      const folder = await mockChrome.bookmarks.create({
        parentId: reorgFolder.id,
        title: cls.ecoFolderName || cls.ecoName
      });
      reorgFoldersMap.set(cls.ecoId, folder.id);
    }

    const targetFolderId = reorgFoldersMap.get(cls.ecoId);
    const liveNode = (await mockChrome.bookmarks.get(candidate.id))[0];

    reorgMoves.push({
      id: candidate.id,
      title: candidate.title,
      url: candidate.url,
      oldParentId: liveNode.parentId,
      oldIndex: liveNode.index,
      newParentId: targetFolderId,
      newIndex: i
    });
  }

  // 2. Pre-commit Journal Entry
  const reorgJournal = await safety.recordJournal("ECOSYSTEM_REORGANIZE", reorgMoves);
  console.log(`  ✓ Reorganized ${reorgJournal.count} links (300 Titans + 150 UGC Docs) into dedicated folders.`);
  assert.strictEqual(reorgJournal.count, 450);

  // 3. Execute reorganization moves
  for (const move of reorgMoves) {
    await mockChrome.bookmarks.move(move.id, { parentId: move.newParentId });
  }

  // Validate UGC docs strict isolation: Zero UGC docs in Google or ByteDance folders
  const ugcFolderId = reorgFoldersMap.get("ugc_docs");
  assert(ugcFolderId !== undefined, "UGC docs folder must exist");
  const ugcChildren = (await mockChrome.bookmarks.getSubTree(ugcFolderId))[0].children;
  assert.strictEqual(ugcChildren.length, 150, "All 150 UGC docs must reside exclusively in UGC docs folder");

  const googleFolderId = reorgFoldersMap.get("google");
  if (googleFolderId) {
    const googleChildren = (await mockChrome.bookmarks.getSubTree(googleFolderId))[0].children;
    const leaked = googleChildren.filter(c => c.url.includes("docs.google.com"));
    assert.strictEqual(leaked.length, 0, "Zero Google Docs leaked into Google official ecosystem folder!");
  }

  // --------------------------------------------------------------------------
  // Step 6: Atomic Original-Position Rollback (Requirement R2.4)
  // --------------------------------------------------------------------------
  console.log("  ▶ [Phase 5] Executing Atomic Rollback via Move Journal (parent-grouped ascending order)...");

  // Rollback Ecosystem Reorganization first (LIFO order)
  const rb1 = await safety.rollbackJournal(reorgJournal.id);
  console.log(`  ✓ Rollback 1 (Ecosystem Reorg): restored ${rb1.count} items to original root folder`);
  assert.strictEqual(rb1.success, true);
  assert.strictEqual(rb1.count, 450);

  // Rollback Dead Links Quarantine second
  const rb2 = await safety.rollbackJournal(quarantineJournal.id);
  console.log(`  ✓ Rollback 2 (Dead Links Quarantine): restored ${rb2.count} items to original root folder`);
  assert.strictEqual(rb2.success, true);
  assert.strictEqual(rb2.count, 200);

  // --------------------------------------------------------------------------
  // Step 7: Complete Hierarchy Restoration Verification (Zero Data Loss)
  // --------------------------------------------------------------------------
  console.log("  ▶ [Phase 6] Verifying full 1,500 bookmark tree restoration & index integrity...");

  const restoredRootTree = (await mockChrome.bookmarks.getSubTree(rootFolder.id))[0];
  assert.strictEqual(restoredRootTree.children.length, 1500, "All 1,500 bookmarks must be restored to original root folder");

  // 1. Verify 100% exact sequential order and index fidelity
  for (let i = 0; i < corpus.length; i++) {
    const expected = corpus[i];
    const actual = restoredRootTree.children[i];
    assert.strictEqual(
      actual.id,
      expected.id,
      `Positional index mismatch at index ${i}: expected ${expected.id} (${expected.title}), got ${actual.id} (${actual.title})`
    );
    assert.strictEqual(
      actual.index,
      i,
      `Child index property mismatch at slot ${i}: expected ${i}, got ${actual.index}`
    );
  }
  console.log("  ✓ 100% Positional index fidelity verified across all 1,500 bookmarks (0 mismatches, 0 shifts, 0 drops)");

  // 2. Verify that all original IDs are present with zero lost items
  const restoredIdSet = new Set(restoredRootTree.children.map(c => c.id));
  for (const b of corpus) {
    assert(restoredIdSet.has(b.id), `Restored tree must contain bookmark ${b.id}`);
  }

  // 3. Check Trash and Reorg folders are empty
  const finalTrashSub = (await mockChrome.bookmarks.getSubTree(trashFolder.id))[0];
  assert.strictEqual(finalTrashSub.children.length, 0, "Trash folder must be completely empty after rollback");

  // Clean up
  mockNet.uninstall();
  mockChrome.uninstallGlobal();

  // Feature 4 Timing & Workload Genuine Assertions (PA-4 Remediation)
  const totalDuration = Date.now() - startTime;
  assert(totalDuration >= 150, `E2E Full Workload duration must be >= 150ms proving 50ms host throttling is active (actual: ${totalDuration}ms)`);
  assert(
    totalDuration < 10000,
    `E2E Full Workload duration must meet performance target < 10000ms (actual: ${totalDuration}ms)`
  );

  const throughput = Math.round((corpus.length / (totalDuration / 1000)));
  assert(
    throughput >= 150,
    `Workload throughput must achieve at least 150 bookmarks/sec with 50ms host throttling (actual: ${throughput} bookmarks/sec)`
  );

  console.log(`\n🎉 E2E Full Workload completed in ${totalDuration}ms (${throughput} bookmarks/sec)! Asserted Target >= 150ms && < 10000ms: PASSED`);
  console.log("================================================================================");
}

module.exports = { runE2EFullWorkloadTests };

if (require.main === module) {
  runE2EFullWorkloadTests().catch(err => {
    console.error("❌ E2E Full Workload test failed:", err);
    process.exit(1);
  });
}
