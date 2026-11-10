// tests/challenger_empirical/test_index_corruption.mjs
console.log('=== EMPIRICAL TEST: PARTIAL MUTATION ROLLBACK INDEX CORRUPTION ===\n');

// Model Chrome Bookmarks folder ordering behavior
class Folder {
  constructor(name) {
    this.name = name;
    this.children = [];
  }
}

const sourceFolder = new Folder('Source Folder');
const targetFolder = new Folder('Target Folder');

// Add 10 bookmarks to source folder [B0, B1, B2, B3, B4, B5, B6, B7, B8, B9]
for (let i = 0; i < 10; i++) {
  sourceFolder.children.push(`B${i}`);
}

console.log('Original Source Folder:', [...sourceFolder.children]);

// Simulate batch move of first 5 items [B0..B4] to target folder
// Transaction journal records all 10 items intended to be moved:
const plannedTxItems = [];
for (let i = 0; i < 10; i++) {
  plannedTxItems.push({
    id: `B${i}`,
    previousParent: 'Source Folder',
    previousIndex: i,
    newParent: 'Target Folder',
    newIndex: i
  });
}

// User moves only 5 items, then process crashes!
for (let i = 0; i < 5; i++) {
  const item = plannedTxItems[i];
  const idx = sourceFolder.children.indexOf(item.id);
  sourceFolder.children.splice(idx, 1);
  targetFolder.children.push(item.id);
}

console.log('After Crash (5 items moved, 5 items remain):');
console.log('  Source Folder:', [...sourceFolder.children]);
console.log('  Target Folder:', [...targetFolder.children]);

// Now user clicks "Undo" in UI
// TransactionJournal.rollback() reverses items and calls chrome.bookmarks.move(item.id, { parentId: item.previousParentId, index: item.previousIndex })
console.log('\nExecuting TransactionJournal.rollback() [in reverse order B9 down to B0]...');

const reversedTx = [...plannedTxItems].reverse();
for (const item of reversedTx) {
  // If item is in Target Folder, move it back to Source Folder at previousIndex
  // BUT if item was NEVER moved (B5..B9), it is ALREADY in Source Folder!
  const inTarget = targetFolder.children.indexOf(item.id);
  if (inTarget !== -1) {
    targetFolder.children.splice(inTarget, 1);
    sourceFolder.children.splice(item.previousIndex, 0, item.id);
  } else {
    // Item is in Source Folder already!
    // In Chrome: chrome.bookmarks.move(item.id, { parentId: sourceFolder, index: item.previousIndex })
    const currentIdx = sourceFolder.children.indexOf(item.id);
    sourceFolder.children.splice(currentIdx, 1);
    sourceFolder.children.splice(item.previousIndex, 0, item.id);
  }
}

console.log('After Rollback completed:');
console.log('  Source Folder Result:  ', [...sourceFolder.children]);
console.log('  Expected Original:     ', ['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9']);

const matches = JSON.stringify(sourceFolder.children) === JSON.stringify(['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9']);
console.log(`\nDid original order restore cleanly? ${matches ? 'YES' : 'NO - INDEX CORRUPTION OCCURRED!'}`);
