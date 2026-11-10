const fs = require('fs');
const zlib = require('zlib');

// CRC32 table for PNG chunk checksums
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

function convertToRgb24Png(inputPngPath, outputPngPath) {
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
    offset += 8 + len + 4; // len + type(4) + data(len) + crc(4)

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

  console.log(`Original PNG: ${width}x${height}, bitDepth=${bitDepth}, colorType=${colorType}`);

  if (bitDepth !== 8) {
    throw new Error('Unsupported bit depth: ' + bitDepth);
  }
  if (colorType !== 2 && colorType !== 6) {
    throw new Error('Unsupported color type: ' + colorType);
  }

  const bpp = colorType === 6 ? 4 : 3;
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

  // Extract pure RGB (discarding alpha or keeping as is)
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

  // Re-encode into 24-bit RGB PNG (Filter 0: None)
  const rowSize = 1 + width * 3;
  const filtered = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    filtered[y * rowSize] = 0; // Filter None
    rgbBuf.copy(filtered, y * rowSize + 1, y * width * 3, (y + 1) * width * 3);
  }

  const outCompressed = zlib.deflateSync(filtered, { level: 9 });

  // PNG Signature
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk: 13 bytes
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bitDepth = 8
  ihdrData.writeUInt8(2, 9); // colorType = 2 (RGB 24-bit)
  ihdrData.writeUInt8(0, 10); // compression = 0
  ihdrData.writeUInt8(0, 11); // filter = 0
  ihdrData.writeUInt8(0, 12); // interlace = 0
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', outCompressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const outBuf = Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPngPath, outBuf);

  console.log(`Successfully encoded 24-bit RGB PNG: ${outputPngPath} (${outBuf.length} bytes)`);
}

// Quick self-test
const testIn = 'd:\\谷歌反重力空间\\基本日常\\cws-store-assets\\_generator\\test.png';
const testOut = 'd:\\谷歌反重力空间\\基本日常\\cws-store-assets\\_generator\\test_rgb24.png';
convertToRgb24Png(testIn, testOut);

const resBuf = fs.readFileSync(testOut);
console.log('Result verify:');
console.log('Width:', resBuf.readUInt32BE(16));
console.log('Height:', resBuf.readUInt32BE(20));
console.log('Bit depth:', resBuf.readUInt8(24));
console.log('Color type:', resBuf.readUInt8(25));
