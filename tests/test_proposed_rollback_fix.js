const assert = require("node:assert");
const { MockChrome } = require("./helpers/mock_chrome.js");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");

// Proposed rollback algorithm: delegates directly to SafetyManager.rollbackJournal
// Eliminates all pseudo-assertions and silent empty catches
async function rollbackJournalProposed(safetyManager, journalId, mockChrome) {
  const res = await safetyManager.rollbackJournal(journalId);
  assert.strictEqual(res.success, true, "Rollback must succeed without errors");
  assert(Array.isArray(res.failures) && res.failures.length === 0, "Failures list must be strictly empty");
  return res;
}

async function testProposedFix() {
  console.log("=== TESTING PROPOSED ROLLBACK ALGORITHM ACROSS 5 FOLDERS & 500 BOOKMARKS ===");

  const mockChrome = new MockChrome();
  mockChrome.installGlobal();

  const folderNames = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
  const folders = [];
  const baselines = new Map();

  for (const name of folderNames) {
    const f = await mockChrome.bookmarks.create({ parentId: "1", title: name });
    folders.push(f);
    const bms = [];
    for (let i = 0; i < 100; i++) {
      const b = await mockChrome.bookmarks.create({
        id: `${name}_${i}`,
        parentId: f.id,
        title: `BM ${name} ${i}`,
        url: `https://${name.toLowerCase()}.com/${i}`
      });
      bms.push(b.id);
    }
    baselines.set(f.id, bms);
  }

  const trash = await mockChrome.bookmarks.create({ parentId: "1", title: "Trash" });

  // Move irregular non-contiguous bookmarks: indices [1, 4, 6, 9, 11, 14, 16, 19, 25, 42, 67, 88, 99]
  const targetIndices = [1, 4, 6, 9, 11, 14, 16, 19, 25, 42, 67, 88, 99];
  const moves = [];

  for (const f of folders) {
    const baseline = baselines.get(f.id);
    for (const idx of targetIndices) {
      moves.push({
        id: baseline[idx],
        oldParentId: f.id,
        oldIndex: idx,
        newParentId: trash.id,
        newIndex: moves.length
      });
      await mockChrome.bookmarks.move(baseline[idx], { parentId: trash.id });
    }
  }

  const safety = new SafetyManager(mockChrome.storage.local);
  const journal = await safety.recordJournal("QUARANTINE_DEAD", moves);

  // Execute proposed rollback
  const res = await rollbackJournalProposed(safety, journal.id, mockChrome);
  console.log(`Proposed rollback executed: restored ${res.count} items.`);

  let totalErrors = 0;
  for (const f of folders) {
    const children = (await mockChrome.bookmarks.getSubTree(f.id))[0].children;
    const baseline = baselines.get(f.id);

    assert.strictEqual(children.length, 100, `Folder ${f.title} length must be 100`);

    for (let i = 0; i < 100; i++) {
      if (children[i].id !== baseline[i]) {
        totalErrors++;
        console.error(`Mismatch in folder ${f.title} at index ${i}: expected ${baseline[i]}, got ${children[i].id}`);
      }
    }
  }

  console.log(`\nTotal Position Fidelity Errors with Proposed Fix: ${totalErrors}`);
  assert.strictEqual(totalErrors, 0, "Proposed fix must achieve 100% position fidelity with ZERO errors!");
  console.log("🎉 PROPOSED FIX CONFIRMED: 100% POSITION FIDELITY ACHIEVED ACROSS ALL 500 BOOKMARKS!");

  mockChrome.uninstallGlobal();
}

testProposedFix().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
