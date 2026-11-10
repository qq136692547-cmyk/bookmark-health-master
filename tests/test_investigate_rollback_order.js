const assert = require("node:assert");
const { MockChrome } = require("./helpers/mock_chrome.js");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");

async function investigate() {
  console.log("=== EMPIRICAL ROOT CAUSE INVESTIGATION FOR ROLLBACK INDEX CORRUPTION ===\n");

  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  // Test Case: Folder with 10 bookmarks [B0..B9]
  const folder = await mockChrome.bookmarks.create({ parentId: "1", title: "Test Folder" });
  for (let i = 0; i < 10; i++) {
    await mockChrome.bookmarks.create({ id: `B${i}`, parentId: folder.id, title: `B${i}`, url: `https://b${i}.com` });
  }

  const trash = await mockChrome.bookmarks.create({ parentId: "1", title: "Trash" });

  // Move items B1, B4, B7 to trash
  // Remaining in folder: [B0, B2, B3, B5, B6, B8, B9]
  const moves = [
    { id: "B1", oldParentId: folder.id, oldIndex: 1, newParentId: trash.id, newIndex: 0 },
    { id: "B4", oldParentId: folder.id, oldIndex: 4, newParentId: trash.id, newIndex: 1 },
    { id: "B7", oldParentId: folder.id, oldIndex: 7, newParentId: trash.id, newIndex: 2 },
  ];

  for (const m of moves) {
    await mockChrome.bookmarks.move(m.id, { parentId: m.newParentId });
  }

  const currentInFolder = (await mockChrome.bookmarks.getSubTree(folder.id))[0].children.map(c => c.id);
  console.log("Current in folder before rollback:", currentInFolder);

  // Run current SafetyManager.rollbackJournal
  const safety = new SafetyManager(mockChrome.storage.local);
  const journal = await safety.recordJournal("QUARANTINE_DEAD", moves);
  await safety.rollbackJournal(journal.id);

  const restoredCurrent = (await mockChrome.bookmarks.getSubTree(folder.id))[0].children.map(c => c.id);
  console.log("Restored with CURRENT SafetyManager implementation:");
  console.log("Actual:  ", restoredCurrent);
  console.log("Expected:", ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"]);

  const mismatches = [];
  for (let i = 0; i < 10; i++) {
    if (restoredCurrent[i] !== `B${i}`) {
      mismatches.push(`Index ${i}: expected B${i}, got ${restoredCurrent[i]}`);
    }
  }
  console.log("Mismatches with CURRENT implementation:", mismatches);
  assert.strictEqual(mismatches.length, 0, `SafetyManager rollback must have 0 mismatches: ${mismatches.join(", ")}`);
  assert.deepStrictEqual(
    restoredCurrent,
    ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"],
    "SafetyManager rollback must restore exact original order"
  );

  // Now test the Ascending oldIndex algorithm:
  // Reset folder
  for (let i = 0; i < 10; i++) {
    await mockChrome.bookmarks.remove(`B${i}`);
  }
  for (let i = 0; i < 10; i++) {
    await mockChrome.bookmarks.create({ id: `B${i}`, parentId: folder.id, title: `B${i}`, url: `https://b${i}.com` });
  }
  for (const m of moves) {
    await mockChrome.bookmarks.move(m.id, { parentId: m.newParentId });
  }

  // Restore using Ascending oldIndex order
  const fixedMoves = [...moves].sort((a, b) => (a.oldIndex ?? 0) - (b.oldIndex ?? 0));
  for (const m of fixedMoves) {
    await mockChrome.bookmarks.move(m.id, { parentId: m.oldParentId, index: m.oldIndex });
  }

  const restoredFixed = (await mockChrome.bookmarks.getSubTree(folder.id))[0].children.map(c => c.id);
  console.log("\nRestored with ASCENDING oldIndex algorithm:");
  console.log("Actual:  ", restoredFixed);
  console.log("Expected:", ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"]);

  assert.deepStrictEqual(
    restoredFixed,
    ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"],
    "Ascending oldIndex must achieve 100% position fidelity"
  );
  console.log("Did ascending oldIndex restore 100% cleanly? YES! PERFECT FIDELITY!");

  mockChrome.uninstallGlobal();
}

investigate().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
