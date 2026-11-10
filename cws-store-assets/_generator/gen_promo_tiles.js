const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_SMALL = path.join(__dirname, "..", "promo", "promo-tile-440x280.png");
const OUT_MARQUEE = path.join(__dirname, "..", "promo", "marquee-tile-1400x560.png");

// Helper: decode PNG (colorType 2 or 6) and re-encode strictly as 24-bit RGB (colorType = 2, no alpha)
function convertPngTo24BitRGB(buf, targetW, targetH) {
  let pos = 8;
  let w = 0, h = 0, colorType = 6;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    }
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = w * bpp;
  const pixels = Buffer.alloc(w * h * bpp);

  for (let y = 0; y < h; y++) {
    const filter = inflated[y * (1 + stride)];
    const rowIn = inflated.subarray(y * (1 + stride) + 1, (y + 1) * (1 + stride));
    const rowOut = pixels.subarray(y * stride, (y + 1) * stride);
    const prevOut = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? rowOut[i - bpp] : 0;
      const b = prevOut[i];
      const c = i >= bpp ? prevOut[i - bpp] : 0;
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

  // Downsample (if w/targetW === 2) or copy 1:1 into 24-bit RGB raw buffer
  const scaleX = w / targetW;
  const scaleY = h / targetH;
  const rawRgb = Buffer.alloc(targetH * (1 + targetW * 3));

  for (let y = 0; y < targetH; y++) {
    const rowOff = y * (1 + targetW * 3);
    rawRgb[rowOff] = 0; // filter 0
    for (let x = 0; x < targetW; x++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      const sy0 = Math.floor(y * scaleY);
      const sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * scaleY));
      const sx0 = Math.floor(x * scaleX);
      const sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * scaleX));
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const sOff = (sy * w + sx) * bpp;
          rSum += pixels[sOff];
          gSum += pixels[sOff + 1];
          bSum += pixels[sOff + 2];
          count++;
        }
      }
      const dOff = rowOff + 1 + x * 3;
      rawRgb[dOff] = Math.round(rSum / count);
      rawRgb[dOff + 1] = Math.round(gSum / count);
      rawRgb[dOff + 2] = Math.round(bSum / count);
    }
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

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(targetW, 0);
  ihdr.writeUInt32BE(targetH, 4);
  ihdr[8] = 8; // bitDepth = 8
  ihdr[9] = 2; // colorType = 2 (24-bit RGB, NO ALPHA!)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(rawRgb, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// ============================================================================
// 1. SMALL PROMO TILE (440 x 280) — High-Impact Bold Typography & Visual Punch
// ============================================================================
const HTML_SMALL_440 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 440px;
    height: 280px;
    overflow: hidden;
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif;
    background: #060913;
    color: #ffffff;
  }
  .canvas {
    position: relative;
    width: 440px;
    height: 280px;
    background:
      radial-gradient(circle at 18% 20%, rgba(37, 99, 235, 0.52) 0%, transparent 55%),
      radial-gradient(circle at 88% 78%, rgba(16, 185, 129, 0.42) 0%, transparent 55%),
      radial-gradient(circle at 75% 18%, rgba(99, 102, 241, 0.38) 0%, transparent 48%),
      linear-gradient(135deg, #070B19 0%, #0F172A 52%, #091526 100%);
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border: 1px solid rgba(96, 165, 250, 0.22);
  }
  /* Subtle tech grid overlay */
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
    background-size: 24px 24px;
    pointer-events: none;
  }
  .top-row {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    border-radius: 999px;
    background: rgba(37, 99, 235, 0.28);
    border: 1.5px solid rgba(96, 165, 250, 0.65);
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.6px;
    color: #93C5FD;
    text-transform: uppercase;
  }
  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #34D399;
    box-shadow: 0 0 8px #34D399;
  }
  .main-stage {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 2px;
  }
  .headline-col {
    flex: 1;
  }
  .headline-1 {
    font-size: 37px;
    font-weight: 900;
    line-height: 1.02;
    letter-spacing: -1.1px;
    color: #FFFFFF;
    text-shadow: 0 4px 18px rgba(0, 0, 0, 0.65);
  }
  .headline-2 {
    font-size: 35px;
    font-weight: 900;
    line-height: 1.06;
    letter-spacing: -1px;
    background: linear-gradient(90deg, #38BDF8 0%, #60A5FA 45%, #34D399 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-top: 2px;
  }
  .sub-hook {
    margin-top: 9px;
    font-size: 15px;
    font-weight: 700;
    color: #E2E8F0;
    letter-spacing: -0.2px;
  }
  .visual-col {
    width: 122px;
    height: 136px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .floating-stat-dead {
    position: absolute;
    top: -4px;
    right: -4px;
    background: linear-gradient(135deg, #EF4444, #DC2626);
    color: #fff;
    font-size: 11.5px;
    font-weight: 900;
    padding: 3px 8px;
    border-radius: 7px;
    box-shadow: 0 6px 14px rgba(239, 68, 68, 0.5);
    border: 1.5px solid #FCA5A5;
    transform: rotate(5deg);
    z-index: 4;
  }
  .bottom-bar {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid rgba(148, 163, 184, 0.18);
  }
  .feat-tag {
    flex: 1;
    text-align: center;
    padding: 6px 6px;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.82);
    border: 1px solid rgba(148, 163, 184, 0.28);
    font-size: 12.5px;
    font-weight: 800;
    color: #F8FAFC;
    white-space: nowrap;
  }
  .feat-tag span {
    color: #38BDF8;
  }
  .feat-tag.emerald span {
    color: #34D399;
  }
</style>
</head>
<body>
  <div class="canvas">
    <div class="grid-bg"></div>

    <div class="top-row">
      <div class="brand-pill">
        <span class="live-dot"></span>
        BOOKMARK HEALTH MASTER
      </div>
    </div>

    <div class="main-stage">
      <div class="headline-col">
        <div class="headline-1">CLEAN 404</div>
        <div class="headline-2">BOOKMARKS</div>
        <div class="sub-hook">16-Ecosystem Auto-Organize</div>
      </div>

      <div class="visual-col">
        <div class="floating-stat-dead">404 CLEANED</div>
        <svg width="118" height="126" viewBox="80 75 355 360" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bmG" x1="156" y1="116" x2="336" y2="388" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#60A5FA"/>
              <stop offset="50%" stop-color="#3B82F6"/>
              <stop offset="100%" stop-color="#4F46E5"/>
            </linearGradient>
            <linearGradient id="bdG" x1="286" y1="266" x2="406" y2="394" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#34D399"/>
              <stop offset="100%" stop-color="#059669"/>
            </linearGradient>
            <filter id="sh" x="80" y="70" width="350" height="360" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.75"/>
            </filter>
          </defs>
          <path d="M188 112 H316 C331 112 344 125 344 140 V336 L266 286 L188 336 V140 C188 125 201 112 216 112 Z"
                transform="translate(22, -8) rotate(8 266 224)"
                fill="#6366F1" fill-opacity="0.45" stroke="#A5B4FC" stroke-width="4"/>
          <g filter="url(#sh)">
            <path d="M158 120 C158 104.5 170.5 92 186 92 H302 C317.5 92 330 104.5 330 120 V372 C330 378.8 322.1 382.6 316.7 378.4 L244 322 L171.3 378.4 C165.9 382.6 158 378.8 158 372 V120 Z"
                  fill="url(#bmG)" stroke="#BAE6FD" stroke-width="5"/>
          </g>
          <path d="M130 232 H188 L206 196 L228 276 L252 170 L274 252 L290 220 H348"
                stroke="#38BDF8" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
          <path d="M138 232 H188 L206 196 L228 276 L252 170 L274 252 L290 220 H342"
                stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <g filter="url(#sh)">
            <path d="M346 254 L408 278 V334 C408 375 381 408 346 420 C311 408 284 375 284 334 V278 L346 254 Z"
                  fill="url(#bdG)" stroke="#A7F3D0" stroke-width="6"/>
            <path d="M320 336 L339 355 L376 315"
                  stroke="#FFFFFF" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
        </svg>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="feat-tag"><span>⚡</span> DoH Prober</div>
      <div class="feat-tag"><span>📑</span> Side Panel</div>
      <div class="feat-tag emerald"><span>↩️</span> Atomic Undo</div>
    </div>
  </div>
</body>
</html>`;

// ============================================================================
// 2. MARQUEE PROMO TILE (1400 x 560) — Widescreen Flagship Billboard
// ============================================================================
const HTML_MARQUEE_1400 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 1400px;
    height: 560px;
    overflow: hidden;
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif;
    background: #050811;
    color: #ffffff;
  }
  .marquee {
    position: relative;
    width: 1400px;
    height: 560px;
    background:
      radial-gradient(circle at 16% 24%, rgba(37, 99, 235, 0.45) 0%, transparent 48%),
      radial-gradient(circle at 82% 72%, rgba(16, 185, 129, 0.35) 0%, transparent 50%),
      radial-gradient(circle at 68% 18%, rgba(99, 102, 241, 0.38) 0%, transparent 42%),
      linear-gradient(125deg, #050811 0%, #0B132B 48%, #071324 100%);
    padding: 54px 68px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 48px;
  }
  .grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(148, 163, 184, 0.055) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.055) 1px, transparent 1px);
    background-size: 36px 36px;
    pointer-events: none;
  }
  .left-hero {
    position: relative;
    z-index: 2;
    width: 680px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .top-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 18px;
    border-radius: 999px;
    background: rgba(37, 99, 235, 0.24);
    border: 1.5px solid rgba(96, 165, 250, 0.6);
    font-size: 14.5px;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: #93C5FD;
    text-transform: uppercase;
    margin-bottom: 20px;
  }
  .pulse-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #34D399;
    box-shadow: 0 0 12px #34D399;
  }
  .hero-title-1 {
    font-size: 58px;
    font-weight: 900;
    line-height: 1.06;
    letter-spacing: -1.6px;
    color: #FFFFFF;
    white-space: nowrap;
    text-shadow: 0 8px 28px rgba(0, 0, 0, 0.6);
  }
  .hero-title-2 {
    font-size: 54px;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -1.5px;
    white-space: nowrap;
    background: linear-gradient(90deg, #38BDF8 0%, #60A5FA 48%, #34D399 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-top: 6px;
  }
  .hero-desc {
    margin-top: 22px;
    font-size: 21px;
    font-weight: 600;
    line-height: 1.48;
    color: #CBD5E1;
    max-width: 650px;
  }
  .hero-desc strong {
    color: #FFFFFF;
    font-weight: 800;
  }
  .pill-row {
    margin-top: 32px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: nowrap;
  }
  .feature-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 17px;
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.88);
    border: 1.5px solid rgba(96, 165, 250, 0.38);
    font-size: 16px;
    font-weight: 800;
    color: #F8FAFC;
    white-space: nowrap;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
  }
  .feature-pill.green {
    border-color: rgba(52, 211, 153, 0.55);
    background: rgba(6, 78, 59, 0.38);
  }

  /* Right Showcase Stage */
  .right-stage {
    position: relative;
    z-index: 2;
    width: 550px;
    height: 444px;
  }
  /* Main Glass Dashboard Card */
  .dash-card {
    position: absolute;
    top: 6px;
    left: 0;
    right: 0;
    background: rgba(15, 23, 42, 0.94);
    border: 2px solid rgba(96, 165, 250, 0.42);
    border-radius: 20px;
    padding: 22px 24px 36px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.78);
  }
  .dash-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  }
  .dash-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 800;
    color: #F8FAFC;
    white-space: nowrap;
  }
  .status-badge {
    padding: 5px 12px;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(52, 211, 153, 0.6);
    color: #34D399;
    font-size: 12.5px;
    font-weight: 800;
    white-space: nowrap;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 18px;
  }
  .kpi-box {
    background: rgba(30, 41, 59, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 14px;
    padding: 14px 16px;
  }
  .kpi-box.dead {
    background: rgba(127, 29, 29, 0.28);
    border-color: rgba(248, 113, 113, 0.5);
  }
  .kpi-box.health {
    background: rgba(6, 78, 59, 0.28);
    border-color: rgba(52, 211, 153, 0.5);
  }
  .kpi-label {
    font-size: 13px;
    font-weight: 700;
    color: #94A3B8;
    text-transform: uppercase;
  }
  .kpi-val {
    font-size: 34px;
    font-weight: 900;
    margin-top: 4px;
    color: #FFFFFF;
  }
  .kpi-box.health .kpi-val { color: #34D399; }
  .kpi-box.dead .kpi-val { color: #F87171; }

  .probe-rows {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .probe-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 15px;
    border-radius: 11px;
    background: rgba(2, 6, 23, 0.65);
    border: 1px solid rgba(148, 163, 184, 0.16);
    font-size: 14.5px;
    font-weight: 700;
    color: #E2E8F0;
  }
  .tag-404 {
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(239, 68, 68, 0.22);
    border: 1px solid #F87171;
    color: #FCA5A5;
    font-size: 12px;
    font-weight: 800;
  }
  .tag-doh {
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(245, 158, 11, 0.22);
    border: 1px solid #FBBF24;
    color: #FDE68A;
    font-size: 12px;
    font-weight: 800;
  }
  .tag-safe {
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(16, 185, 129, 0.22);
    border: 1px solid #34D399;
    color: #A7F3D0;
    font-size: 12px;
    font-weight: 800;
  }

  /* Floating Bottom Ecosystem Strip */
  .eco-floating {
    position: absolute;
    bottom: 4px;
    left: -14px;
    right: -6px;
    background: linear-gradient(90deg, #1E293B 0%, #0F172A 100%);
    border: 2px solid #38BDF8;
    border-radius: 16px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.85);
  }
  .eco-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 800;
    color: #FFFFFF;
    white-space: nowrap;
  }
  .eco-badges {
    display: flex;
    gap: 7px;
  }
  .eco-chip {
    padding: 5px 10px;
    border-radius: 8px;
    background: rgba(59, 130, 246, 0.25);
    border: 1px solid rgba(96, 165, 250, 0.55);
    font-size: 12.5px;
    font-weight: 800;
    color: #BAE6FD;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div class="marquee">
    <div class="grid-overlay"></div>

    <div class="left-hero">
      <div class="top-badge">
        <span class="pulse-dot"></span>
        BOOKMARK HEALTH MASTER PRO • MANIFEST V3
      </div>
      <div class="hero-title-1">Kill Dead 404 Links.</div>
      <div class="hero-title-2">Organize 16 Ecosystems.</div>
      <div class="hero-desc">
        <strong>100% Local-First</strong> Chrome bookmark diagnostic prober, 16 tech giant auto-clustering, native Side Panel search &amp; atomic undo.
      </div>
      <div class="pill-row">
        <div class="feature-pill">🩺 Cloudflare DoH Verified</div>
        <div class="feature-pill">📑 Native Side Panel</div>
        <div class="feature-pill green">↩️ 100% Atomic Undo</div>
      </div>
    </div>

    <div class="right-stage">
      <div class="dash-card">
        <div class="dash-header">
          <div class="dash-title">
            <span>🛡️</span> Dual-Stage Health Diagnostic Radar
          </div>
          <div class="status-badge">● Zero False Positives</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Total Scanned</div>
            <div class="kpi-val">1,842</div>
          </div>
          <div class="kpi-box health">
            <div class="kpi-label">Active &amp; Healthy</div>
            <div class="kpi-val">92.0%</div>
          </div>
          <div class="kpi-box dead">
            <div class="kpi-label">404 Dead Links</div>
            <div class="kpi-val">118</div>
          </div>
        </div>

        <div class="probe-rows">
          <div class="probe-item">
            <span>api.legacy-dev.org/v1/reference</span>
            <span class="tag-404">HTTP 404 QUARANTINED</span>
          </div>
          <div class="probe-item">
            <span>blog.matthew-cloud-archive.io</span>
            <span class="tag-doh">DNS NXDOMAIN (DoH)</span>
          </div>
        </div>
      </div>

      <div class="eco-floating">
        <div class="eco-left">
          <span>🏛️</span> 16 Ecosystems Clustered
        </div>
        <div class="eco-badges">
          <span class="eco-chip">Google (84)</span>
          <span class="eco-chip">AWS (47)</span>
          <span class="eco-chip">OpenAI (39)</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

(async () => {
  // 1. Render Small Promo Tile (440x280 at 2x scale -> 880x560 -> downsample to exact 440x280 24-bit RGB)
  const tmpSmallHtml = path.join(__dirname, "small_promo_440.html");
  const tmpSmallRaw = path.join(__dirname, "small_promo_raw.png");
  fs.writeFileSync(tmpSmallHtml, HTML_SMALL_440, "utf8");
  execFileSync(CHROME_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--window-size=440,280",
    `--screenshot=${tmpSmallRaw}`,
    "file:///" + tmpSmallHtml.replace(/\\/g, "/")
  ]);
  const small24 = convertPngTo24BitRGB(fs.readFileSync(tmpSmallRaw), 440, 280);
  fs.writeFileSync(OUT_SMALL, small24);
  console.log("Generated Small Promo Tile (440x280, 24-bit RGB):", OUT_SMALL, small24.length, "bytes");

  // 2. Render Marquee Promo Tile (1400x560 at 2x scale -> 2800x1120 -> downsample to exact 1400x560 24-bit RGB)
  const tmpMarqueeHtml = path.join(__dirname, "marquee_promo_1400.html");
  const tmpMarqueeRaw = path.join(__dirname, "marquee_promo_raw.png");
  fs.writeFileSync(tmpMarqueeHtml, HTML_MARQUEE_1400, "utf8");
  execFileSync(CHROME_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--window-size=1400,560",
    `--screenshot=${tmpMarqueeRaw}`,
    "file:///" + tmpMarqueeHtml.replace(/\\/g, "/")
  ]);
  const marquee24 = convertPngTo24BitRGB(fs.readFileSync(tmpMarqueeRaw), 1400, 560);
  fs.writeFileSync(OUT_MARQUEE, marquee24);
  console.log("Generated Marquee Promo Tile (1400x560, 24-bit RGB):", OUT_MARQUEE, marquee24.length, "bytes");
})();
