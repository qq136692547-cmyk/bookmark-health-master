// ============================================================================
// Suite 13: BHM-PRO Round 2 Adversarial Regression & Hardened Invariants
// 
// Covers WorkBuddy Round 2 Audit Findings:
// Adv-1: Anchor rollback NEVER drags back user manually-moved siblings
// Adv-2: Concurrent recordJournal mutex lock prevents lost writes (P1-1)
// Adv-3: Commercial license boundary attacks (FREE tier token rejection,
//        SINGLE_WASH mandatory exp, per-card quota isolation & anti-replay,
//        and anti-reset free quota persistence) (P1-3, P1-4, P1-8)
// Adv-4: mock_chrome move atomicity: bookmark retains slot on invalid destination
// ============================================================================

const assert = require("node:assert");
const crypto = require("node:crypto");
const { MockChrome } = require("./helpers/mock_chrome.js");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");
const { LicenseManager } = require("../bookmark-organizer/core/license.js");
const { ECOSYSTEM_RULES } = require("../bookmark-organizer/core/ecosystem_rules.js");
const { EcosystemClassifier } = require("../bookmark-organizer/core/classifier.js");
const { BHM_I18N } = require("../bookmark-organizer/core/i18n.js");
const {
  loadActiveBookmarksFromChrome,
  reorganizeBookmarksInChrome,
  updateSystemFolders
} = require("../bookmark-organizer/dashboard.js");

class EphemeralTestSigner {
  constructor() {
    this.keypair = null;
    this.publicKeySpkiBase64 = null;
  }

  async init() {
    const cryptoObj = globalThis.crypto || crypto.webcrypto;
    this.keypair = await cryptoObj.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    const spkiBuf = await cryptoObj.subtle.exportKey("spki", this.keypair.publicKey);
    this.publicKeySpkiBase64 = Buffer.from(spkiBuf).toString("base64");
  }

  async createSignedLicense(payloadObj) {
    const cryptoObj = globalThis.crypto || crypto.webcrypto;
    const payloadJson = JSON.stringify(payloadObj);
    const payloadB64Url = Buffer.from(payloadJson).toString("base64url");
    const headerAndPayload = "BHM1." + payloadB64Url;

    const sig = await cryptoObj.subtle.sign(
      { name: "Ed25519" },
      this.keypair.privateKey,
      new TextEncoder().encode(headerAndPayload)
    );
    const sigB64Url = Buffer.from(sig).toString("base64url");
    return headerAndPayload + "." + sigB64Url;
  }
}

async function runRound2AdversarialTests() {
  console.log("================================================================================");
  console.log("▶ [Test Suite 13] Round 2 Adversarial Regression & Hardened Invariants (Zero-Mock)");
  console.log("================================================================================\n");

  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  try {
    // --------------------------------------------------------------------------
    // Adv-1: [Adv-1 / P0-B] 局部锚点回滚绝不拽回用户事后手工移走的兄弟书签
    // --------------------------------------------------------------------------
    console.log("[Adv-1] Anchor Rollback Isolation: User-Moved Siblings Retained");

    // 1. 在书签栏 "1" 创建 [P, Q, R, S] 4 条书签及空文件夹 "我的项目"
    const bmP = await mockChrome.bookmarks.create({ parentId: "1", title: "Bookmark P", url: "https://p.example.com" });
    const bmQ = await mockChrome.bookmarks.create({ parentId: "1", title: "Bookmark Q (Dead)", url: "https://q.example.com" });
    const bmR = await mockChrome.bookmarks.create({ parentId: "1", title: "Bookmark R", url: "https://r.example.com" });
    const bmS = await mockChrome.bookmarks.create({ parentId: "1", title: "Bookmark S", url: "https://s.example.com" });
    const myProjectFolder = await mockChrome.bookmarks.create({ parentId: "1", title: "我的项目" });

    const initialBar = await mockChrome.bookmarks.getChildren("1");
    assert.deepStrictEqual(
      initialBar.map(b => b.id),
      [bmP.id, bmQ.id, bmR.id, bmS.id, myProjectFolder.id],
      "Initial order in Bookmarks Bar must be [P, Q, R, S, 我的项目]"
    );

    // 2. 调用真实 captureMoves([Q.id]) + 新建回收站文件夹 + safety.recordJournal + 将 Q 移入回收站
    const safety = new SafetyManager(mockChrome.storage.local);
    const movesQ = await SafetyManager.captureMoves([bmQ.id]);
    const trashFolder = await mockChrome.bookmarks.create({ parentId: "1", title: "🗑️ BHM-PRO 回收站" });
    movesQ[0].newParentId = trashFolder.id;
    movesQ[0].newIndex = 0;

    const journalQ = await safety.recordJournal("QUARANTINE_DEAD", movesQ, [trashFolder.id]);
    await mockChrome.bookmarks.move(bmQ.id, { parentId: trashFolder.id });

    // 3. 模拟用户事后手工整理：将 R 移入 "我的项目"
    await mockChrome.bookmarks.move(bmR.id, { parentId: myProjectFolder.id });

    // 此时书签栏为 [P, S, 我的项目, 回收站] 或 [P, S, 回收站, 我的项目]
    const barBeforeRollback = (await mockChrome.bookmarks.getChildren("1")).map(b => b.id);
    assert(!barBeforeRollback.includes(bmR.id), "R must no longer be directly under Bookmarks Bar");
    const projectBeforeRollback = (await mockChrome.bookmarks.getChildren(myProjectFolder.id)).map(b => b.id);
    assert.deepStrictEqual(projectBeforeRollback, [bmR.id], "R must now reside in '我的项目'");

    // 4. 调用回滚
    const rbRes = await safety.rollbackJournal(journalQ.id);
    assert.strictEqual(rbRes.success, true, "Rollback must report success");

    // 5. 严格断言
    // 断言 A: "我的项目" 子节点依然精确为 [R.id]（R 绝未被拽回或复制回书签栏！）
    const projectChildren = await mockChrome.bookmarks.getChildren(myProjectFolder.id);
    assert.strictEqual(projectChildren.length, 1, "'我的项目' must contain exactly 1 bookmark");
    assert.strictEqual(projectChildren[0].id, bmR.id, "R must NOT be dragged back by Q's rollback!");

    // 断言 B: 回收站空夹已被自动清理
    const trashCheck = await mockChrome.bookmarks.get(trashFolder.id);
    assert.strictEqual(trashCheck.length, 0, "Empty Trash folder must be pruned automatically upon rollback");

    // 断言 C: 书签栏子节点顺序精确为 [P.id, Q.id, S.id, myProjectFolder.id]
    const finalBar = await mockChrome.bookmarks.getChildren("1");
    const finalBarIds = finalBar.map(b => b.id);
    assert.deepStrictEqual(
      finalBarIds,
      [bmP.id, bmQ.id, bmS.id, myProjectFolder.id],
      `Bookmarks Bar order must be [P, Q, S, 我的项目], got [${finalBarIds.join(", ")}]`
    );
    console.log("  ✓ [Adv-1] Rollback accurately restored Q between P and S; R remained untouched in '我的项目'; Trash pruned.\n");

    // --------------------------------------------------------------------------
    // Adv-2: [Adv-2 / P1-1] 双并发 recordJournal 互斥锁实测 (防并发写冲突丢日志)
    // --------------------------------------------------------------------------
    console.log("[Adv-2] Concurrent recordJournal Mutex & Storage Serialization");

    // 注入 15ms 异步 I/O 延迟以模拟真实多协程/存储并发交错竞态
    const origStorageGet = mockChrome.storage.local.get;
    mockChrome.storage.local.get = function (keys, cb) {
      return new Promise((resolve) => {
        setTimeout(() => {
          origStorageGet.call(mockChrome.storage.local, keys, (res) => {
            if (cb) cb(res);
            resolve(res);
          });
        }, 15);
      });
    };

    try {
      const moves1 = [{ id: "bm_concurrent_1", title: "C1", oldParentId: "1", oldIndex: 0 }];
      const moves2 = [{ id: "bm_concurrent_2", title: "C2", oldParentId: "1", oldIndex: 1 }];

      const [j1, j2] = await Promise.all([
        safety.recordJournal("QUARANTINE_DEAD", moves1, []),
        safety.recordJournal("ECOSYSTEM_REORGANIZE", moves2, [])
      ]);

      const storedJournals = await safety.getJournals();
      assert.strictEqual(storedJournals.length, 2, "Both concurrent journals must be preserved with zero lost writes");
      assert.notStrictEqual(j1.id, j2.id, "Concurrent journals must have distinct IDs");

      const savedIds = storedJournals.map(j => j.id);
      assert(savedIds.includes(j1.id), "Journal 1 must be present in storage");
      assert(savedIds.includes(j2.id), "Journal 2 must be present in storage");
      console.log(`  ✓ [Adv-2] Mutex serialized concurrent journal writes (${j1.id}, ${j2.id}): 0 lost writes.\n`);
    } finally {
      mockChrome.storage.local.get = origStorageGet;
    }

    // --------------------------------------------------------------------------
    // Adv-3: [Adv-3 / P1-3 + P1-4 + P1-8] 授权边界对抗实测
    // --------------------------------------------------------------------------
    console.log("[Adv-3] Commercial License Boundary Invariants (Ed25519 Offline Engine)");

    const signer = new EphemeralTestSigner();
    await signer.init();

    const originalSpki = LicenseManager.PUBLIC_KEY_SPKI;
    LicenseManager.PUBLIC_KEY_SPKI = signer.publicKeySpkiBase64;
    LicenseManager._cachedPublicKey = null;

    try {
      // 1. P1-3: 用 Ed25519 签发一张合法签名的 tier: "FREE" 令牌
      const freeToken = await signer.createSignedLicense({
        sub: "free-attacker@test.com",
        tier: "FREE",
        exp: Math.floor(Date.now() / 1000) + 86400 * 30,
        iat: Math.floor(Date.now() / 1000)
      });

      await mockChrome.storage.local.set({ bhm_license_key: freeToken });
      const freeStatus = await LicenseManager.checkProStatus(mockChrome.storage.local);
      assert.strictEqual(freeStatus.isPro, false, "tier='FREE' token must NEVER unlock Pro (P1-3)");
      assert.strictEqual(freeStatus.tier, "FREE");
      const freeRemQuota = await LicenseManager.getRemainingQuota("FREE", mockChrome.storage.local);
      assert.strictEqual(freeRemQuota, 10, "Free tier quota must be strictly 10 (finite, not Infinity)");
      console.log("  ✓ [Adv-3.1] Signed tier='FREE' token strictly evaluated as isPro=false with finite 10 quota");

      // 2. P1-4: 签发一张缺少 exp 字段的 tier: "SINGLE_WASH" 令牌
      const noExpWashToken = await signer.createSignedLicense({
        sub: "wash-forever@test.com",
        tier: "SINGLE_WASH",
        maxCleanQuota: 500,
        iat: Math.floor(Date.now() / 1000)
      });
      const noExpVerify = await LicenseManager.verifyLicense(noExpWashToken);
      assert.strictEqual(noExpVerify.valid, false, "SINGLE_WASH token without exp MUST be invalid (P1-4)");
      assert(noExpVerify.error.includes("expiration"), "Error message must state missing expiration");
      console.log("  ✓ [Adv-3.2] SINGLE_WASH license without exp strictly rejected as invalid");

      // 3. P1-8: 配额独立计量、换卡享全新额度、旧卡防重放、退回免费防刷额度
      // 3a. 在 FREE 下消耗 10 条配额
      const consumeFree = await LicenseManager.consumeQuota(10, mockChrome.storage.local);
      assert.strictEqual(consumeFree.success, true);
      const freeAfter10 = await LicenseManager.getRemainingQuota("FREE", mockChrome.storage.local);
      assert.strictEqual(freeAfter10, 0, "Free quota after consuming 10 must be 0");

      // 3b. 激活第 1 张合法 SINGLE_WASH 卡
      const washCard1 = await signer.createSignedLicense({
        sub: "buyer1@test.com",
        tier: "SINGLE_WASH",
        exp: Math.floor(Date.now() / 1000) + 86400 * 30,
        maxCleanQuota: 500,
        iat: Math.floor(Date.now() / 1000)
      });
      await mockChrome.storage.local.set({ bhm_license_key: washCard1 });
      const wash1Status = await LicenseManager.checkProStatus(mockChrome.storage.local);
      assert.strictEqual(wash1Status.isPro, true);
      assert.strictEqual(wash1Status.tier, "SINGLE_WASH");
      let wash1Rem = await LicenseManager.getRemainingQuota("SINGLE_WASH", mockChrome.storage.local);
      assert.strictEqual(wash1Rem, 500, "Activating Card 1 must grant fresh 500 wash quota");

      // 3c. 消耗第 1 张卡的 500 额度至 0
      await LicenseManager.consumeQuota(500, mockChrome.storage.local);
      wash1Rem = await LicenseManager.getRemainingQuota("SINGLE_WASH", mockChrome.storage.local);
      assert.strictEqual(wash1Rem, 0, "Card 1 remaining quota must be 0 after consuming 500");

      // 3d. 激活第 2 张全新签名的 SINGLE_WASH 卡 -> 享全新 500 额度
      const washCard2 = await signer.createSignedLicense({
        sub: "buyer1_card2@test.com",
        tier: "SINGLE_WASH",
        exp: Math.floor(Date.now() / 1000) + 86400 * 60,
        maxCleanQuota: 500,
        iat: Math.floor(Date.now() / 1000)
      });
      await mockChrome.storage.local.set({ bhm_license_key: washCard2 });
      const wash2Status = await LicenseManager.checkProStatus(mockChrome.storage.local);
      assert.strictEqual(wash2Status.isPro, true);
      let wash2Rem = await LicenseManager.getRemainingQuota("SINGLE_WASH", mockChrome.storage.local);
      assert.strictEqual(wash2Rem, 500, "Purchasing/activating Card 2 must grant a fresh 500 quota units");

      // 3e. 重新粘贴回第 1 张已耗尽的旧卡 -> 防重放刷额度，配额依然为 0
      await mockChrome.storage.local.set({ bhm_license_key: washCard1 });
      await LicenseManager.checkProStatus(mockChrome.storage.local);
      let replayedRem = await LicenseManager.getRemainingQuota("SINGLE_WASH", mockChrome.storage.local);
      assert.strictEqual(replayedRem, 0, "Replayed exhausted Card 1 MUST maintain 0 quota (Anti-Replay P1-8)");

      // 3f. 撤销授权退回 FREE -> 免费额度依然为 0（防退回刷免费额度）
      await mockChrome.storage.local.remove(["bhm_license_key"]);
      const freeReturned = await LicenseManager.checkProStatus(mockChrome.storage.local);
      assert.strictEqual(freeReturned.isPro, false);
      assert.strictEqual(freeReturned.tier, "FREE");
      const freeReturnedRem = await LicenseManager.getRemainingQuota("FREE", mockChrome.storage.local);
      assert.strictEqual(freeReturnedRem, 0, "Reverting to FREE tier must retain 0 remaining free quota (Anti-Abuse)");

      console.log("  ✓ [Adv-3.3] Per-card quota isolation, anti-replay, and anti-downgrade abuse 100% verified.\n");
    } finally {
      LicenseManager.PUBLIC_KEY_SPKI = originalSpki;
      LicenseManager._cachedPublicKey = null;
    }

    // --------------------------------------------------------------------------
    // Adv-4: [Adv-4] mock_chrome 移动原子性与失败保持原位实测
    // --------------------------------------------------------------------------
    console.log("[Adv-4] Bookmark Move Atomicity: Bookmark Retained on Invalid Destination");

    const atomicBm = await mockChrome.bookmarks.create({
      parentId: "1",
      title: "Atomic Bookmark Item",
      url: "https://atomic.test.org"
    });
    const beforeNode = (await mockChrome.bookmarks.get(atomicBm.id))[0];
    assert.strictEqual(beforeNode.parentId, "1");
    const originalSlot = beforeNode.index;

    // 对书签调用 SafetyManager.moveBookmarkWithThrottling 移向不存在的父文件夹
    const failedMoveRes = await SafetyManager.moveBookmarkWithThrottling(
      atomicBm.id,
      { parentId: "non_existent_folder_999" },
      0
    );

    assert.strictEqual(failedMoveRes.success, false, "Moving to invalid folder must fail");
    assert(failedMoveRes.error !== undefined, "Failure must provide an informative error message");

    // 严格断言：书签依然完好留在原父目录原索引处，绝不凭空消失
    const afterNode = (await mockChrome.bookmarks.get(atomicBm.id))[0];
    assert(afterNode !== undefined, "Bookmark must NOT vanish on failed move");
    assert.strictEqual(afterNode.parentId, "1", "Bookmark must remain in original parent folder '1'");
    assert.strictEqual(afterNode.index, originalSlot, "Bookmark must remain at original slot index");

    const rootChildren = await mockChrome.bookmarks.getChildren("1");
    assert(rootChildren.some(c => c.id === atomicBm.id), "Bookmark must be present in root children listing");
    console.log("  ✓ [Adv-4] Move failure cleanly retained bookmark in parent '1' at exact slot; 0 node loss.\n");

    // --------------------------------------------------------------------------
    // Adv-5: [P0-A + P1-2] 真实 dashboard.js 回收站/快照防复吸 & 中英切语言零空夹增殖
    // --------------------------------------------------------------------------
    console.log("[Adv-5] Real dashboard.js Quarantine Re-ingestion Shield (P0-A) & Cross-Language Reuse (P1-2)");

    const mock2 = new MockChrome();
    mock2.installGlobal();

    const activeGoogle = await mock2.bookmarks.create({ parentId: "1", title: "Google Cloud", url: "https://cloud.google.com/" });
    const activeOther = await mock2.bookmarks.create({ parentId: "1", title: "HN", url: "https://news.ycombinator.com/" });
    const trashDir = await mock2.bookmarks.create({ parentId: "1", title: "🗑️ 待清理死链回收站 (BHM)" });
    await updateSystemFolders({ trashId: trashDir.id });
    const deadInTrash1 = await mock2.bookmarks.create({ parentId: trashDir.id, title: "Dead Google Link", url: "https://cloud.google.com/404-dead" });
    const deadInTrash2 = await mock2.bookmarks.create({ parentId: trashDir.id, title: "Dead Custom Link", url: "https://expired-site.org/gone" });
    const snapDir = await mock2.bookmarks.create({ parentId: "1", title: "🕰️ [快照恢复] 2026-11-07" });
    const snapBm = await mock2.bookmarks.create({ parentId: snapDir.id, title: "Archived Link", url: "https://github.com/microsoft/vscode" });

    // 1. loadActiveBookmarksFromChrome 必须严格只返回 2 条活跃书签，绝不包含回收站 2 条与快照恢复 1 条
    const loaded1 = await loadActiveBookmarksFromChrome();
    const loadedIds1 = loaded1.bookmarks.map(b => b.id);
    assert.deepStrictEqual(loadedIds1, [activeGoogle.id, activeOther.id], "loadActiveBookmarksFromChrome must exclude Quarantine & Snapshot subtrees (P0-A)");
    assert(!loadedIds1.includes(deadInTrash1.id) && !loadedIds1.includes(deadInTrash2.id) && !loadedIds1.includes(snapBm.id));

    // 2. 中文模式下执行归拢 -> 回收站死链绝不被搬出
    await BHM_I18N.setLang("zh");
    const zhCls = new EcosystemClassifier(ECOSYSTEM_RULES, { lang: "zh" });
    const safety2 = new SafetyManager(mock2.storage.local);
    const reorgZh = await reorganizeBookmarksInChrome(zhCls.classifyAll(loaded1.bookmarks), {
      safetyManagerInstance: safety2,
      SafetyManagerClass: SafetyManager,
      EcosystemClassifierClass: EcosystemClassifier,
      i18n: BHM_I18N,
      throttleMs: 0
    });
    assert.strictEqual(reorgZh.movedCount, 2);
    assert.strictEqual(reorgZh.failedCount, 0);

    const trashAfterReorg = await mock2.bookmarks.getChildren(trashDir.id);
    assert.deepStrictEqual(
      trashAfterReorg.map(c => c.id),
      [deadInTrash1.id, deadInTrash2.id],
      "Dead links inside Quarantine MUST remain untouched after Reorganize (0 re-ingestion!)"
    );

    // 3. 切换语言至 EN 后再次执行归拢 -> 100% 复用已有全部层级文件夹，0 新建空夹 (P1-2)
    await BHM_I18N.setLang("en");
    const enCls = new EcosystemClassifier(ECOSYSTEM_RULES, { lang: "en" });
    const loaded2 = await loadActiveBookmarksFromChrome();
    const reorgEn = await reorganizeBookmarksInChrome(enCls.classifyAll(loaded2.bookmarks), {
      safetyManagerInstance: safety2,
      SafetyManagerClass: SafetyManager,
      EcosystemClassifierClass: EcosystemClassifier,
      i18n: BHM_I18N,
      throttleMs: 0
    });
    assert.strictEqual(
      reorgEn.createdFolderIds.length,
      0,
      `Switching ZH -> EN and reorganizing must reuse existing folders with 0 newly created folders, got ${reorgEn.createdFolderIds.length}`
    );
    console.log("  ✓ [Adv-5] Quarantine & Snapshot subtrees 100% shielded from re-ingestion; ZH->EN reorganize created 0 duplicate folders.\n");

    // --------------------------------------------------------------------------
    // Adv-6: [P0-C / QA T3] 真实 dashboard.js 归拢中途 move 失败精确捕获与诚实统计
    // --------------------------------------------------------------------------
    console.log("[Adv-6] Real dashboard.js Reorganize Partial Move Failure Detection (QA T3 / P0-C)");

    const mock3 = new MockChrome();
    mock3.installGlobal();
    const b1 = await mock3.bookmarks.create({ parentId: "1", title: "AWS Console", url: "https://console.aws.amazon.com/" });
    const b2 = await mock3.bookmarks.create({ parentId: "1", title: "OpenAI API", url: "https://platform.openai.com/" });
    const b3 = await mock3.bookmarks.create({ parentId: "1", title: "Cloudflare Dash", url: "https://dash.cloudflare.com/" });

    // 拦截 b2 的 move 强制模拟中途同步冲突报错
    const origMove3 = mock3.bookmarks.move;
    mock3.bookmarks.move = function (id, dest, cb) {
      if (id === b2.id) {
        mock3.lastError = { message: "Simulated sync conflict on bookmark move" };
        if (cb) cb(null);
        return Promise.resolve(null);
      }
      return origMove3.call(mock3.bookmarks, id, dest, cb);
    };

    const loaded3 = await loadActiveBookmarksFromChrome();
    const safety3 = new SafetyManager(mock3.storage.local);
    const reorgPartial = await reorganizeBookmarksInChrome(enCls.classifyAll(loaded3.bookmarks), {
      safetyManagerInstance: safety3,
      SafetyManagerClass: SafetyManager,
      EcosystemClassifierClass: EcosystemClassifier,
      i18n: BHM_I18N,
      throttleMs: 0
    });

    assert.strictEqual(reorgPartial.movedCount, 2, "Must report exact succeeded move count (2)");
    assert.strictEqual(reorgPartial.failedCount, 1, "Must catch and report failed move count (1) instead of swallowing");
    assert.strictEqual(reorgPartial.failedItems[0].id, b2.id, "Failed item ID must match b2");
    const b2NodeAfter = (await mock3.bookmarks.get(b2.id))[0];
    assert.strictEqual(b2NodeAfter.parentId, "1", "Failed bookmark b2 must remain safely in its original parent '1'");
    console.log("  ✓ [Adv-6] Reorganize caught move failure (movedCount=2, failedCount=1) and preserved failed bookmark in place.\n");

    mock3.uninstallGlobal();
    console.log("================================================================================");
    console.log("🎉 ALL 6 ADVERSARIAL HARDENING SUITE INVARIANTS PASSED (SUITE-13 100% PASS)!");
    console.log("================================================================================\n");
  } catch (err) {
    mockChrome.uninstallGlobal();
    throw err;
  }
}

module.exports = { runRound2AdversarialTests };

if (require.main === module) {
  runRound2AdversarialTests().catch((err) => {
    console.error("❌ Adversarial test failed:", err);
    process.exit(1);
  });
}
