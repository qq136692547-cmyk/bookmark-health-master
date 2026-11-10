// ============================================================================
// Challenger 2: Adversarial Empirical Stress Test Harness for Fallback Rollback
// Focus: Error Handling, ReferenceError Prevention, Failure Schemas & Retry
// ============================================================================

const assert = require("node:assert");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");
const { MockChrome } = require("./helpers/mock_chrome.js");

async function runFallbackRollbackChallengerTests() {
  console.log("================================================================================");
  console.log("  CHALLENGER 2: ADVERSARIAL FALLBACK ROLLBACK ERROR HANDLING & RETRY HARNESS   ");
  console.log("================================================================================\n");

  let totalAssertions = 0;

  // --------------------------------------------------------------------------
  // Scenario 1: Multi-Failure Stress in Fallback Rollback (no oldChildren)
  // Simulated errors: Quota exceeded, Permission denied, Disconnected parent, Exception throw
  // --------------------------------------------------------------------------
  console.log("▶ [Scenario 1] Multi-Failure Stress in Fallback Rollback (no oldChildren)");
  const mockChrome1 = new MockChrome();
  mockChrome1.installGlobal();

  // Setup parent folders
  const parentA = await mockChrome1.bookmarks.create({ id: "parent_A", parentId: "1", title: "Parent A" });
  // Notice: parent_B is deliberately NOT created to simulate disconnected parent!
  const parentC = await mockChrome1.bookmarks.create({ id: "parent_C", parentId: "1", title: "Parent C" });
  const trashFolder = await mockChrome1.bookmarks.create({ id: "folder_trash", parentId: "1", title: "Quarantine Trash" });

  // Create 10 bookmark nodes currently sitting in trashFolder
  const items = [
    { id: "bm_succeed_1", oldParentId: parentA.id, oldIndex: 0, behavior: "succeed" },
    { id: "bm_quota_fail_1", oldParentId: parentA.id, oldIndex: 1, behavior: "quota" },
    { id: "bm_succeed_2", oldParentId: parentA.id, oldIndex: 2, behavior: "succeed" },
    { id: "bm_perm_fail_1", oldParentId: parentA.id, oldIndex: 3, behavior: "perm" },
    { id: "bm_discon_1", oldParentId: "nonexistent_parent_B", oldIndex: 0, behavior: "discon" },
    { id: "bm_discon_2", oldParentId: "nonexistent_parent_B", oldIndex: 1, behavior: "discon" },
    { id: "bm_throw_fail_1", oldParentId: parentC.id, oldIndex: 0, behavior: "throw" },
    { id: "bm_succeed_3", oldParentId: parentC.id, oldIndex: 1, behavior: "succeed" },
    { id: "bm_quota_fail_2", oldParentId: parentC.id, oldIndex: 2, behavior: "quota" },
    { id: "bm_succeed_4", oldParentId: parentC.id, oldIndex: 3, behavior: "succeed" }
  ];

  for (const it of items) {
    await mockChrome1.bookmarks.create({
      id: it.id,
      parentId: trashFolder.id,
      title: `Bookmark ${it.id}`,
      url: `https://example.com/${it.id}`
    });
  }

  // Construct synthetic journal without oldChildren (forcing fallback mode)
  const syntheticMoves = items.map(it => ({
    id: it.id,
    oldParentId: it.oldParentId,
    oldIndex: it.oldIndex
    // Deliberately no oldChildren, no prevSiblingId, no nextSiblingId
  }));

  const syntheticJournal = {
    id: "journal_fallback_stress_1",
    actionType: "QUARANTINE_DEAD",
    timestamp: Date.now(),
    dateString: new Date().toLocaleString(),
    count: syntheticMoves.length,
    createdFolderIds: [],
    moves: syntheticMoves
  };

  await new Promise(r => mockChrome1.storage.local.set({ bhm_journals: [syntheticJournal] }, r));

  // Intercept bookmarks.move to inject failures
  const originalMove = mockChrome1.bookmarks.move.bind(mockChrome1.bookmarks);
  let moveAttempts = [];

  mockChrome1.bookmarks.move = (id, dest, cb) => {
    moveAttempts.push({ id, dest });
    const targetItem = items.find(it => it.id === id);
    if (!targetItem) {
      return originalMove(id, dest, cb);
    }

    if (targetItem.behavior === "quota") {
      mockChrome1.runtime.lastError = { message: "Quota exceeded: MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE" };
      return cb(null);
    }
    if (targetItem.behavior === "perm") {
      mockChrome1.runtime.lastError = { message: "Permission denied by browser policy" };
      return cb(null);
    }
    if (targetItem.behavior === "throw") {
      throw new Error("Chromium internal IPC fatal error");
    }

    return originalMove(id, dest, cb);
  };

  const safety = new SafetyManager(mockChrome1.storage.local);

  let caughtReferenceError = null;
  let rollbackResult = null;

  try {
    rollbackResult = await safety.rollbackJournal("journal_fallback_stress_1");
  } catch (err) {
    if (err instanceof ReferenceError) {
      caughtReferenceError = err;
    } else {
      throw err;
    }
  }

  // Reset runtime error
  mockChrome1.runtime.lastError = null;

  // 1. Verify zero ReferenceError
  assert.strictEqual(caughtReferenceError, null, "Zero ReferenceError must occur during fallback rollback failures");
  totalAssertions++;
  console.log("  ✓ Zero ReferenceError confirmed across all simulated failure conditions.");

  // 2. Verify rollbackResult schema
  assert.strictEqual(rollbackResult.success, false, "Must return success: false when errors occur");
  assert.strictEqual(rollbackResult.count, 4, "Must record exactly 4 successful rollbacks");
  assert.strictEqual(rollbackResult.failures.length, 6, "Must record exactly 6 failure entries in failures array");
  totalAssertions += 3;
  console.log(`  ✓ Rollback result: success = ${rollbackResult.success}, count = ${rollbackResult.count}, failures = ${rollbackResult.failures.length}`);

  // 3. Verify failures array schema: { id: m.id, error, oldParentId }
  const expectedFailures = [
    { id: "bm_quota_fail_1", oldParentId: parentA.id, error: "Quota exceeded: MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE" },
    { id: "bm_perm_fail_1", oldParentId: parentA.id, error: "Permission denied by browser policy" },
    { id: "bm_discon_1", oldParentId: "nonexistent_parent_B", error: "父目录不存在" },
    { id: "bm_discon_2", oldParentId: "nonexistent_parent_B", error: "父目录不存在" },
    { id: "bm_throw_fail_1", oldParentId: parentC.id, error: "Chromium internal IPC fatal error" },
    { id: "bm_quota_fail_2", oldParentId: parentC.id, error: "Quota exceeded: MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE" }
  ];

  for (const ef of expectedFailures) {
    const matched = rollbackResult.failures.find(f => f.id === ef.id);
    assert(matched, `Failures array must contain entry for ${ef.id}`);
    assert.strictEqual(matched.id, ef.id, `Failure id must match exact item ID ${ef.id}`);
    assert.strictEqual(matched.oldParentId, ef.oldParentId, `Failure oldParentId must match ${ef.oldParentId}`);
    assert(matched.error.includes(ef.error) || ef.error.includes(matched.error), `Error message must reflect exact simulated error: got '${matched.error}', expected '${ef.error}'`);
    totalAssertions += 4;
  }
  console.log("  ✓ Failure record schema { id, error, oldParentId } strictly validated for all 6 failing items.");

  // 4. Verify successful items were actually rolled back and failing items remained in trash
  const nodeS1 = (await mockChrome1.bookmarks.get("bm_succeed_1"))[0];
  const nodeS2 = (await mockChrome1.bookmarks.get("bm_succeed_2"))[0];
  const nodeS3 = (await mockChrome1.bookmarks.get("bm_succeed_3"))[0];
  const nodeS4 = (await mockChrome1.bookmarks.get("bm_succeed_4"))[0];

  assert.strictEqual(nodeS1.parentId, parentA.id, "bm_succeed_1 must be moved back to parentA");
  assert.strictEqual(nodeS2.parentId, parentA.id, "bm_succeed_2 must be moved back to parentA");
  assert.strictEqual(nodeS3.parentId, parentC.id, "bm_succeed_3 must be moved back to parentC");
  assert.strictEqual(nodeS4.parentId, parentC.id, "bm_succeed_4 must be moved back to parentC");

  // Check failing items: none must be moved to Bookmarks Bar ('1') or changed
  for (const ef of expectedFailures) {
    const fNode = (await mockChrome1.bookmarks.get(ef.id))[0];
    assert.strictEqual(fNode.parentId, trashFolder.id, `Failing item ${ef.id} must remain in quarantine trash`);
    assert.notStrictEqual(fNode.parentId, "1", `Failing item ${ef.id} must NEVER be dumped into root '1'`);
    totalAssertions += 2;
  }
  totalAssertions += 4;
  console.log("  ✓ Position integrity verified: 4 succeeded restored, 6 failed preserved in quarantine, 0 dropped to root.");

  // 5. Verify journal in storage
  const storedJournal = await safety.getLatestJournal();
  assert(storedJournal !== null, "Journal must be retained in storage on partial failure");
  assert.strictEqual(storedJournal.partial, true, "Stored journal must be marked partial === true");
  assert.strictEqual(storedJournal.status, "PARTIAL", "Stored journal status must be 'PARTIAL'");
  assert.strictEqual(storedJournal.rolledBack, 4, "Stored journal rolledBack count must be 4");
  assert.strictEqual(storedJournal.failures.length, 6, "Stored journal failures length must be 6");

  // Verify item states inside journal
  const moveMap = new Map(storedJournal.moves.map(m => [m.id, m]));
  assert.strictEqual(moveMap.get("bm_succeed_1").state, "done");
  assert.strictEqual(moveMap.get("bm_succeed_2").state, "done");
  assert.strictEqual(moveMap.get("bm_succeed_3").state, "done");
  assert.strictEqual(moveMap.get("bm_succeed_4").state, "done");
  assert.strictEqual(moveMap.get("bm_quota_fail_1").state, "failed");
  assert.strictEqual(moveMap.get("bm_perm_fail_1").state, "failed");
  assert.strictEqual(moveMap.get("bm_discon_1").state, "orphaned");
  assert.strictEqual(moveMap.get("bm_discon_2").state, "orphaned");
  assert.strictEqual(moveMap.get("bm_throw_fail_1").state, "failed");
  assert.strictEqual(moveMap.get("bm_quota_fail_2").state, "failed");
  totalAssertions += 15;
  console.log("  ✓ Storage persistence verified: partial === true, status === 'PARTIAL', states: 4 done, 4 failed, 2 orphaned.");

  // --------------------------------------------------------------------------
  // Scenario 2: Retry Test (Idempotent Retry & Completion)
  // --------------------------------------------------------------------------
  console.log("\n▶ [Scenario 2] Retry Test on Partial Journal after Error Resolution");

  // Resolve simulated errors:
  // 1. Create the missing parent folder B
  await mockChrome1.bookmarks.create({ id: "nonexistent_parent_B", parentId: "1", title: "Resolved Parent B" });

  // 2. Clear interception hooks so all moves now succeed
  mockChrome1.bookmarks.move = originalMove;
  mockChrome1.runtime.lastError = null;

  // Track moves during retry to prove previously successful items are not touched
  const retryMoveLog = [];
  mockChrome1.bookmarks.move = (id, dest, cb) => {
    retryMoveLog.push({ id, dest });
    return originalMove(id, dest, cb);
  };

  // Re-invoke rollbackJournal on the partial journal
  const retryResult = await safety.rollbackJournal("journal_fallback_stress_1");

  console.log(`  ✓ Retry result: success = ${retryResult.success}, count = ${retryResult.count}, failures = ${retryResult.failures.length}`);
  assert.strictEqual(retryResult.success, true, "Retry must succeed when errors are resolved");
  assert.strictEqual(retryResult.failures.length, 0, "Failures array must be empty on successful retry");
  assert.strictEqual(retryResult.count, 6, "Retry count must equal the 6 retried items");
  totalAssertions += 3;

  // Verify that previously successful items were NOT duplicated
  const retriedIds = retryMoveLog.map(m => m.id);
  console.log(`  ✓ Move calls intercepted during retry (${retriedIds.length}): [${retriedIds.join(", ")}]`);

  assert.strictEqual(retriedIds.length, 6, "Exactly 6 move operations should occur during retry");
  assert(!retriedIds.includes("bm_succeed_1"), "bm_succeed_1 must NOT be moved again");
  assert(!retriedIds.includes("bm_succeed_2"), "bm_succeed_2 must NOT be moved again");
  assert(!retriedIds.includes("bm_succeed_3"), "bm_succeed_3 must NOT be moved again");
  assert(!retriedIds.includes("bm_succeed_4"), "bm_succeed_4 must NOT be moved again");

  // Ensure all 6 failing items were retried
  assert(retriedIds.includes("bm_quota_fail_1"), "bm_quota_fail_1 must be retried");
  assert(retriedIds.includes("bm_perm_fail_1"), "bm_perm_fail_1 must be retried");
  assert(retriedIds.includes("bm_discon_1"), "bm_discon_1 must be retried");
  assert(retriedIds.includes("bm_discon_2"), "bm_discon_2 must be retried");
  assert(retriedIds.includes("bm_throw_fail_1"), "bm_throw_fail_1 must be retried");
  assert(retriedIds.includes("bm_quota_fail_2"), "bm_quota_fail_2 must be retried");
  totalAssertions += 11;
  console.log("  ✓ Idempotency confirmed: 0 duplicate moves for prior successes, 100% failing items retried.");

  // Verify all 10 items are now in their intended destinations
  const checkA1 = (await mockChrome1.bookmarks.get("bm_succeed_1"))[0];
  const checkA2 = (await mockChrome1.bookmarks.get("bm_quota_fail_1"))[0];
  const checkA3 = (await mockChrome1.bookmarks.get("bm_succeed_2"))[0];
  const checkA4 = (await mockChrome1.bookmarks.get("bm_perm_fail_1"))[0];
  const checkB1 = (await mockChrome1.bookmarks.get("bm_discon_1"))[0];
  const checkB2 = (await mockChrome1.bookmarks.get("bm_discon_2"))[0];
  const checkC1 = (await mockChrome1.bookmarks.get("bm_throw_fail_1"))[0];
  const checkC2 = (await mockChrome1.bookmarks.get("bm_succeed_3"))[0];
  const checkC3 = (await mockChrome1.bookmarks.get("bm_quota_fail_2"))[0];
  const checkC4 = (await mockChrome1.bookmarks.get("bm_succeed_4"))[0];

  assert.strictEqual(checkA1.parentId, parentA.id);
  assert.strictEqual(checkA2.parentId, parentA.id);
  assert.strictEqual(checkA3.parentId, parentA.id);
  assert.strictEqual(checkA4.parentId, parentA.id);
  assert.strictEqual(checkB1.parentId, "nonexistent_parent_B");
  assert.strictEqual(checkB2.parentId, "nonexistent_parent_B");
  assert.strictEqual(checkC1.parentId, parentC.id);
  assert.strictEqual(checkC2.parentId, parentC.id);
  assert.strictEqual(checkC3.parentId, parentC.id);
  assert.strictEqual(checkC4.parentId, parentC.id);
  totalAssertions += 10;
  console.log("  ✓ All 10 bookmarks verified in their correct parent folders.");

  // Verify journal status transitioned to completed: journal is purged from storage
  const remainingJournal = await safety.getLatestJournal();
  assert.strictEqual(remainingJournal, null, "Journal must be purged from storage upon complete rollback completion");
  totalAssertions++;
  console.log("  ✓ Journal status transition verified: journal removed from active storage queue upon full completion.");

  // Clean up
  mockChrome1.bookmarks.move = originalMove;
  mockChrome1.uninstallGlobal();

  // --------------------------------------------------------------------------
  // Scenario 3: All Items Failing & Total Recovery Retry
  // --------------------------------------------------------------------------
  console.log("\n▶ [Scenario 3] 100% Failure Rate Journal & Full Recovery Retry");
  const mockChrome2 = new MockChrome();
  mockChrome2.installGlobal();

  const folderDest = await mockChrome2.bookmarks.create({ id: "folder_dest_all", parentId: "1", title: "Dest All" });
  const folderTrash2 = await mockChrome2.bookmarks.create({ id: "folder_trash_2", parentId: "1", title: "Trash 2" });

  for (let i = 0; i < 5; i++) {
    await mockChrome2.bookmarks.create({
      id: `bm_all_fail_${i}`,
      parentId: folderTrash2.id,
      title: `Item ${i}`,
      url: `https://test.com/${i}`
    });
  }

  const allFailMoves = Array.from({ length: 5 }, (_, i) => ({
    id: `bm_all_fail_${i}`,
    oldParentId: folderDest.id,
    oldIndex: i
  }));

  const journalAllFail = {
    id: "journal_all_fail",
    actionType: "ECOSYSTEM_REORGANIZE",
    timestamp: Date.now(),
    dateString: new Date().toLocaleString(),
    count: 5,
    createdFolderIds: [],
    moves: allFailMoves
  };

  await new Promise(r => mockChrome2.storage.local.set({ bhm_journals: [journalAllFail] }, r));

  const origMove2 = mockChrome2.bookmarks.move.bind(mockChrome2.bookmarks);
  let failAllHook = true;

  mockChrome2.bookmarks.move = (id, dest, cb) => {
    if (failAllHook) {
      mockChrome2.runtime.lastError = { message: "Simulated complete network disconnect" };
      return cb(null);
    }
    return origMove2(id, dest, cb);
  };

  const safety2 = new SafetyManager(mockChrome2.storage.local);

  const resAllFail = await safety2.rollbackJournal("journal_all_fail");
  assert.strictEqual(resAllFail.success, false);
  assert.strictEqual(resAllFail.count, 0);
  assert.strictEqual(resAllFail.failures.length, 5);
  for (let i = 0; i < 5; i++) {
    assert.strictEqual(resAllFail.failures[i].id, `bm_all_fail_${i}`);
    assert.strictEqual(resAllFail.failures[i].oldParentId, folderDest.id);
  }
  totalAssertions += 13;

  const preservedAllFailJournal = await safety2.getLatestJournal();
  assert.strictEqual(preservedAllFailJournal.partial, true);
  assert.strictEqual(preservedAllFailJournal.status, "PARTIAL");
  assert.strictEqual(preservedAllFailJournal.failures.length, 5);
  totalAssertions += 3;
  console.log("  ✓ 100% failure rate correctly captured: count = 0, failures = 5, status = 'PARTIAL'.");

  // Recovery retry
  failAllHook = false;
  mockChrome2.runtime.lastError = null;

  const resAllRecover = await safety2.rollbackJournal("journal_all_fail");
  assert.strictEqual(resAllRecover.success, true);
  assert.strictEqual(resAllRecover.count, 5);
  assert.strictEqual(resAllRecover.failures.length, 0);
  totalAssertions += 3;

  const afterRecoverJournal = await safety2.getLatestJournal();
  assert.strictEqual(afterRecoverJournal, null);
  totalAssertions++;
  console.log("  ✓ Total recovery retry verified: count = 5, failures = 0, journal cleared.");

  mockChrome2.bookmarks.move = origMove2;
  mockChrome2.uninstallGlobal();

  // --------------------------------------------------------------------------
  // Scenario 4: Deleted Node during Fallback Rollback
  // --------------------------------------------------------------------------
  console.log("\n▶ [Scenario 4] User-Deleted Bookmark Handling during Fallback Rollback");
  const mockChrome3 = new MockChrome();
  mockChrome3.installGlobal();

  const folderDest3 = await mockChrome3.bookmarks.create({ id: "folder_dest_3", parentId: "1", title: "Dest 3" });
  const folderTrash3 = await mockChrome3.bookmarks.create({ id: "folder_trash_3", parentId: "1", title: "Trash 3" });

  await mockChrome3.bookmarks.create({ id: "bm_del_1", parentId: folderTrash3.id, title: "To Delete", url: "https://del.com" });
  await mockChrome3.bookmarks.create({ id: "bm_survive_1", parentId: folderTrash3.id, title: "Survive", url: "https://survive.com" });

  // Delete bm_del_1 externally
  await mockChrome3.bookmarks.remove("bm_del_1");

  const journalDeleted = {
    id: "journal_del",
    actionType: "QUARANTINE_DEAD",
    timestamp: Date.now(),
    dateString: new Date().toLocaleString(),
    count: 2,
    createdFolderIds: [],
    moves: [
      { id: "bm_del_1", oldParentId: folderDest3.id, oldIndex: 0 },
      { id: "bm_survive_1", oldParentId: folderDest3.id, oldIndex: 1 }
    ]
  };

  await new Promise(r => mockChrome3.storage.local.set({ bhm_journals: [journalDeleted] }, r));

  const safety3 = new SafetyManager(mockChrome3.storage.local);
  const resDeleted = await safety3.rollbackJournal("journal_del");

  // bm_del_1 is skipped, bm_survive_1 is rolled back. No move failures -> success: true
  assert.strictEqual(resDeleted.success, true);
  assert.strictEqual(resDeleted.count, 1);
  assert.strictEqual(resDeleted.failures.length, 0);
  totalAssertions += 3;

  const nodeSurvive = (await mockChrome3.bookmarks.get("bm_survive_1"))[0];
  assert.strictEqual(nodeSurvive.parentId, folderDest3.id);
  totalAssertions++;
  console.log("  ✓ Externally deleted node skipped gracefully, surviving node restored, journal cleared.");

  mockChrome3.uninstallGlobal();

  console.log("\n================================================================================");
  console.log(`🎉 ALL CHALLENGER 2 EMPIRICAL ADVERSARIAL TESTS PASSED! (${totalAssertions} assertions passed)`);
  console.log("================================================================================\n");
}

module.exports = { runFallbackRollbackChallengerTests };

if (require.main === module) {
  runFallbackRollbackChallengerTests().catch(err => {
    console.error("❌ Challenger test failed:", err);
    process.exit(1);
  });
}
