const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(typeStr, dataBuf) {
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);

  const crcData = Buffer.concat([typeBuf, dataBuf]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function convertToRgb24Png(inputPngPath, outputPngPath, expectedW, expectedH) {
  const buf = fs.readFileSync(inputPngPath);
  if (buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Not a PNG file: ' + inputPngPath);
  }

  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatChunks = [];

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.slice(offset + 4, offset + 8).toString('ascii');
    const data = buf.slice(offset + 8, offset + 8 + len);
    offset += 8 + len + 4;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (width !== expectedW || height !== expectedH) {
    throw new Error(`Dimension mismatch: expected ${expectedW}x${expectedH}, got ${width}x${height}`);
  }

  const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : null);
  if (!bpp || bitDepth !== 8) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const compressed = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressed);

  const stride = width * bpp;
  const raw = Buffer.alloc(width * height * bpp);
  let srcOffset = 0;

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[srcOffset++];
    const prevRowOffset = (y - 1) * stride;
    const curRowOffset = y * stride;

    for (let x = 0; x < stride; x++) {
      const byteVal = decompressed[srcOffset++];
      const a = x >= bpp ? raw[curRowOffset + x - bpp] : 0;
      const b = y > 0 ? raw[prevRowOffset + x] : 0;
      const c = (x >= bpp && y > 0) ? raw[prevRowOffset + x - bpp] : 0;

      let val = 0;
      if (filterType === 0) {
        val = byteVal;
      } else if (filterType === 1) {
        val = (byteVal + a) & 0xff;
      } else if (filterType === 2) {
        val = (byteVal + b) & 0xff;
      } else if (filterType === 3) {
        val = (byteVal + Math.floor((a + b) / 2)) & 0xff;
      } else if (filterType === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = 0;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        else pr = c;
        val = (byteVal + pr) & 0xff;
      }
      raw[curRowOffset + x] = val;
    }
  }

  // Extract 24-bit RGB (discarding alpha if present)
  const rgbBuf = Buffer.alloc(width * height * 3);
  if (colorType === 6) {
    for (let i = 0; i < width * height; i++) {
      rgbBuf[i * 3 + 0] = raw[i * 4 + 0];
      rgbBuf[i * 3 + 1] = raw[i * 4 + 1];
      rgbBuf[i * 3 + 2] = raw[i * 4 + 2];
    }
  } else {
    raw.copy(rgbBuf);
  }

  // Filter 0 (None) for all rows
  const rowSize = 1 + width * 3;
  const filtered = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    filtered[y * rowSize] = 0;
    rgbBuf.copy(filtered, y * rowSize + 1, y * width * 3, (y + 1) * width * 3);
  }

  const outCompressed = zlib.deflateSync(filtered, { level: 9 });

  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bitDepth = 8
  ihdrData.writeUInt8(2, 9); // colorType = 2 (RGB 24-bit, NO Alpha)
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const idatChunk = makeChunk('IDAT', outCompressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const outBuf = Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPngPath, outBuf);
  console.log(`[OK] Generated 24-bit RGB PNG: ${path.basename(outputPngPath)} (${width}x${height}, ${outBuf.length} bytes)`);
}

const tasks = [
  {
    html: path.join(__dirname, 'board-01.html'),
    temp: path.join(__dirname, 'temp_01.png'),
    out: path.join(__dirname, '..', 'screenshots', '01-health-scan-doh.png'),
    w: 1280,
    h: 800
  },
  {
    html: path.join(__dirname, 'board-02.html'),
    temp: path.join(__dirname, 'temp_02.png'),
    out: path.join(__dirname, '..', 'screenshots', '02-16-titans-organizer.png'),
    w: 1280,
    h: 800
  },
  {
    html: path.join(__dirname, 'board-03.html'),
    temp: path.join(__dirname, 'temp_03.png'),
    out: path.join(__dirname, '..', 'screenshots', '03-time-machine-undo.png'),
    w: 1280,
    h: 800
  },
  {
    html: path.join(__dirname, 'board-04.html'),
    temp: path.join(__dirname, 'temp_04.png'),
    out: path.join(__dirname, '..', 'screenshots', '04-native-sidepanel.png'),
    w: 1280,
    h: 800
  },
  {
    html: path.join(__dirname, 'board-promo.html'),
    temp: path.join(__dirname, 'temp_promo.png'),
    out: path.join(__dirname, '..', 'promo', 'promo-tile-440x280.png'),
    w: 440,
    h: 280
  }
];

for (const t of tasks) {
  console.log(`\nRendering ${path.basename(t.html)} to ${path.basename(t.out)}...`);
  const chromeCmd = `"${CHROME_PATH}" --headless=new --screenshot="${t.temp}" --window-size=${t.w},${t.h} --hide-scrollbars --force-device-scale-factor=1 "file:///${t.html.replace(/\\/g, '/')}"`;
  execSync(chromeCmd);
  convertToRgb24Png(t.temp, t.out, t.w, t.h);
  // Clean up temp
  if (fs.existsSync(t.temp)) {
    fs.unlinkSync(t.temp);
  }
}

console.log('\nAll visual assets generated successfully!');
