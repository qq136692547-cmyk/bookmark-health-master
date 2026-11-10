const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function createPng(width, height, pixelFn) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const raw = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }
  const idatData = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// 盾牌与书签图标生成器 (圆角矩形 + 科技蓝紫渐变 + 居中白色书签/勾选徽标)
function drawShieldBookmark(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  
  // 圆角矩形裁切 (border radius ~ 22%)
  const r = 0.22;
  const dx = Math.max(Math.abs(nx - 0.5) - (0.5 - r), 0);
  const dy = Math.max(Math.abs(ny - 0.5) - (0.5 - r), 0);
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist > r) {
    return [0, 0, 0, 0]; // 透明背景
  }
  
  // 科技蓝紫渐变 (Top-Left: #3B82F6 -> Bottom-Right: #4F46E5)
  const grad = (nx + ny) / 2;
  let bgR = Math.round(37 + (79 - 37) * grad);
  let bgG = Math.round(99 + (70 - 99) * grad);
  let bgB = Math.round(235 + (229 - 235) * grad);

  // 内部微边框光泽
  const borderEdge = Math.max(Math.abs(nx - 0.5), Math.abs(ny - 0.5));
  if (borderEdge > 0.44) {
    bgR = Math.min(255, bgR + 40);
    bgG = Math.min(255, bgG + 40);
    bgB = Math.min(255, bgB + 50);
  }

  // 居中白色图形: 书签 ribbon / 盾牌徽标
  // 坐标在 [0.32, 0.22] 到 [0.68, 0.78]
  const inBookmarkX = nx >= 0.30 && nx <= 0.70;
  const inBookmarkY = ny >= 0.22 && ny <= 0.76;
  
  if (inBookmarkX && inBookmarkY) {
    // 底部燕尾剪切: y > 0.62 时如果有燕尾 V 字切口
    const ribbonV = 0.76 - Math.abs(nx - 0.5) * 0.8;
    if (ny < ribbonV) {
      // 在书签缎带内
      // 内部点缀星光/十字
      const isStar = (Math.abs(nx - 0.5) < 0.05 && ny >= 0.34 && ny <= 0.52) ||
                     (Math.abs(ny - 0.43) < 0.05 && nx >= 0.39 && nx <= 0.61);
      if (isStar) {
        return [37, 99, 235, 255]; // 核心科技蓝
      }
      return [255, 255, 255, 255]; // 洁白缎带
    }
  }

  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.join(__dirname, '..', 'bookmark-organizer', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
  const buf = createPng(size, size, drawShieldBookmark);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`✅ Generated ${outPath} (${buf.length} bytes)`);
});
