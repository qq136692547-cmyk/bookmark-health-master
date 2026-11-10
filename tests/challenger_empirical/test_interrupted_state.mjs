// tests/challenger_empirical/test_interrupted_state.mjs
import { performance } from 'node:perf_hooks';

console.log('=== EMPIRICAL STRESS TEST 3: INTERRUPTED STATE & TRANSACTION ATOMICITY ===\n');

// Mock Chrome Bookmarks store
class MockChromeBookmarks {
  constructor() {
    this.nodes = new Map();
    // Setup root and folders
    this.nodes.set('0', { id: '0', title: 'root', children: ['1', '2'] });
    this.nodes.set('1', { id: '1', parentId: '0', title: 'Bookmarks Bar', children: [] });
    this.nodes.set('2', { id: '2', parentId: '0', title: 'Other Bookmarks', children: [] });
  }

  createFolder(id, title, parentId) {
    this.nodes.set(id, { id, title, parentId, children: [] });
    const p = this.nodes.get(parentId);
    if (p) p.children.push(id);
  }

  createBookmark(id, title, url, parentId) {
    this.nodes.set(id, { id, title, url, parentId });
    const p = this.nodes.get(parentId);
    if (p) p.children.push(id);
  }

  async move(id, destination) {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Bookmark with id ${id} not found`);
    const oldParent = this.nodes.get(node.parentId);
    if (oldParent) {
      oldParent.children = oldParent.children.filter(cId => cId !== id);
    }
    const newParent = this.nodes.get(destination.parentId);
    if (!newParent) throw new Error(`Destination parent ${destination.parentId} not found`);
    
    if (destination.index !== undefined && destination.index >= 0) {
      newParent.children.splice(destination.index, 0, id);
    } else {
      newParent.children.push(id);
    }
    node.parentId = destination.parentId;
    return node;
  }
}

// Populate 1,200 bookmarks scattered across 10 folders
const chromeBm = new MockChromeBookmarks();
for (let f = 1; f <= 10; f++) {
  chromeBm.createFolder(`folder_${f}`, `Category ${f}`, '1');
}

const allBookmarks = [];
for (let i = 1; i <= 1200; i++) {
  const folderId = `folder_${(i % 10) + 1}`;
  const bm = {
    id: `bm_${i}`,
    title: `Google Cloud Service ${i}`,
    url: `https://cloud.google.com/item/${i}`,
    parentId: folderId,
    index: chromeBm.nodes.get(folderId).children.length
  };
  chromeBm.createBookmark(bm.id, bm.title, bm.url, bm.parentId);
  allBookmarks.push(bm);
}

// Create destination ecosystem folder
chromeBm.createFolder('google_eco', '🌐 谷歌官方全生态 (Google Ecosystem)', '1');

console.log(`Initial state: 1,200 bookmarks created across 10 folders.`);
console.log(`Target: Reorganize all 1,200 into 'google_eco' folder.`);

// SIMULATE: Batch mutation with crash at item 450
const BATCH_SIZE = 15;
const mutationItems = allBookmarks.map((bm, idx) => ({
  bookmarkId: bm.id,
  previousParentId: bm.parentId,
  previousIndex: bm.index,
  previousTitle: bm.title,
  previousUrl: bm.url,
  newParentId: 'google_eco',
  newIndex: idx
}));

// Case 1: Pre-commit Journaling (Journal saved BEFORE execution begins)
// If UI crashes at item 450:
console.log('\n--- Scenario A: Crash at item 450 with Pre-Committed Journal ---');
let movedCount = 0;
const CRASH_AT = 450;

try {
  for (let i = 0; i < mutationItems.length; i++) {
    if (i === CRASH_AT) {
      throw new Error(`CRASH: Side Panel process terminated / closed by user at item ${i}!`);
    }
    const item = mutationItems[i];
    await chromeBm.move(item.bookmarkId, { parentId: item.newParentId, index: item.newIndex });
    movedCount++;
  }
} catch (err) {
  console.log(`[SIMULATED CRASH OCCURRED]: ${err.message}`);
}

console.log(`Items moved before crash: ${movedCount}`);
const googleEcoChildrenAfterCrash = chromeBm.nodes.get('google_eco').children.length;
console.log(`Items currently in 'google_eco' folder: ${googleEcoChildrenAfterCrash}`);

// Now user reopens Side Panel and clicks "Undo"
console.log('\nAttempting Rollback using Journal (which recorded all 1,200 items)...');
let rollbackSuccess = 0;
let rollbackErrors = 0;

const reversedItems = [...mutationItems].reverse();
for (const item of reversedItems) {
  try {
    // Check where the item actually is
    const currentNode = chromeBm.nodes.get(item.bookmarkId);
    // Rollback tries to move it back to previousParentId
    await chromeBm.move(item.bookmarkId, {
      parentId: item.previousParentId,
      index: item.previousIndex
    });
    rollbackSuccess++;
  } catch (err) {
    rollbackErrors++;
  }
}

console.log(`Rollback completed: ${rollbackSuccess} succeeded, ${rollbackErrors} errors.`);
const googleEcoChildrenAfterRollback = chromeBm.nodes.get('google_eco').children.length;
console.log(`Items remaining in 'google_eco' after rollback: ${googleEcoChildrenAfterRollback}`);

// Check folder 1 integrity after rollback
let totalInOriginalFolders = 0;
for (let f = 1; f <= 10; f++) {
  totalInOriginalFolders += chromeBm.nodes.get(`folder_${f}`).children.length;
}
console.log(`Total bookmarks back in original folders: ${totalInOriginalFolders} of 1,200`);

// Case 2: Post-Commit Journaling (Journal saved AFTER all items are moved)
console.log('\n--- Scenario B: Post-Commit Journaling (Worker saved journal after loop) ---');
console.log('If crash occurs at item 450 before journal is saved to db.undo_logs:');
console.log('Result: ZERO undo records exist in IndexedDB! The 450 items are permanently orphaned in the new folder without any undo capability!');

// Case 3: Scan resume cursor invalidation
console.log('\n--- Scenario C: Scan Checkpoint Cursor Invalidation ---');
const totalScan = 8000;
const pausedAt = 3421;
console.log(`Scan paused at item ${pausedAt} of ${totalScan}. Bookmark ID: 'bm_3421'.`);
console.log('Simulating: User deletes or moves 10 bookmarks in Chrome natively while Side Panel was closed...');
// If a user deletes bookmark 'bm_3421' in Chrome:
const deletedId = 'bm_3421';
console.log(`Bookmark '${deletedId}' was deleted in native Chrome bookmarks.`);
console.log(`When resume is triggered, getBookmark('${deletedId}') throws error: 'Bookmark not found'.`);
console.log(`If index-based offset (3421) is used instead of ID: the entire remaining bookmark offset shifts by -1, causing 1 bookmark to be skipped or re-checked!`);
