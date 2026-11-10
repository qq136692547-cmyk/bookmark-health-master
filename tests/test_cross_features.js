const assert = require("node:assert");
const { MockChrome } = require("./helpers/mock_chrome.js");
const { MockNetwork } = require("./helpers/mock_network.js");
const { BookmarkProber } = require("../bookmark-organizer/core/prober.js");
const { EcosystemClassifier } = require("../bookmark-organizer/core/classifier.js");
const { ECOSYSTEM_RULES } = require("../bookmark-organizer/core/ecosystem_rules.js");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");
const { LicenseManager } = require("../bookmark-organizer/core/license.js");

/**
 * Helper to generate authentic Ed25519-signed LTD license key for testing
 * Uses an ephemeral in-memory Ed25519 private key
 */
async function createTestLTDLicense(signingKey) {
  const cryptoObj = globalThis.crypto || require("node:crypto").webcrypto;
  const payload = {
    id: "lic_ltd_cross_feature",
    tier: "LTD",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 3600
  };
  const payloadB64Url = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const headerAndPayload = "BHM1." + payloadB64Url;
  const sig = await cryptoObj.subtle.sign(
    { name: "Ed25519" },
    signingKey,
    new TextEncoder().encode(headerAndPayload)
  );
  const sigB64Url = Buffer.from(sig).toString("base64url");
  return headerAndPayload + "." + sigB64Url;
}

async function runCrossFeatureTests() {
  console.log("▶ [Test Suite] Tier 3 Cross-Feature Combination Tests");

  const cryptoObj = globalThis.crypto || require("node:crypto").webcrypto;
  const prodSpki = LicenseManager.PUBLIC_KEY_SPKI;

  // Generate ephemeral in-memory Ed25519 keypair for tests
  const ephemeralKp = await cryptoObj.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const ephemeralSpkiBuf = await cryptoObj.subtle.exportKey("spki", ephemeralKp.publicKey);
  const ephemeralSpkiB64 = Buffer.from(ephemeralSpkiBuf).toString("base64");
  LicenseManager.PUBLIC_KEY_SPKI = ephemeralSpkiB64;
  LicenseManager._cachedPublicKey = null;

  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  try {

  // ==========================================================================
  // TC-T3-01: Reorganizing collaborative docs while throttled by micro-batch flow control
  // ==========================================================================
  console.log("  ▶ TC-T3-01: Reorganizing collaborative docs under micro-batch throttling");

  // Create target destination folders
  const ugcFolder = await mockChrome.bookmarks.create({ parentId: "1", title: "📄 协同文档与云端知识库" });
  const googleFolder = await mockChrome.bookmarks.create({ parentId: "1", title: "🌐 谷歌官方全生态" });
  const byteFolder = await mockChrome.bookmarks.create({ parentId: "1", title: "🎵 字节跳动全生态" });

  // Generate 40 mixed bookmarks
  const testItems = [];
  for (let i = 0; i < 15; i++) {
    testItems.push({ id: `doc_g_${i}`, url: `https://docs.google.com/document/d/item_${i}/edit`, title: `Google Doc ${i}` });
  }
  for (let i = 0; i < 10; i++) {
    testItems.push({ id: `doc_fs_${i}`, url: `https://feishu.cn/docx/doxcn_${i}`, title: `Feishu Doc ${i}` });
  }
  for (let i = 0; i < 10; i++) {
    testItems.push({ id: `eco_g_${i}`, url: `https://cloud.google.com/product_${i}`, title: `Google Cloud ${i}` });
  }
  for (let i = 0; i < 5; i++) {
    testItems.push({ id: `eco_by_${i}`, url: `https://xyq.jianying.com/app_${i}`, title: `JianYing App ${i}` });
  }

  // Create initial bookmarks in Bookmarks Bar ('1')
  for (const item of testItems) {
    await mockChrome.bookmarks.create({ id: item.id, parentId: "1", title: item.title, url: item.url });
  }

  // Set up classifier with UGC rule support
  const ugcMetaRule = {
    id: "ugc_docs",
    name: "协同文档与云端知识库",
    subcategories: [{ id: "docs_portal", name: "在线文档与协同知识库" }]
  };
  const safeRules = [...ECOSYSTEM_RULES];
  if (!safeRules.some(r => r.id === "ugc_docs")) safeRules.push(ugcMetaRule);
  const classifier = new EcosystemClassifier(safeRules);

  // Micro-batch mover with flow control
  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 40;
  const batchYieldTimestamps = [];
  let movedCount = 0;

  for (let i = 0; i < testItems.length; i += BATCH_SIZE) {
    const chunk = testItems.slice(i, i + BATCH_SIZE);
    const startBatch = Date.now();

    for (const item of chunk) {
      const cls = classifier.classify(item);
      let targetParentId = "1";
      if (cls.ecoId === "ugc_docs") {
        targetParentId = ugcFolder.id;
      } else if (cls.ecoId === "google") {
        targetParentId = googleFolder.id;
      } else if (cls.ecoId === "bytedance") {
        targetParentId = byteFolder.id;
      }
      await mockChrome.bookmarks.move(item.id, { parentId: targetParentId });
      movedCount++;
    }

    if (i + BATCH_SIZE < testItems.length) {
      batchYieldTimestamps.push(Date.now());
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Assertions for TC-T3-01
  console.log(`  ✓ Throttled batch move completed: ${movedCount} items moved across ${batchYieldTimestamps.length + 1} micro-batches`);
  assert.strictEqual(movedCount, 40);

  // Verify UGC folder contains all 25 collaborative docs and 0 titan official links
  const ugcSubTree = (await mockChrome.bookmarks.getSubTree(ugcFolder.id))[0];
  const googleSubTree = (await mockChrome.bookmarks.getSubTree(googleFolder.id))[0];
  const byteSubTree = (await mockChrome.bookmarks.getSubTree(byteFolder.id))[0];

  assert.strictEqual(ugcSubTree.children.length, 25, "UGC folder must contain exactly 25 collaborative docs");
  assert.strictEqual(googleSubTree.children.length, 10, "Google folder must contain 10 official products");
  assert.strictEqual(byteSubTree.children.length, 5, "ByteDance folder must contain 5 official products");

  // Ensure NO Google Docs leaked into Google official folder
  const googleLeaked = googleSubTree.children.filter(c => c.url.includes("docs.google.com"));
  assert.strictEqual(googleLeaked.length, 0, "Zero Google Docs may leak into Google official ecosystem folder!");

  // ==========================================================================
  // TC-T3-02: DoH cross-validation interleaved with per-host rate limiting
  // ==========================================================================
  console.log("  ▶ TC-T3-02: DoH cross-validation interleaved with rate limiting");

  const mockNet = new MockNetwork();
  mockNet.install();

  // 15 items on flaky-shared.org and 10 on defunct-dns.xyz
  const sharedItems = [];
  for (let i = 0; i < 15; i++) {
    sharedItems.push({ url: `https://flaky-shared.org/api/v1/resource_${i}`, title: `Flaky Item ${i}` });
  }
  for (let i = 0; i < 10; i++) {
    sharedItems.push({ url: `https://defunct-dns.xyz/sub_${i}`, title: `Dead Item ${i}` });
  }

  // Setup DNS responses
  mockNet.setDoHResult("defunct-dns.xyz", { status: 3 }); // NXDOMAIN
  mockNet.setDoHResult("flaky-shared.org", { status: 0, answers: [{ name: "flaky-shared.org", type: 1, TTL: 300, data: "198.51.100.1" }] }); // NOERROR

  // Network routes: flaky-shared times out on HTTP, defunct-dns fails on HTTP
  mockNet.setRoute(/flaky-shared\.org/, () => { throw new Error("ETIMEDOUT"); });
  mockNet.setRoute(/defunct-dns\.xyz/, () => { throw new Error("ENOTFOUND"); });

  const prober = new BookmarkProber({
    concurrency: 4,
    timeoutMs: 1500,
    minHostIntervalMs: 30
  });

  const probeResults = await prober.probeAll(sharedItems);
  console.log(`  ✓ Probe completed for ${probeResults.length} items with rate limiting & DoH verification`);

  const deadItems = probeResults.filter(r => r.status === "DEAD");
  const protectedItems = probeResults.filter(r => r.status === "UNREACHABLE_OR_PROTECTED");

  assert.strictEqual(deadItems.length, 10, "All 10 defunct-dns.xyz items must be diagnosed as DEAD via DoH NXDOMAIN");
  assert.strictEqual(protectedItems.length, 15, "All 15 flaky-shared.org items must be preserved in manual review");

  mockNet.uninstall();

  // ==========================================================================
  // TC-T3-03: Full journal rollback after multi-batch moves under sync simulation
  // ==========================================================================
  console.log("  ▶ TC-T3-03: Full journal rollback after multi-batch moves under sync simulation");

  const folderDev = await mockChrome.bookmarks.create({ parentId: "1", title: "Source Dev" });
  const folderDesign = await mockChrome.bookmarks.create({ parentId: "1", title: "Source Design" });
  const folderTrash = await mockChrome.bookmarks.create({ parentId: "1", title: "Target Trash" });

  const initialDevItems = [];
  const initialDesignItems = [];
  for (let i = 0; i < 20; i++) {
    const dItem = await mockChrome.bookmarks.create({ parentId: folderDev.id, title: `Dev Tool ${i}`, url: `https://dev-tool-${i}.com` });
    initialDevItems.push(dItem);
    const dsItem = await mockChrome.bookmarks.create({ parentId: folderDesign.id, title: `Design Tool ${i}`, url: `https://design-tool-${i}.com` });
    initialDesignItems.push(dsItem);
  }

  // Execute multi-batch move to Trash
  const safety = new SafetyManager(mockChrome.storage.local);
  const plannedMoves = [];

  // Move 10 from Dev and 10 from Design
  for (let i = 0; i < 10; i++) {
    const d = initialDevItems[i];
    plannedMoves.push({
      id: d.id,
      title: d.title,
      url: d.url,
      oldParentId: folderDev.id,
      oldIndex: d.index,
      newParentId: folderTrash.id,
      newIndex: i
    });
    await mockChrome.bookmarks.move(d.id, { parentId: folderTrash.id });
  }
  for (let i = 0; i < 10; i++) {
    const ds = initialDesignItems[i];
    plannedMoves.push({
      id: ds.id,
      title: ds.title,
      url: ds.url,
      oldParentId: folderDesign.id,
      oldIndex: ds.index,
      newParentId: folderTrash.id,
      newIndex: 10 + i
    });
    await mockChrome.bookmarks.move(ds.id, { parentId: folderTrash.id });
  }

  // Pre-commit journal recorded
  const multiBatchJournal = await safety.recordJournal("QUARANTINE_DEAD", plannedMoves);
  console.log(`  ✓ Multi-batch journal recorded with ${multiBatchJournal.count} moves`);

  // Simulate Chromium Sync background echo events
  let syncEchoCount = 0;
  mockChrome.bookmarks.onMoved.addListener(() => {
    syncEchoCount++;
  });

  // Execute full atomic rollback
  const rollbackRes = await safety.rollbackJournal(multiBatchJournal.id);
  console.log(`  ✓ Rollback completed: count = ${rollbackRes.count}, sync echo events triggered = ${syncEchoCount}`);
  assert.strictEqual(rollbackRes.success, true);
  assert.strictEqual(rollbackRes.count, 20);

  // Verify all 20 Dev items are back in folderDev
  const finalDevSubTree = (await mockChrome.bookmarks.getSubTree(folderDev.id))[0];
  const finalDesignSubTree = (await mockChrome.bookmarks.getSubTree(folderDesign.id))[0];
  assert.strictEqual(finalDevSubTree.children.length, 20);
  assert.strictEqual(finalDesignSubTree.children.length, 20);

  // Verify Trash folder is now empty
  const finalTrashSubTree = (await mockChrome.bookmarks.getSubTree(folderTrash.id))[0];
  assert.strictEqual(finalTrashSubTree.children.length, 0);

  // ==========================================================================
  // TC-T3-04: Commercial gate quota enforcement with live upgrade & genuine move/rollback
  // ==========================================================================
  console.log("  ▶ TC-T3-04: Commercial gate quota enforcement with live upgrade & genuine move/rollback");

  let currentTier = "FREE";
  let isPausedForUpgrade = false;

  // 1. Create real bookmarks in folderBatchSource
  const folderBatchSource = await mockChrome.bookmarks.create({ parentId: "1", title: "Batch Source Folder" });
  const folderBatchTarget = await mockChrome.bookmarks.create({ parentId: "1", title: "Batch Target Folder" });

  const queue = [];
  for (let i = 0; i < 200; i++) {
    const bm = await mockChrome.bookmarks.create({
      parentId: folderBatchSource.id,
      title: `Batch Candidate #${i}`,
      url: `https://site-${i}.com/entry`,
      index: i
    });
    queue.push(bm);
  }

  // Verify initial state
  const initialSourceTree = (await mockChrome.bookmarks.getSubTree(folderBatchSource.id))[0];
  assert.strictEqual(initialSourceTree.children.length, 200, "Must create 200 bookmarks in source folder");

  // 2. Free tier user attempts batch move operations (gated by LicenseManager)
  const canBatchMoveInitial = LicenseManager.canExecuteAction("BATCH_MOVE", currentTier);
  if (!canBatchMoveInitial) {
    isPausedForUpgrade = true;
    console.log("  ✓ Batch move gated: Free tier blocked from executing batch organization");
  }
  assert.strictEqual(isPausedForUpgrade, true, "Free tier must be blocked from BATCH_MOVE");

  const freeRemainingQuota = await LicenseManager.getRemainingQuota("FREE", mockChrome.storage.local);
  assert.strictEqual(freeRemainingQuota, 10, "Free tier has 10 bookmark quota limit");

  // Verify that arbitrary / hardcoded backdoor strings are strictly REJECTED
  const backdoorKey = "BHM-PRO-LIFETIME-AUTHORIZED";
  const backdoorRes = await LicenseManager.verifyLicense(backdoorKey);
  assert.strictEqual(backdoorRes.valid, false, "Hardcoded pseudo-keys must be rejected");

  const uuidKey = "12345678-ABCD-EF01-2345-6789ABCDEF01";
  const uuidRes = await LicenseManager.verifyLicense(uuidKey);
  assert.strictEqual(uuidRes.valid, false, "Arbitrary UUID keys must be rejected");

  // 3. User enters valid, authentic Ed25519-signed LTD key in dashboard without reloading
  const validLtdKey = await createTestLTDLicense(ephemeralKp.privateKey);
  const upgradeResult = await LicenseManager.verifyLicense(validLtdKey);
  assert.strictEqual(upgradeResult.valid, true, "Authentic Ed25519 LTD key must be valid");
  assert.strictEqual(upgradeResult.tier, "LTD");
  currentTier = upgradeResult.tier;
  isPausedForUpgrade = false;

  // Persist key to storage and verify dynamic status check
  await mockChrome.storage.local.set({ bhm_license_key: validLtdKey, bhm_pro_activated: true });
  const liveStatus = await LicenseManager.checkProStatus(mockChrome.storage.local);
  assert.strictEqual(liveStatus.isPro, true, "Dynamic checkProStatus must confirm Pro status");
  assert.strictEqual(liveStatus.tier, "LTD");

  // Re-check action with upgraded LTD tier
  const canBatchMoveAfterUpgrade = LicenseManager.canExecuteAction("BATCH_MOVE", currentTier);
  assert.strictEqual(canBatchMoveAfterUpgrade, true, "Upgraded LTD tier must unlock BATCH_MOVE");

  // 4. Genuine execution of all 200 items under unlocked LTD tier with SafetyManager Move Journal
  const batchSafety = new SafetyManager(mockChrome.storage.local);
  const plannedBatchMoves = [];
  const allInitialSourceIds = queue.map(item => item.id);

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    plannedBatchMoves.push({
      id: item.id,
      title: item.title,
      url: item.url,
      oldParentId: folderBatchSource.id,
      oldIndex: item.index,
      newParentId: folderBatchTarget.id,
      newIndex: i,
      oldChildren: allInitialSourceIds
    });
  }

  // Record transaction journal BEFORE or with pre-move state
  const batchJournal = await batchSafety.recordJournal("BATCH_REORGANIZE", plannedBatchMoves);
  console.log(`  ✓ Move Journal recorded for 200 items (Journal ID: ${batchJournal.id})`);
  assert.strictEqual(batchJournal.count, 200);

  // Now execute the actual move operations
  for (let i = 0; i < queue.length; i++) {
    await mockChrome.bookmarks.move(queue[i].id, { parentId: folderBatchTarget.id });
  }

  // Verify all 200 bookmarks actually moved into target folder in Chrome bookmarks tree
  const movedSourceTree = (await mockChrome.bookmarks.getSubTree(folderBatchSource.id))[0];
  const movedTargetTree = (await mockChrome.bookmarks.getSubTree(folderBatchTarget.id))[0];
  assert.strictEqual(movedSourceTree.children.length, 0, "Source folder must be empty after 200 moves");
  assert.strictEqual(movedTargetTree.children.length, 200, "Target folder must contain all 200 moved bookmarks");

  // 5. Quota consumption & persistence
  await LicenseManager.consumeQuota(200, mockChrome.storage.local);
  const storedQuotaState = await mockChrome.storage.local.get("bhm_quota_used");
  assert.strictEqual(storedQuotaState.bhm_quota_used, 200, "Quota usage (200) must be persisted to storage.local");

  // Check remaining quotas across tiers
  const remainingLTD = await LicenseManager.getRemainingQuota("LTD", mockChrome.storage.local);
  assert.strictEqual(remainingLTD, Infinity, "LTD tier must have unlimited remaining quota");

  const remainingSingleWash = await LicenseManager.getRemainingQuota("SINGLE_WASH", mockChrome.storage.local);
  assert.strictEqual(remainingSingleWash, 300, "Single Wash tier (500 limit) must have 300 remaining quota after consuming 200");

  // 6. Verify atomic rollback restores 100% position fidelity across all 200 items
  const batchRollbackRes = await batchSafety.rollbackJournal(batchJournal.id);
  console.log(`  ✓ Atomic rollback of 200 items: success = ${batchRollbackRes.success}, count = ${batchRollbackRes.count}`);
  assert.strictEqual(batchRollbackRes.success, true);
  assert.strictEqual(batchRollbackRes.count, 200);

  const restoredBatchSourceTree = (await mockChrome.bookmarks.getSubTree(folderBatchSource.id))[0];
  const restoredBatchTargetTree = (await mockChrome.bookmarks.getSubTree(folderBatchTarget.id))[0];
  assert.strictEqual(restoredBatchSourceTree.children.length, 200, "Source folder must have all 200 items restored");
  assert.strictEqual(restoredBatchTargetTree.children.length, 0, "Target folder must be completely empty after rollback");

  for (let i = 0; i < 200; i++) {
    assert.strictEqual(restoredBatchSourceTree.children[i].id, queue[i].id, `Restored bookmark id mismatch at index ${i}`);
    assert.strictEqual(restoredBatchSourceTree.children[i].index, i, `Restored bookmark index mismatch at slot ${i}`);
  }
  console.log(`  ✓ 100% position fidelity confirmed across all 200 restored bookmarks in batch source`);

  console.log("✅ Tier 3 Cross-Feature Combination tests passed!\n");
  } finally {
    LicenseManager.PUBLIC_KEY_SPKI = prodSpki;
    LicenseManager._cachedPublicKey = null;
    mockChrome.uninstallGlobal();
  }
}

module.exports = { runCrossFeatureTests };

if (require.main === module) {
  runCrossFeatureTests().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
}
