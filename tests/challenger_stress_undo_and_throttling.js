// ============================================================================
// Challenger Stress Harness: Move Journal Atomic Undo & Flow Control
// Tests:
//   1. Hundreds of non-contiguous bookmarks across 5 folder structures
//   2. 100% Position Fidelity verification (no shifted indices, no dropped items, no duplicates)
//   3. Micro-batch serial flow control & throttling intervals (Chromium Sync safety)
//   4. Adversarial edge cases: deleted items, deleted target folders, multi-journal LIFO
// ============================================================================

const assert = require("node:assert");
const { performance } = require("node:perf_hooks");
const { MockChrome } = require("./helpers/mock_chrome.js");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");

async function runChallengerStressTests() {
  console.log("================================================================================");
  console.log("  CHALLENGER 1: EMPIRICAL STRESS & CONCURRENCY HARNESS");
  console.log("================================================================================\n");

  let totalAssertions = 0;

  // ==========================================================================
  // SECTION 1: Move Journal & Atomic Undo Under Non-Contiguous Stress
  // ==========================================================================
  console.log("▶ [Test 1] Non-Contiguous Multi-Folder Move & 100% Position Fidelity Rollback");

  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  const folderNames = ["Folder_Alpha", "Folder_Beta", "Folder_Gamma", "Folder_Delta", "Folder_Epsilon"];
  const folderNodes = [];
  const folderBaselines = new Map(); // folderId -> [bmId0, bmId1, ...]
  const ITEMS_PER_FOLDER = 100;

  // 1. Setup 5 folders with 100 bookmarks each (Total 500 bookmarks)
  for (const name of folderNames) {
    const folder = await mockChrome.bookmarks.create({ parentId: "1", title: name });
    folderNodes.push(folder);

    const baselineIds = [];
    for (let i = 0; i < ITEMS_PER_FOLDER; i++) {
      const bmId = `${name}_bm_${String(i).padStart(3, "0")}`;
      const bm = await mockChrome.bookmarks.create({
        id: bmId,
        parentId: folder.id,
        title: `Bookmark ${name} #${i}`,
        url: `https://${name.toLowerCase()}.internal/doc/${i}`
      });
      baselineIds.push(bm.id);
    }
    folderBaselines.set(folder.id, baselineIds);
  }

  // Create Quarantine / Trash target folders
  const trashFolder1 = await mockChrome.bookmarks.create({ parentId: "1", title: "Target Trash 1" });
  const trashFolder2 = await mockChrome.bookmarks.create({ parentId: "1", title: "Target Trash 2" });

  console.log(`  ✓ Initialized 5 folders with ${ITEMS_PER_FOLDER} items each (500 total bookmarks).`);

  // 2. Select non-contiguous subsets of bookmarks from each folder
  // E.g. every 2nd or 3rd item, pseudo-random non-contiguous distribution (40 items per folder = 200 items moved)
  const plannedMoves = [];
  const movedIdSet = new Set();
  let moveIdx = 0;

  for (const folder of folderNodes) {
    const baseline = folderBaselines.get(folder.id);
    // Pick non-contiguous indices: [1, 4, 6, 9, 11, 14, 16, 19, 21, 24, ...] (every ~2.5 items)
    const indicesToMove = [];
    for (let i = 0; i < ITEMS_PER_FOLDER; i++) {
      if ((i % 5 === 1) || (i % 5 === 4)) { // 40 items per 100
        indicesToMove.push(i);
      }
    }

    // Move in arbitrary order (simulating real-world batching)
    for (const originalIndex of indicesToMove) {
      const bmId = baseline[originalIndex];
      movedIdSet.add(bmId);
      const targetTrash = (moveIdx % 2 === 0) ? trashFolder1.id : trashFolder2.id;

      // Note: In Chrome, liveNode.index changes dynamically as previous items are removed,
      // but SafetyManager records originalIndex / oldIndex from initial capture or live node.
      // We test the exact pattern recorded by dashboard.js: { id, oldParentId, oldIndex: originalIndex, newParentId, newIndex }
      plannedMoves.push({
        id: bmId,
        title: `Bookmark ${folder.title} #${originalIndex}`,
        url: `https://${folder.title.toLowerCase()}.internal/doc/${originalIndex}`,
        oldParentId: folder.id,
        oldIndex: originalIndex,
        newParentId: targetTrash,
        newIndex: moveIdx++
      });
    }
  }

  assert.strictEqual(plannedMoves.length, 200, "Must have exactly 200 non-contiguous moved items");
  totalAssertions++;

  // 3. Perform the moves
  for (const m of plannedMoves) {
    await mockChrome.bookmarks.move(m.id, { parentId: m.newParentId });
  }

  // Verify items are now in trash folders
  const trash1Items = (await mockChrome.bookmarks.getSubTree(trashFolder1.id))[0].children;
  const trash2Items = (await mockChrome.bookmarks.getSubTree(trashFolder2.id))[0].children;
  assert.strictEqual(trash1Items.length + trash2Items.length, 200);
  totalAssertions++;

  // Verify source folders have only 60 items each remaining
  for (const folder of folderNodes) {
    const currentChildren = (await mockChrome.bookmarks.getSubTree(folder.id))[0].children;
    assert.strictEqual(currentChildren.length, 60, `Folder ${folder.title} must have 60 items remaining`);
    totalAssertions++;
  }

  // 4. Record pre-commit journal and trigger atomic rollback
  const safety = new SafetyManager(mockChrome.storage.local);
  const journal = await safety.recordJournal("QUARANTINE_DEAD", plannedMoves);
  console.log(`  ✓ Move Journal recorded with ${journal.count} non-contiguous operations.`);

  const rollbackStart = performance.now();
  let progressUpdates = 0;
  const rollbackResult = await safety.rollbackJournal(journal.id, (done, total) => {
    progressUpdates++;
  });
  const rollbackDuration = performance.now() - rollbackStart;

  console.log(`  ✓ Rollback completed in ${rollbackDuration.toFixed(1)}ms: count = ${rollbackResult.count}`);
  assert.strictEqual(rollbackResult.success, true);
  assert.strictEqual(rollbackResult.count, 200);
  assert.strictEqual(progressUpdates, 200);
  totalAssertions += 3;

  // 5. EMPIRICAL VERIFICATION OF 100% POSITION FIDELITY:
  // - Verify trash folders are 0 items
  // - Verify each folder has EXACTLY 100 items
  // - Verify each folder's items match the original baseline EXACTLY at every single index 0..99
  const finalTrash1 = (await mockChrome.bookmarks.getSubTree(trashFolder1.id))[0].children;
  const finalTrash2 = (await mockChrome.bookmarks.getSubTree(trashFolder2.id))[0].children;
  assert.strictEqual(finalTrash1.length, 0, "Target Trash 1 must be completely empty");
  assert.strictEqual(finalTrash2.length, 0, "Target Trash 2 must be completely empty");
  totalAssertions += 2;

  let totalFidelityErrors = 0;
  let fidelityLog = [];

  for (const folder of folderNodes) {
    const tree = (await mockChrome.bookmarks.getSubTree(folder.id))[0];
    const currentChildren = tree.children;
    const baseline = folderBaselines.get(folder.id);

    assert.strictEqual(currentChildren.length, ITEMS_PER_FOLDER, `Folder ${folder.title} must have exactly ${ITEMS_PER_FOLDER} items`);
    totalAssertions++;

    for (let i = 0; i < ITEMS_PER_FOLDER; i++) {
      const expectedId = baseline[i];
      const actualNode = currentChildren[i];

      if (!actualNode || actualNode.id !== expectedId) {
        totalFidelityErrors++;
        fidelityLog.push(`[INDEX MISMATCH] Folder: ${folder.title}, index: ${i}, expected: ${expectedId}, actual: ${actualNode ? actualNode.id : "NONE"}`);
      }
    }
  }

  if (totalFidelityErrors > 0) {
    console.error("❌ POSITION FIDELITY ERRORS FOUND:\n" + fidelityLog.slice(0, 10).join("\n"));
  }
  assert.strictEqual(totalFidelityErrors, 0, `All 500 bookmarks must restore with 100% position fidelity (Errors: ${totalFidelityErrors})`);
  totalAssertions++;
  console.log("  ✅ 100% Position Fidelity confirmed: 500 / 500 items restored to exact original indices with 0 shifts, 0 drops, 0 duplicates.\n");

  // ==========================================================================
  // SECTION 2: Micro-Batch Serial Flow Control & Throttling Verification
  // ==========================================================================
  console.log("▶ [Test 2] Micro-Batch Serial Flow Control & Throttling Enforcement");

  // Intercept chrome.bookmarks.move and record invocation timestamps
  const moveTimestamps = [];
  let concurrentExecutions = 0;
  let maxConcurrentMoves = 0;

  const originalMove = mockChrome.bookmarks.move;
  mockChrome.bookmarks.move = function (id, dest, cb) {
    concurrentExecutions++;
    if (concurrentExecutions > maxConcurrentMoves) {
      maxConcurrentMoves = concurrentExecutions;
    }
    moveTimestamps.push(performance.now());

    // Simulate small async Chromium IPC latency
    setTimeout(() => {
      concurrentExecutions--;
      originalMove.call(mockChrome.bookmarks, id, dest, cb);
    }, 5);
  };

  const THROTTLE_DELAY_MS = 50;
  const BATCH_TEST_COUNT = 15;
  const testItemsForThrottling = [];

  for (let i = 0; i < BATCH_TEST_COUNT; i++) {
    const item = await originalMove.call(mockChrome.bookmarks, folderBaselines.get(folderNodes[0].id)[i], { parentId: trashFolder1.id });
    testItemsForThrottling.push(item);
  }

  // Clear tracking arrays before testing throttled method
  moveTimestamps.length = 0;
  maxConcurrentMoves = 0;

  const batchStart = performance.now();
  for (let i = 0; i < BATCH_TEST_COUNT; i++) {
    await SafetyManager.moveBookmarkWithThrottling(
      testItemsForThrottling[i].id,
      { parentId: folderNodes[0].id, index: i },
      THROTTLE_DELAY_MS
    );
  }
  const batchTotalDuration = performance.now() - batchStart;

  // Restore original move
  mockChrome.bookmarks.move = originalMove;

  console.log(`  ✓ Throttled batch executed ${BATCH_TEST_COUNT} calls in ${batchTotalDuration.toFixed(1)}ms`);
  console.log(`  ✓ Max concurrent Chromium move operations: ${maxConcurrentMoves} (Target: 1, strictly serial)`);

  assert.strictEqual(maxConcurrentMoves, 1, "Throttled moves must be strictly serial (max concurrency = 1)");
  totalAssertions++;

  // Verify intervals between consecutive move calls
  const intervals = [];
  for (let i = 1; i < moveTimestamps.length; i++) {
    intervals.push(moveTimestamps[i] - moveTimestamps[i - 1]);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const minInterval = Math.min(...intervals);
  console.log(`  ✓ Average delay between consecutive calls: ${avgInterval.toFixed(1)}ms (Configured: ${THROTTLE_DELAY_MS}ms, min: ${minInterval.toFixed(1)}ms)`);

  assert(minInterval >= 40, `Throttling must enforce at least 40ms spacing between calls (Actual min: ${minInterval.toFixed(1)}ms)`);
  assert(batchTotalDuration >= (BATCH_TEST_COUNT - 1) * THROTTLE_DELAY_MS, "Total batch time must reflect serial delay pacing");
  totalAssertions += 2;
  console.log("  ✅ Micro-batch serial flow control verified: zero burst deadlock risk.\n");

  // ==========================================================================
  // SECTION 3: Adversarial Edge Cases
  // ==========================================================================
  console.log("▶ [Test 3] Adversarial Edge Cases: Deleted Node, Deleted Parent, Multi-Journal LIFO");

  // Edge Case A: Bookmark was manually deleted before rollback is triggered
  console.log("  • Edge Case A: Bookmark deleted by user prior to rollback");
  const testNodeA = await mockChrome.bookmarks.create({ parentId: folderNodes[1].id, title: "Ghost Bookmark", url: "https://ghost.io" });
  const moveA = [{
    id: testNodeA.id,
    title: "Ghost Bookmark",
    url: "https://ghost.io",
    oldParentId: folderNodes[1].id,
    oldIndex: 5,
    newParentId: trashFolder1.id,
    newIndex: 0
  }];
  await mockChrome.bookmarks.move(testNodeA.id, { parentId: trashFolder1.id });
  const journalA = await safety.recordJournal("QUARANTINE_DEAD", moveA);

  // User deletes the bookmark in Chrome
  await mockChrome.bookmarks.remove(testNodeA.id);

  // Rollback should not crash, but gracefully handle the missing node
  const resA = await safety.rollbackJournal(journalA.id);
  assert.strictEqual(resA.success, true);
  assert.strictEqual(resA.count, 0, "Missing node must be skipped without aborting rollback");
  totalAssertions += 2;
  console.log("    ✓ Gracefully handled missing bookmark during rollback.");

  // Edge Case B: Target parent folder deleted prior to rollback (Anti-Corruption & Error Retention)
  console.log("  • Edge Case B: Original parent folder deleted prior to rollback");
  const tempFolder = await mockChrome.bookmarks.create({ parentId: "1", title: "Doomed Folder" });
  const testNodeB = await mockChrome.bookmarks.create({ parentId: tempFolder.id, title: "Safe Bookmark", url: "https://safe.io" });
  const moveB = [{
    id: testNodeB.id,
    title: "Safe Bookmark",
    url: "https://safe.io",
    oldParentId: tempFolder.id,
    oldIndex: 0,
    newParentId: trashFolder1.id,
    newIndex: 0
  }];
  await mockChrome.bookmarks.move(testNodeB.id, { parentId: trashFolder1.id });
  const journalB = await safety.recordJournal("QUARANTINE_DEAD", moveB);

  // Delete the original parent folder
  await mockChrome.bookmarks.remove(tempFolder.id);

  // Rollback should NOT fallback to Bookmarks Bar (parentId: '1'), must report failure and retain journal
  const resB = await safety.rollbackJournal(journalB.id);
  assert.strictEqual(resB.success, false, "Must return success: false when original parent folder is deleted");
  assert.strictEqual(resB.count, 0, "Rolled back count must be 0 for orphan bookmark");
  assert(Array.isArray(resB.failures) && resB.failures.length > 0, "Must record failure details");

  const checkB = (await mockChrome.bookmarks.get(testNodeB.id))[0];
  assert.notStrictEqual(checkB.parentId, "1", "Must NOT fallback to Bookmarks Bar ('1') when original folder deleted");
  assert.strictEqual(checkB.parentId, trashFolder1.id, "Bookmark must remain in quarantine trash folder");

  const storedJB = await safety.getLatestJournal();
  assert(storedJB !== null, "Journal must be preserved in storage on failure");
  assert.strictEqual(storedJB.id, journalB.id, "Preserved journal ID must match");
  assert.strictEqual(storedJB.partial, true, "Preserved journal must be marked partial: true");
  assert.strictEqual(storedJB.lastError, "父目录不存在", "Preserved journal must record lastError");
  totalAssertions += 6;
  console.log("    ✓ Anti-corruption confirmed: missing parent returns success: false, no corruption to root, journal preserved.");

  // Edge Case C: Multi-Journal Rollback Order (LIFO)
  console.log("  • Edge Case C: Multi-Journal stack ordering");
  const j1 = await safety.recordJournal("QUARANTINE_DEAD", [{ id: "bm_x1", oldParentId: "1", oldIndex: 0, newParentId: "2", newIndex: 0 }]);
  const j2 = await safety.recordJournal("ECOSYSTEM_REORGANIZE", [{ id: "bm_x2", oldParentId: "1", oldIndex: 1, newParentId: "2", newIndex: 1 }]);

  const latestJ = await safety.getLatestJournal();
  assert.strictEqual(latestJ.id, j2.id, "Latest journal must be the most recently recorded (LIFO)");
  totalAssertions++;
  console.log("    ✓ LIFO journal storage validated.");

  mockChrome.uninstallGlobal();

  console.log("\n================================================================================");
  console.log(`🎉 ALL CHALLENGER EMPIRICAL STRESS TESTS PASSED! (${totalAssertions} assertions passed)`);
  console.log("================================================================================");
}

runChallengerStressTests().catch(err => {
  console.error("❌ Challenger stress test failed:", err);
  process.exit(1);
});
