const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { spawn } = require("child_process");
const http = require("http");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_ICON = path.join(__dirname, "..", "promo", "store-icon-128x128.png");

// 512x512 canvas (= 4x supersampling of 128x128).
// Official CWS Store Icon spec: 128x128 canvas with 96x96 icon body + 16px transparent margin on all 4 sides.
// At 4x scale (512x512): 64px transparent margin on all sides, 384x384 icon body from (64,64) to (448,448).
const HTML_ICON = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 512px;
    height: 512px;
    background: transparent !important;
    overflow: hidden;
  }
</style>
</head>
<body>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Main Squircle Background Gradient -->
    <linearGradient id="bgGrad" x1="64" y1="64" x2="448" y2="448" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="45%" stop-color="#1E1B4B"/>
      <stop offset="100%" stop-color="#090D16"/>
    </linearGradient>

    <!-- Ambient Top-Left Electric Glow -->
    <radialGradient id="topGlow" cx="160" cy="130" r="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#6366F1" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
    </radialGradient>

    <!-- Ambient Bottom-Right Emerald Health Glow -->
    <radialGradient id="botGlow" cx="380" cy="390" r="210" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.42"/>
      <stop offset="60%" stop-color="#06B6D4" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
    </radialGradient>

    <!-- Outer Squircle Rim Border Gradient -->
    <linearGradient id="rimGrad" x1="64" y1="64" x2="448" y2="448" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#60A5FA" stop-opacity="0.85"/>
      <stop offset="50%" stop-color="#818CF8" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#34D399" stop-opacity="0.75"/>
    </linearGradient>

    <!-- 3D Bookmark Ribbon Primary Gradient -->
    <linearGradient id="bmGrad" x1="156" y1="116" x2="336" y2="388" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="45%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>

    <!-- Bookmark Glass Front Highlight -->
    <linearGradient id="bmGlass" x1="156" y1="116" x2="280" y2="290" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.42"/>
      <stop offset="45%" stop-color="#E0F2FE" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>

    <!-- Bookmark Edge Stroke -->
    <linearGradient id="bmStroke" x1="156" y1="116" x2="336" y2="388" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#BAE6FD" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#93C5FD" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#818CF8" stop-opacity="0.8"/>
    </linearGradient>

    <!-- Emerald Health Badge Gradient -->
    <linearGradient id="badgeGrad" x1="286" y1="266" x2="406" y2="394" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="55%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>

    <!-- Neon ECG Pulse Line Gradient -->
    <linearGradient id="pulseGrad" x1="126" y1="236" x2="366" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.2"/>
      <stop offset="20%" stop-color="#38BDF8"/>
      <stop offset="55%" stop-color="#FFFFFF"/>
      <stop offset="85%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#34D399" stop-opacity="0.2"/>
    </linearGradient>

    <!-- Drop Shadow for Bookmark -->
    <filter id="bmShadow" x="100" y="90" width="312" height="350" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#020617" flood-opacity="0.72"/>
    </filter>

    <!-- Glow Filter for ECG Pulse -->
    <filter id="pulseGlow" x="95" y="150" width="310" height="175" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Drop Shadow for Emerald Shield Badge -->
    <filter id="badgeShadow" x="250" y="245" width="185" height="185" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#020617" flood-opacity="0.8"/>
    </filter>

    <clipPath id="squircleClip">
      <rect x="64" y="64" width="384" height="384" rx="88" ry="88"/>
    </clipPath>
  </defs>

  <!-- 1. Main 384x384 Squircle Container (maps to 96x96 in 128x128 with 16px transparent margin) -->
  <g clip-path="url(#squircleClip)">
    <rect x="64" y="64" width="384" height="384" rx="88" ry="88" fill="url(#bgGrad)"/>
    <rect x="64" y="64" width="384" height="384" fill="url(#topGlow)"/>
    <rect x="64" y="64" width="384" height="384" fill="url(#botGlow)"/>

    <!-- Subtle Radar Concentric Rings for Tech Depth -->
    <circle cx="244" cy="236" r="150" stroke="#60A5FA" stroke-opacity="0.09" stroke-width="2" stroke-dasharray="8 8"/>
    <circle cx="244" cy="236" r="112" stroke="#38BDF8" stroke-opacity="0.12" stroke-width="1.5"/>

    <!-- Top Specular Glass Arc -->
    <ellipse cx="256" cy="72" rx="170" ry="44" fill="#FFFFFF" fill-opacity="0.08"/>
  </g>

  <!-- Squircle Outer Metallic Rim -->
  <rect x="67" y="67" width="378" height="378" rx="85" ry="85" stroke="url(#rimGrad)" stroke-width="6"/>
  <rect x="72" y="72" width="368" height="368" rx="80" ry="80" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="2"/>

  <!-- 2. Back Stacked Folder/Bookmark Layer (represents 16-Ecosystem Organization) -->
  <path d="M188 112 H316 C331.464 112 344 124.536 344 140 V336 L266 286 L188 336 V140 C188 124.536 200.536 112 216 112 Z"
        transform="translate(18, -10) rotate(6 266 224)"
        fill="#6366F1" fill-opacity="0.32" stroke="#A5B4FC" stroke-opacity="0.45" stroke-width="3"/>

  <!-- 3. Primary 3D Glassmorphic Bookmark Ribbon -->
  <g filter="url(#bmShadow)">
    <path d="M158 120 C158 104.536 170.536 92 186 92 H302 C317.464 92 330 104.536 330 120 V372 C330 378.8 322.1 382.6 316.7 378.4 L244 322 L171.3 378.4 C165.9 382.6 158 378.8 158 372 V120 Z"
          fill="url(#bmGrad)"/>
    <path d="M158 120 C158 104.536 170.536 92 186 92 H302 C317.464 92 330 104.536 330 120 V372 C330 378.8 322.1 382.6 316.7 378.4 L244 322 L171.3 378.4 C165.9 382.6 158 378.8 158 372 V120 Z"
          fill="url(#bmGlass)"/>
    <path d="M160 120 C160 105.641 171.641 94 186 94 H302 C316.359 94 328 105.641 328 120 V369.5 L244 304.5 L160 369.5 V120 Z"
          stroke="url(#bmStroke)" stroke-width="4" stroke-linejoin="round"/>
  </g>

  <!-- Subtle Top Hole / Clip Bar on Bookmark -->
  <rect x="216" y="116" width="56" height="10" rx="5" fill="#0F172A" fill-opacity="0.38"/>
  <rect x="216" y="116" width="56" height="10" rx="5" stroke="#E0F2FE" stroke-opacity="0.45" stroke-width="1.5"/>

  <!-- 4. Glowing ECG Heartbeat / Link Health Pulse Wave across Bookmark -->
  <g filter="url(#pulseGlow)">
    <path d="M132 232 H188 L206 198 L228 274 L252 174 L274 252 L290 220 H348"
          stroke="url(#pulseGrad)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <path d="M142 232 H188 L206 198 L228 274 L252 174 L274 252 L290 220 H340"
        stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- 5. Bottom-Right Emerald Verification Shield Badge (Health Master Seal) -->
  <g filter="url(#badgeShadow)">
    <path d="M346 264 L398 284 V332 C398 367 375.5 395.5 346 406 C316.5 395.5 294 367 294 332 V284 L346 264 Z"
          fill="url(#badgeGrad)"/>
    <path d="M346 267 L395 286 V332 C395 364.8 373.8 391.8 346 402 C318.2 391.8 297 364.8 297 332 V286 L346 267 Z"
          stroke="#A7F3D0" stroke-width="4" stroke-linejoin="round"/>
    <!-- Crisp Checkmark inside Shield -->
    <path d="M324 334 L340 350 L371 316"
          stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
</body>
</html>`;

// Minimal PNG decoder (supports 8-bit RGBA colorType=6)
function decodePngRGBA(buf) {
  let pos = 8;
  let w = 0, h = 0;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
    } else if (type === "IDAT") {
      idatChunks.push(data);
    }
    pos += 12 + len;
  }
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = w * 4;
  const pixels = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const filter = inflated[y * (1 + stride)];
    const rowIn = inflated.subarray(y * (1 + stride) + 1, (y + 1) * (1 + stride));
    const rowOut = pixels.subarray(y * stride, (y + 1) * stride);
    const prevOut = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? rowOut[i - 4] : 0;
      const b = prevOut[i];
      const c = i >= 4 ? prevOut[i - 4] : 0;
      let val = rowIn[i];
      if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        val = (val + pr) & 0xff;
      }
      rowOut[i] = val;
    }
  }
  return { width: w, height: h, pixels };
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePngRGBA(w, h, rgba) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 32-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

(async () => {
  const { execFileSync } = require("child_process");
  const tmpHtml = path.join(__dirname, "store_icon_template.html");
  const tmp512 = path.join(__dirname, "..", "promo", "store-icon-512x512-hd.png");
  fs.writeFileSync(tmpHtml, HTML_ICON, "utf8");

  const fileUrl = "file:///" + tmpHtml.replace(/\\/g, "/");
  execFileSync(CHROME_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=512,512",
    "--default-background-color=00000000",
    `--screenshot=${tmp512}`,
    fileUrl
  ]);

  const srcPng = fs.readFileSync(tmp512);
  const { pixels } = decodePngRGBA(srcPng);

  // 4x4 premultiplied-alpha supersampling downsample from 512x512 -> 128x128
  const outRgba = Buffer.alloc(128 * 128 * 4);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      // Guarantee strict 0 alpha in outer 16px padding per CWS Store Icon guideline
      if (x < 16 || x >= 112 || y < 16 || y >= 112) {
        continue;
      }
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          const sx = x * 4 + dx;
          const sy = y * 4 + dy;
          const sOff = (sy * 512 + sx) * 4;
          const a = pixels[sOff + 3] / 255;
          rSum += pixels[sOff] * a;
          gSum += pixels[sOff + 1] * a;
          bSum += pixels[sOff + 2] * a;
          aSum += a;
        }
      }
      const dOff = (y * 128 + x) * 4;
      if (aSum > 0) {
        outRgba[dOff] = Math.min(255, Math.round(rSum / aSum));
        outRgba[dOff + 1] = Math.min(255, Math.round(gSum / aSum));
        outRgba[dOff + 2] = Math.min(255, Math.round(bSum / aSum));
        outRgba[dOff + 3] = Math.min(255, Math.round((aSum / 16) * 255));
      }
    }
  }

  const finalPng = encodePngRGBA(128, 128, outRgba);
  fs.writeFileSync(OUT_ICON, finalPng);
  console.log("Successfully rendered 3D glassmorphic Store Icon:", OUT_ICON, finalPng.length, "bytes");
})();
