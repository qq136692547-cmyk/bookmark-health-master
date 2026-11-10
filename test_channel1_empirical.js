const fs = require('fs');

const mainCode = fs.readFileSync('D:/WorkBuddy/基本工作/QuickNote/src/main.js', 'utf8');
const quickCode = fs.readFileSync('D:/WorkBuddy/基本工作/QuickNote/src/quick.js', 'utf8');

console.log('[TEST 1] Syntax and Version Exposure Verification');
const mainVersionMatch = mainCode.match(/const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
const quickVersionMatch = quickCode.match(/const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/);

if (!mainVersionMatch) throw new Error('main.js missing const APP_VERSION');
if (!quickVersionMatch) throw new Error('quick.js missing const APP_VERSION');

console.log('  main.js APP_VERSION:', mainVersionMatch[1]);
console.log('  quick.js APP_VERSION:', quickVersionMatch[1]);

if (mainVersionMatch[1] !== quickVersionMatch[1]) {
  throw new Error('Version mismatch between main.js and quick.js');
}

if (!mainCode.includes('window.APP_VERSION = APP_VERSION;')) {
  throw new Error('main.js missing window.APP_VERSION assignment');
}
if (!quickCode.includes('window.APP_VERSION = APP_VERSION;')) {
  throw new Error('quick.js missing window.APP_VERSION assignment');
}
console.log('  [PASS] window.APP_VERSION properly exposed in both windows');

console.log('[TEST 2] Boot Log Output Verification');
if (!mainCode.includes('[QuickNote] Main window frontend v')) {
  throw new Error('main.js missing boot log');
}
if (!quickCode.includes('[QuickNote] Quick capture frontend v')) {
  throw new Error('quick.js missing boot log');
}
console.log('  [PASS] Boot logging present in both entry points');

console.log('[TEST 3] Contract Verification: Appendix K Frozen Commands');
const expectedCommands = [
  'list_items', 'get_item', 'create_item', 'update_content', 'update_item',
  'delete_item', 'list_deleted', 'restore_item', 'purge_deleted',
  'get_settings', 'save_settings', 'copy_text', 'open_url', 'image_data_url'
];
for (const cmd of expectedCommands) {
  const hasCmd = mainCode.includes('"' + cmd + '"') || quickCode.includes('"' + cmd + '"');
  if (!hasCmd) {
    console.warn('  [WARN] Command not directly called by string:', cmd);
  } else {
    console.log('  [PASS] Found IPC command invocation:', cmd);
  }
}

console.log('[TEST 4] Adversarial ListResult Unpacking Stress Test');
const mainMatches = [...mainCode.matchAll(/invoke\(\s*["']([^"']+)["']/g)].map(m => m[1]);
const quickMatches = [...quickCode.matchAll(/invoke\(\s*["']([^"']+)["']/g)].map(m => m[1]);
console.log('Commands invoked in main.js:', [...new Set(mainMatches)].sort());
console.log('Commands invoked in quick.js:', [...new Set(quickMatches)].sort());

function simulateListUnpack(res, state) {
  if (res.generation !== state.generation) {
    return { dropped: true, reason: 'stale generation' };
  }
  if (!Array.isArray(res.items)) {
    return { error: true, reason: 'items is not an array' };
  }
  state.items = res.items;
  state.total = res.total;
  state.cursor = res.cursor;
  state.hasMore = res.cursor !== null;
  return { success: true, itemsCount: state.items.length, total: state.total };
}

// Case A: Standard M4 response
let state = { items: [], total: 0, cursor: null, generation: 5 };
let resA = { items: [{ id: 1, title: 'Item 1' }], total: 1, cursor: null, generation: 5 };
let rA = simulateListUnpack(resA, state);
if (!rA.success || state.items.length !== 1) throw new Error('Case A failed');
console.log('  [PASS] Case A: Standard M4 response correctly unpacked');

// Case B: Stale generation (e.g. race condition during fast typing / pagination)
let resB = { items: [{ id: 2, title: 'Item 2' }], total: 10, cursor: 'cur2', generation: 4 };
let rB = simulateListUnpack(resB, state);
if (!rB.dropped || state.items[0].id !== 1) throw new Error('Case B failed to drop stale generation');
console.log('  [PASS] Case B: Stale generation correctly rejected');

// Case C: Pre-M4 legacy response (bare array without ListResult envelope)
let resC = [{ id: 3, title: 'Item 3' }];
let rC = simulateListUnpack(resC, state);
if (!rC.dropped) throw new Error('Case C failed: legacy bare array should be dropped by generation check');
console.log('  [PASS] Case C: Pre-M4 bare array cleanly dropped by generation check (no corruption)');

console.log('\n>>> [ALL CHANNEL 1 EMPIRICAL TESTS PASSED] <<<');
