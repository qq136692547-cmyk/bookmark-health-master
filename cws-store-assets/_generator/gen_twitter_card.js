const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_TWITTER = path.join(__dirname, "..", "promo", "twitter-card-1200x675.png");

// 1200 x 675 is the official recommended Twitter / X Card standard (16:9 aspect ratio)
const HTML_TWITTER = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 1200px;
    height: 675px;
    overflow: hidden;
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif;
    background: #030712;
    color: #ffffff;
  }
  .card-container {
    position: relative;
    width: 1200px;
    height: 675px;
    background:
      radial-gradient(circle at 14% 20%, rgba(37, 99, 235, 0.45) 0%, transparent 48%),
      radial-gradient(circle at 86% 75%, rgba(16, 185, 129, 0.35) 0%, transparent 48%),
      radial-gradient(circle at 72% 16%, rgba(99, 102, 241, 0.38) 0%, transparent 42%),
      linear-gradient(135deg, #030712 0%, #0B132B 48%, #051329 100%);
    padding: 50px 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 40px;
  }
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }
  .left-hero {
    position: relative;
    z-index: 2;
    width: 580px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .store-badge {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 7px 16px;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.2);
    border: 1.5px solid rgba(52, 211, 153, 0.6);
    font-size: 14px;
    font-weight: 800;
    color: #34D399;
    letter-spacing: 0.5px;
    margin-bottom: 22px;
  }
  .pulse-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #34D399;
    box-shadow: 0 0 10px #34D399;
  }
  .title-1 {
    font-size: 56px;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -1.6px;
    color: #FFFFFF;
    text-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
  }
  .title-2 {
    font-size: 52px;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -1.4px;
    background: linear-gradient(90deg, #38BDF8 0%, #60A5FA 45%, #34D399 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-top: 4px;
  }
  .subtitle {
    margin-top: 18px;
    font-size: 19px;
    font-weight: 600;
    line-height: 1.45;
    color: #CBD5E1;
  }
  .pills-group {
    margin-top: 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  .pill-row {
    display: flex;
    gap: 10px;
  }
  .feature-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.85);
    border: 1.5px solid rgba(96, 165, 250, 0.35);
    font-size: 15px;
    font-weight: 800;
    color: #F8FAFC;
    white-space: nowrap;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  }
  .feature-pill.green {
    border-color: rgba(52, 211, 153, 0.55);
    background: rgba(6, 78, 59, 0.35);
  }
  .cta-tag {
    margin-top: 32px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(90deg, #2563EB, #4F46E5);
    color: #FFFFFF;
    font-size: 16px;
    font-weight: 800;
    padding: 12px 22px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(37, 99, 235, 0.45);
  }

  /* Right Showcase Dashboard */
  .right-stage {
    position: relative;
    z-index: 2;
    width: 480px;
    height: 540px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .dash-card {
    background: rgba(15, 23, 42, 0.94);
    border: 2px solid rgba(96, 165, 250, 0.45);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8);
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
    font-size: 17px;
    font-weight: 800;
    color: #F8FAFC;
  }
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 16px;
  }
  .kpi-box {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    padding: 12px;
    text-align: center;
  }
  .kpi-box.dead {
    background: rgba(127, 29, 29, 0.25);
    border-color: rgba(248, 113, 113, 0.45);
  }
  .kpi-box.health {
    background: rgba(6, 78, 59, 0.25);
    border-color: rgba(52, 211, 153, 0.45);
  }
  .kpi-label {
    font-size: 11px;
    font-weight: 700;
    color: #94A3B8;
    text-transform: uppercase;
  }
  .kpi-val {
    font-size: 26px;
    font-weight: 900;
    margin-top: 2px;
    color: #FFFFFF;
  }
  .kpi-box.health .kpi-val { color: #34D399; }
  .kpi-box.dead .kpi-val { color: #F87171; }

  .items-list {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.65);
    border: 1px solid rgba(148, 163, 184, 0.16);
    font-size: 13px;
    font-weight: 700;
    color: #E2E8F0;
  }
  .tag-red {
    padding: 3px 8px;
    border-radius: 5px;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid #F87171;
    color: #FCA5A5;
    font-size: 11px;
    font-weight: 800;
  }
  .tag-green {
    padding: 3px 8px;
    border-radius: 5px;
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid #34D399;
    color: #A7F3D0;
    font-size: 11px;
    font-weight: 800;
  }
  .eco-preview {
    margin-top: 16px;
    background: linear-gradient(90deg, #1E293B, #0F172A);
    border: 1.5px solid #38BDF8;
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .eco-text {
    font-size: 13.5px;
    font-weight: 800;
    color: #FFFFFF;
  }
  .eco-chips {
    display: flex;
    gap: 6px;
  }
  .chip {
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(59, 130, 246, 0.25);
    border: 1px solid rgba(96, 165, 250, 0.5);
    font-size: 11.5px;
    font-weight: 800;
    color: #BAE6FD;
  }
</style>
</head>
<body>
  <div class="card-container">
    <div class="grid-pattern"></div>

    <div class="left-hero">
      <div class="store-badge">
        <span class="pulse-dot"></span>
        LIVE ON CHROME WEB STORE
      </div>
      <div class="title-1">Fix Broken Bookmarks.</div>
      <div class="title-2">Zero False Positives.</div>
      <div class="subtitle">
        100% Local-first Chrome extension: audit 404 dead links, auto-cluster 16 Tech Ecosystems &amp; instant atomic undo.
      </div>

      <div class="pills-group">
        <div class="pill-row">
          <div class="feature-pill">🩺 Cloudflare DoH Verified</div>
          <div class="feature-pill">🔒 100% Local-First</div>
        </div>
        <div class="pill-row">
          <div class="feature-pill">🏛️ 16-Ecosystem Clusters</div>
          <div class="feature-pill green">↩️ 1-Click Atomic Undo</div>
        </div>
      </div>

      <div class="cta-tag">
        <span>🚀</span> Search "Bookmark Health Master" on Chrome Store
      </div>
    </div>

    <div class="right-stage">
      <div class="dash-card">
        <div class="dash-header">
          <div class="dash-title">
            <span>🛡️</span> Bookmark Health Master (BHM-PRO)
          </div>
          <span style="font-size: 12px; font-weight: 800; color: #34D399;">● Manifest V3</span>
        </div>

        <div class="kpi-row">
          <div class="kpi-box">
            <div class="kpi-label">Scanned</div>
            <div class="kpi-val">1,842</div>
          </div>
          <div class="kpi-box health">
            <div class="kpi-label">Healthy</div>
            <div class="kpi-val">92.0%</div>
          </div>
          <div class="kpi-box dead">
            <div class="kpi-label">404 Dead</div>
            <div class="kpi-val">118</div>
          </div>
        </div>

        <div class="items-list">
          <div class="item-row">
            <span>api.legacy-dev.org/reference</span>
            <span class="tag-red">404 TRASHED</span>
          </div>
          <div class="item-row">
            <span>blog.matthew-cloud.io</span>
            <span class="tag-red">NXDOMAIN (DoH)</span>
          </div>
          <div class="item-row">
            <span>192.168.1.1:8080 • /logout</span>
            <span class="tag-green">🛡️ PROTECTED</span>
          </div>
        </div>

        <div class="eco-preview">
          <div class="eco-text">🏛️ 16 Ecosystems Auto-Organized</div>
          <div class="eco-chips">
            <span class="chip">Google</span>
            <span class="chip">AWS</span>
            <span class="chip">OpenAI</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

(async () => {
  const tmpHtml = path.join(__dirname, "twitter_1200x675.html");
  fs.writeFileSync(tmpHtml, HTML_TWITTER, "utf8");

  execFileSync(CHROME_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,675",
    `--screenshot=${OUT_TWITTER}`,
    "file:///" + tmpHtml.replace(/\\/g, "/")
  ]);

  console.log("Rendered Twitter 1200x675 card successfully:", OUT_TWITTER);
})();
