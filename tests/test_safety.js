const assert = require("node:assert");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");
const { MockChrome } = require("./helpers/mock_chrome.js");

async function runSafetyTests() {
  console.log("▶ [Test Suite] SafetyManager Engine & Move Journal Tests");

  // --------------------------------------------------------------------------
  // Test 1: Serialize tree to Netscape HTML (Tier 1)
  // --------------------------------------------------------------------------
  const sampleTree = {
    title: "书签栏",
    children: [
      {
        title: "测试分类",
        children: [
          { title: "Google", url: "https://www.google.com" },
          { title: "GitHub & Projects", url: "https://github.com?q=a<b&x=1" }
        ]
      }
    ]
  };

  const html = SafetyManager.serializeToNetscapeHtml(sampleTree);
  console.log(`  ✓ Netscape HTML serialized: length = ${html.length} chars`);
  assert(html.includes("<!DOCTYPE NETSCAPE-Bookmark-file-1>"), "Must include Netscape doc header");
  assert(html.includes("HREF=\"https://www.google.com\""), "Must include Google bookmark href");
  assert(html.includes(">Google</A>"), "Must render Google title");
  assert(html.includes("&amp;"), "Must escape ampersand in URL/title");
  assert(html.includes("&lt;"), "Must escape angle brackets in URL/title");

  // --------------------------------------------------------------------------
  // Test 2: Create Snapshot & Snapshot Storage Management (Tier 1)
  // --------------------------------------------------------------------------
  const mockStorageMap = {};
  const mockStorage = {
    get: (keys, cb) => {
      const res = {};
      const arr = Array.isArray(keys) ? keys : [keys];
      arr.forEach(k => { if (mockStorageMap[k] !== undefined) res[k] = mockStorageMap[k]; });
      cb(res);
    },
    set: (obj, cb) => {
      Object.assign(mockStorageMap, JSON.parse(JSON.stringify(obj)));
      cb();
    }
  };

  const safety = new SafetyManager(mockStorage);
  const snap1 = await safety.createSnapshot(sampleTree, "全量快照 #1");
  console.log(`  ✓ Snapshot created: ID = ${snap1.id}, bytes = ${snap1.sizeBytes}`);
  assert(snap1.id.startsWith("snap_"), "Snapshot ID must start with snap_");
  assert.strictEqual(snap1.label, "全量快照 #1");

  const list = await safety.getSnapshots();
  console.log(`  ✓ Retrieved snapshots count = ${list.length}`);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, snap1.id);

  // --------------------------------------------------------------------------
  // Test 3: Record Move Journal (Move Journal oldParentId & oldIndex Tracking) (Tier 1)
  // --------------------------------------------------------------------------
  const moves = [
    {
      id: "bm_101",
      title: "Dead Link 1",
      url: "https://dead1.com",
      oldParentId: "folder_dev",
      oldIndex: 2,
      newParentId: "folder_trash",
      newIndex: 0
    },
    {
      id: "bm_102",
      title: "Dead Link 2",
      url: "https://dead2.com",
      oldParentId: "folder_dev",
      oldIndex: 5,
      newParentId: "folder_trash",
      newIndex: 1
    }
  ];

  const journal = await safety.recordJournal("QUARANTINE_DEAD", moves);
  console.log(`  ✓ Move Journal recorded: ID = ${journal.id}, action = ${journal.actionType}, count = ${journal.count}`);
  assert(journal.id.startsWith("journal_"));
  assert.strictEqual(journal.actionType, "QUARANTINE_DEAD");
  assert.strictEqual(journal.count, 2);
  assert.strictEqual(journal.moves[0].oldIndex, 2);
  assert.strictEqual(journal.moves[1].oldIndex, 5);

  const latestJournal = await safety.getLatestJournal();
  assert(latestJournal !== null);
  assert.strictEqual(latestJournal.id, journal.id);

  // Test findOriginalLocation helper
  const orig101 = await safety.findOriginalLocation("bm_101");
  console.log(`  ✓ findOriginalLocation: bm_101 -> parent=${orig101.oldParentId}, index=${orig101.oldIndex}`);
  assert.strictEqual(orig101.oldParentId, "folder_dev");
  assert.strictEqual(orig101.oldIndex, 2);

  const origUnknown = await safety.findOriginalLocation("bm_9999");
  assert.strictEqual(origUnknown, null);

  // --------------------------------------------------------------------------
  // Test 4: Atomic Original-Position Rollback (Tier 1)
  // --------------------------------------------------------------------------
  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  // Create folder_dev and folder_trash
  await mockChrome.bookmarks.create({ id: "folder_dev", parentId: "1", title: "Dev Folder" });
  await mockChrome.bookmarks.create({ id: "folder_trash", parentId: "1", title: "Trash Folder" });

  // Place bookmarks in folder_trash (representing quarantined items)
  await mockChrome.bookmarks.create({ id: "bm_101", parentId: "folder_trash", title: "Dead Link 1", url: "https://dead1.com" });
  await mockChrome.bookmarks.create({ id: "bm_102", parentId: "folder_trash", title: "Dead Link 2", url: "https://dead2.com" });

  // Attach mock storage to safety manager with the recorded journal
  const safetyWithChrome = new SafetyManager(mockChrome.storage.local);
  await safetyWithChrome.recordJournal("QUARANTINE_DEAD", moves);

  let progressCalled = 0;
  const rollbackRes = await safetyWithChrome.rollbackJournal(journal.id, (done, total) => {
    progressCalled++;
  });

  console.log(`  ✓ Rollback executed: success = ${rollbackRes.success}, count = ${rollbackRes.count}`);
  assert.strictEqual(rollbackRes.success, true);
  assert.strictEqual(rollbackRes.count, 2);
  assert.strictEqual(progressCalled, 2);

  // Verify bookmarks were moved back to folder_dev
  const check101 = (await mockChrome.bookmarks.get("bm_101"))[0];
  const check102 = (await mockChrome.bookmarks.get("bm_102"))[0];
  assert.strictEqual(check101.parentId, "folder_dev");
  assert.strictEqual(check102.parentId, "folder_dev");

  // Verify journal was cleared from storage after rollback
  const remainingJournal = await safetyWithChrome.getLatestJournal();
  assert.strictEqual(remainingJournal, null, "Journal must be removed from storage after successful rollback");

  // --------------------------------------------------------------------------
  // Test 5 (Boundary/Tier 2): Rollback with Deleted Parent Folder (Anti-Corruption & Error Retention)
  // --------------------------------------------------------------------------
  const orphanedMoves = [
    {
      id: "bm_orphan",
      title: "Orphan Link",
      url: "https://orphan.org",
      oldParentId: "non_existent_folder_id",
      oldIndex: 0,
      newParentId: "folder_trash",
      newIndex: 0
    }
  ];

  await mockChrome.bookmarks.create({ id: "bm_orphan", parentId: "folder_trash", title: "Orphan Link", url: "https://orphan.org" });
  const orphanJournal = await safetyWithChrome.recordJournal("QUARANTINE_DEAD", orphanedMoves);

  const fallbackRes = await safetyWithChrome.rollbackJournal(orphanJournal.id);
  console.log(`  ✓ Orphan missing parent rollback: success = ${fallbackRes.success}, count = ${fallbackRes.count}`);
  assert.strictEqual(fallbackRes.success, false, "Must return success: false when old parent does not exist");
  assert.strictEqual(fallbackRes.count, 0, "Rolled back count must be 0 when parent is missing");
  assert(Array.isArray(fallbackRes.failures) && fallbackRes.failures.length > 0, "Must detail failures list");

  const orphanCheck = (await mockChrome.bookmarks.get("bm_orphan"))[0];
  assert.notStrictEqual(orphanCheck.parentId, "1", "Must NOT fallback to Bookmarks Bar ('1') when old parent does not exist");
  assert.strictEqual(orphanCheck.parentId, "folder_trash", "Orphan bookmark must remain in quarantine folder");

  // Verify journal was preserved in storage with partial: true
  const preservedJournal = await safetyWithChrome.getLatestJournal();
  assert(preservedJournal !== null, "Journal must be retained in storage on rollback failure");
  assert.strictEqual(preservedJournal.id, orphanJournal.id, "Retained journal ID must match");
  assert.strictEqual(preservedJournal.partial, true, "Retained journal must be marked partial: true");
  assert.strictEqual(preservedJournal.lastError, "父目录不存在", "Retained journal must record lastError");

  // Clean up orphan journal for subsequent tests
  await new Promise((r) => mockChrome.storage.local.set({ bhm_journals: [] }, r));

  // --------------------------------------------------------------------------
  // Test 6 (Boundary/Tier 2): Parent-Grouped Ascending Rollback & Position Fidelity
  // --------------------------------------------------------------------------
  // Create a dedicated folder with 10 items to rigorously verify that non-contiguous
  // rollback maintains 100% position fidelity alongside surviving bookmarks.
  const folderFidelity = await mockChrome.bookmarks.create({ id: "folder_fidelity", parentId: "1", title: "Fidelity Dev Folder" });
  const devBaselines = [];
  for (let i = 0; i < 10; i++) {
    const id = (i === 1) ? "item_a" : (i === 4) ? "item_b" : (i === 7) ? "item_c" : `survivor_${i}`;
    await mockChrome.bookmarks.create({ id, parentId: folderFidelity.id, title: id, url: `https://test.com/${id}` });
    devBaselines.push(id);
  }

  // Move item_a, item_b, item_c to trash folder
  await mockChrome.bookmarks.move("item_a", { parentId: "folder_trash" });
  await mockChrome.bookmarks.move("item_b", { parentId: "folder_trash" });
  await mockChrome.bookmarks.move("item_c", { parentId: "folder_trash" });

  // Supply moves in arbitrary/scrambled order to prove sorting resilience
  const orderedMoves = [
    { id: "item_c", oldParentId: "folder_fidelity", oldIndex: 7, newParentId: "folder_trash", newIndex: 2 },
    { id: "item_a", oldParentId: "folder_fidelity", oldIndex: 1, newParentId: "folder_trash", newIndex: 0 },
    { id: "item_b", oldParentId: "folder_fidelity", oldIndex: 4, newParentId: "folder_trash", newIndex: 1 }
  ];

  const orderLog = [];
  const originalMove = mockChrome.bookmarks.move;
  mockChrome.bookmarks.move = (id, dest, cb) => {
    orderLog.push({ id, index: dest.index, parentId: dest.parentId });
    return originalMove(id, dest, cb);
  };

  const orderJournal = await safetyWithChrome.recordJournal("ECOSYSTEM_REORGANIZE", orderedMoves);
  await safetyWithChrome.rollbackJournal(orderJournal.id);

  console.log(`  ✓ Rollback executed in ascending order: [${orderLog.map(x => `${x.id}@${x.index}`).join(", ")}]`);
  assert.strictEqual(orderLog.length, 3, "Must execute rollback for all 3 moved items");
  assert.strictEqual(orderLog[0].id, "item_a", "Lowest oldIndex item must be rolled back first");
  assert.strictEqual(orderLog[0].index, 1, "Must restore item_a to original index 1");
  assert.strictEqual(orderLog[1].id, "item_b", "Middle oldIndex item must be rolled back second");
  assert.strictEqual(orderLog[1].index, 4, "Must restore item_b to original index 4");
  assert.strictEqual(orderLog[2].id, "item_c", "Highest oldIndex item must be rolled back third");
  assert.strictEqual(orderLog[2].index, 7, "Must restore item_c to original index 7");

  // Verify 100% position fidelity in the restored folder against original baseline
  const restoredFidelityChildren = (await mockChrome.bookmarks.getSubTree("folder_fidelity"))[0].children;
  assert.strictEqual(restoredFidelityChildren.length, 10, "Restored folder must contain exactly 10 bookmarks");
  for (let i = 0; i < 10; i++) {
    assert.strictEqual(
      restoredFidelityChildren[i].id,
      devBaselines[i],
      `Position mismatch at index ${i}: expected ${devBaselines[i]}, got ${restoredFidelityChildren[i].id}`
    );
    assert.strictEqual(restoredFidelityChildren[i].index, i, `Index field mismatch at slot ${i}`);
  }
  console.log("  ✓ 100% position fidelity confirmed across all surviving & restored bookmarks in folder_fidelity");

  mockChrome.bookmarks.move = originalMove;

  // --------------------------------------------------------------------------
  // Test 7 (P0-1 Feature): Target Sequence Alignment when Sibling Node is Deleted
  // --------------------------------------------------------------------------
  console.log("  • Test 7: Target Sequence Alignment with deleted sibling (P0-1)");
  const folderSeq = await mockChrome.bookmarks.create({ id: "folder_seq", parentId: "1", title: "Sequence Test Folder" });
  for (let i = 0; i < 4; i++) {
    await mockChrome.bookmarks.create({ id: `seq_${i}`, parentId: folderSeq.id, title: `Seq ${i}`, url: `https://seq${i}.com` });
  }

  // Pre-move snapshot capture using captureMoves
  const capturedSeqMoves = await SafetyManager.captureMoves(["seq_0", "seq_1", "seq_2"]);
  assert.strictEqual(capturedSeqMoves.length, 3);
  assert.deepStrictEqual(capturedSeqMoves[0].oldChildren, ["seq_0", "seq_1", "seq_2", "seq_3"]);

  // Move seq_0, seq_1, seq_2 to trash
  await mockChrome.bookmarks.move("seq_0", { parentId: "folder_trash" });
  await mockChrome.bookmarks.move("seq_1", { parentId: "folder_trash" });
  await mockChrome.bookmarks.move("seq_2", { parentId: "folder_trash" });

  // Simulate external user action: user permanently deletes seq_1
  await mockChrome.bookmarks.remove("seq_1");

  // Record journal with capturedMoves
  const seqJournal = await safetyWithChrome.recordJournal("QUARANTINE_DEAD", capturedSeqMoves);
  const seqRollbackRes = await safetyWithChrome.rollbackJournal(seqJournal.id);
  assert.strictEqual(seqRollbackRes.success, true, "Rollback must succeed");

  // With target sequence alignment, folder_seq should contain [seq_0, seq_2, seq_3] in exact order (no seq_2/seq_3 inversion)
  const finalSeqChildren = (await mockChrome.bookmarks.getChildren(folderSeq.id)).map(c => c.id);
  console.log(`  ✓ Restored sequence without deleted sibling: [${finalSeqChildren.join(", ")}]`);
  assert.deepStrictEqual(finalSeqChildren, ["seq_0", "seq_2", "seq_3"], "Must preserve relative sequence without index drift");

  // --------------------------------------------------------------------------
  // Test 8 (P0-1 Feature): Pre-Deleting Empty Created Folders Eliminates index: 0 Shift
  // --------------------------------------------------------------------------
  console.log("  • Test 8: Pre-deleting empty createdFolderIds (P0-1)");
  const createdEmptyFolder = await mockChrome.bookmarks.create({
    id: "created_folder_root",
    parentId: "1",
    index: 0,
    title: "📁 书签健康管理总目录"
  });

  const reorgMoves = await SafetyManager.captureMoves(["seq_0"]);
  await mockChrome.bookmarks.move("seq_0", { parentId: "folder_trash" });

  const reorgJournal = await safetyWithChrome.recordMoves("ECOSYSTEM_REORGANIZE", reorgMoves, ["created_folder_root"]);
  assert(reorgJournal.createdFolderIds.includes("created_folder_root"));

  const reorgRollbackRes = await safetyWithChrome.rollbackJournal(reorgJournal.id);
  assert.strictEqual(reorgRollbackRes.success, true);

  // Check that created_folder_root was pre-deleted
  const checkCreated = (await mockChrome.bookmarks.get("created_folder_root"))[0];
  assert.strictEqual(checkCreated, undefined, "Empty created folder must be removed during rollback");
  console.log("  ✓ Empty created folder pre-deleted and index 0 offset eliminated.");

  // --------------------------------------------------------------------------
  // Test 9: Fallback Rollback (no oldChildren) Move Failure & Partial State Retention
  // --------------------------------------------------------------------------
  console.log("  • Test 9: Fallback rollback move failure & partial state retention");
  const fallbackParent = await mockChrome.bookmarks.create({
    id: "folder_fallback_parent",
    parentId: "1",
    title: "Fallback Parent"
  });
  const folderTrash = await mockChrome.bookmarks.create({
    id: "folder_trash_fb",
    parentId: "1",
    title: "Trash"
  });
  await mockChrome.bookmarks.create({
    id: "bm_fallback_fail",
    parentId: folderTrash.id,
    title: "Fail Bookmark",
    url: "https://fail.com"
  });

  const fallbackJournal = {
    id: "journal_fallback_fail",
    actionType: "QUARANTINE_DEAD",
    timestamp: Date.now(),
    dateString: new Date().toLocaleString(),
    count: 1,
    createdFolderIds: [],
    moves: [
      {
        id: "bm_fallback_fail",
        oldParentId: fallbackParent.id,
        oldIndex: 0
      }
    ]
  };

  await new Promise((r) => mockChrome.storage.local.set({ bhm_journals: [fallbackJournal] }, r));

  const origMove = mockChrome.bookmarks.move.bind(mockChrome.bookmarks);
  mockChrome.bookmarks.move = (id, dest, cb) => {
    if (id === "bm_fallback_fail") {
      mockChrome.runtime.lastError = { message: "Simulated quota error" };
      return cb(null);
    }
    origMove(id, dest, cb);
  };

  let fallbackFailRes;
  try {
    fallbackFailRes = await safetyWithChrome.rollbackJournal("journal_fallback_fail");
  } finally {
    mockChrome.bookmarks.move = origMove;
    mockChrome.runtime.lastError = null;
  }

  assert.strictEqual(fallbackFailRes.success, false, "Must return success: false when fallback move fails");
  assert.strictEqual(fallbackFailRes.count, 0, "Rolled back count must be 0");
  assert.strictEqual(fallbackFailRes.failures.length, 1, "Must capture 1 failure in failures array");
  assert.strictEqual(fallbackFailRes.failures[0].id, "bm_fallback_fail", "Failure entry must record correct bookmark id");
  assert.strictEqual(fallbackFailRes.failures[0].oldParentId, fallbackParent.id, "Failure entry must record oldParentId");
  assert.strictEqual(fallbackFailRes.failures[0].error, "Simulated quota error", "Failure entry must record error message");

  const preservedFallbackJournal = await safetyWithChrome.getLatestJournal();
  assert(preservedFallbackJournal !== null, "Journal must be retained in storage on fallback move failure");
  assert.strictEqual(preservedFallbackJournal.partial, true, "Retained journal must be marked partial: true");
  assert.strictEqual(preservedFallbackJournal.status, "PARTIAL", "Retained journal status must be PARTIAL");
  assert.strictEqual(preservedFallbackJournal.failures[0].id, "bm_fallback_fail", "Retained journal failures must have valid id");
  console.log("  ✓ Fallback rollback failure & partial state retention verified");

  mockChrome.uninstallGlobal();

  console.log("✅ SafetyManager & Move Journal tests passed!\n");
}

module.exports = { runSafetyTests };

if (require.main === module) {
  runSafetyTests().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
}
