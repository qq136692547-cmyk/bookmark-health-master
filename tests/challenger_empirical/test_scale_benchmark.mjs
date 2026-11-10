// tests/challenger_empirical/test_scale_benchmark.mjs
import { performance } from 'node:perf_hooks';
import fs from 'node:fs';

console.log('=== EMPIRICAL STRESS TEST 1: SCALE & MEMORY (10,000 - 20,000 BOOKMARKS) ===\n');

// 1. Generate 20,000 realistic bookmarks in memory and as Netscape HTML
function generateMockBookmarks(count) {
  const categories = [
    'Tech/Dev/Google', 'Tech/Cloud/AWS', 'Tools/Productivity',
    'Design/Figma', 'Reading/Articles', 'Entertainment/Video',
    'Finance/Crypto', 'Social/Twitter', 'Docs/Internal', 'News/Daily'
  ];

  const domains = [
    'google.com', 'github.com', 'medium.com', 'apple.com', 'microsoft.com',
    'aliyun.com', 'feishu.cn', 'v2ex.com', 'zhihu.com', 'bilibili.com'
  ];

  const root = {
    id: '0',
    title: 'root',
    children: [
      { id: '1', title: 'Bookmarks Bar', children: [] },
      { id: '2', title: 'Other Bookmarks', children: [] }
    ]
  };

  // Create folder hierarchy
  const folderMap = new Map();
  for (const cat of categories) {
    const folder = { id: `folder_${cat}`, title: cat, children: [] };
    root.children[0].children.push(folder);
    folderMap.set(cat, folder);
  }

  const items = [];
  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length];
    const domain = domains[i % domains.length];
    const node = {
      id: `bm_${i + 1}`,
      parentId: `folder_${cat}`,
      title: `Bookmark ${i + 1} - ${domain} Resource Reference with Extended Title for Testing`,
      url: `https://${domain}/path/to/resource/${i + 1}?query=val&ref=test_scale`,
      dateAdded: Date.now() - (count - i) * 100000
    };
    folderMap.get(cat).children.push(node);
    items.push(node);
  }

  return { root, items };
}

// 2. Measure Tree serialization to Netscape HTML
function serializeNetscape(tree) {
  let out = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n` +
    `<!-- This is an automatically generated file. -->\n` +
    `<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n` +
    `<TITLE>Bookmarks</TITLE>\n` +
    `<H1>Bookmarks</H1>\n` +
    `<DL><p>\n`;

  function render(node, indent) {
    const pad = ' '.repeat(indent);
    const date = Math.floor((node.dateAdded || Date.now()) / 1000);
    if (node.url) {
      return `${pad}<DT><A HREF="${node.url}" ADD_DATE="${date}">${node.title}</A>\n`;
    }
    if (node.children) {
      let str = `${pad}<DT><H3 ADD_DATE="${date}">${node.title}</H3>\n${pad}<DL><p>\n`;
      for (const child of node.children) {
        str += render(child, indent + 4);
      }
      str += `${pad}</DL><p>\n`;
      return str;
    }
    return '';
  }

  for (const child of tree.children) {
    out += render(child, 4);
  }
  out += `</DL><p>\n`;
  return out;
}

// Run test on 10,000 and 20,000 bookmarks
for (const count of [10000, 20000]) {
  console.log(`--- Testing Scale: ${count} Bookmarks ---`);
  
  const memBefore = process.memoryUsage();
  const startGen = performance.now();
  const { root, items } = generateMockBookmarks(count);
  const genTime = performance.now() - startGen;
  
  // Tree Traversal & Flattening benchmark
  const startFlat = performance.now();
  const flattened = [];
  function flatten(node) {
    if (node.url) flattened.push(node);
    if (node.children) {
      for (const c of node.children) flatten(c);
    }
  }
  flatten(root);
  const flatTime = performance.now() - startFlat;

  // Netscape HTML serialization benchmark
  const startSer = performance.now();
  const html = serializeNetscape(root);
  const serTime = performance.now() - startSer;
  const htmlSizeBytes = Buffer.byteLength(html, 'utf8');

  // JSON serialization (chrome.bookmarks IPC simulation)
  const startJson = performance.now();
  const jsonStr = JSON.stringify(root);
  const jsonTime = performance.now() - startJson;
  const jsonSizeBytes = Buffer.byteLength(jsonStr, 'utf8');

  const memAfter = process.memoryUsage();
  const heapUsedMB = (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024);

  console.log(`  Generation time: ${genTime.toFixed(2)} ms`);
  console.log(`  Tree Flattening time: ${flatTime.toFixed(2)} ms (flattened ${flattened.length} items)`);
  console.log(`  Netscape HTML Serialization time: ${serTime.toFixed(2)} ms`);
  console.log(`  Netscape HTML Size: ${(htmlSizeBytes / (1024 * 1024)).toFixed(2)} MB (${htmlSizeBytes} bytes)`);
  console.log(`  JSON IPC Tree Size: ${(jsonSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  JSON Stringify time: ${jsonTime.toFixed(2)} ms`);
  console.log(`  Heap delta: ${heapUsedMB.toFixed(2)} MB`);

  // Storage Quota Assessment:
  // Dexie table size estimation for count items + 5 snapshots:
  const singleRecordSize = jsonSizeBytes / count;
  const snapshotSize = htmlSizeBytes;
  const fiveSnapshotsSize = snapshotSize * 5;
  const totalDexieEstMB = ((count * singleRecordSize * 2) + fiveSnapshotsSize) / (1024 * 1024);

  console.log(`  Estimated Dexie Storage (20k records + scan results + 5 snapshots): ${totalDexieEstMB.toFixed(2)} MB`);
  console.log('');
}
