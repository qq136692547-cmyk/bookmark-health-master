# Bookmark Health Master (BHM-PRO) — Official Landing Page & Cloudflare Global Deployment Walkthrough

## 1. Project Overview & Deliverables

An independent, high-converting official landing page has been created and globally deployed on Cloudflare Pages and Edge Workers to drive overseas traffic (Reddit, X, Hacker News) and enable direct Paddle checkout monetization for **Bookmark Health Master (BHM-PRO)**.

### Live Production Endpoints
- **Cloudflare Pages Production URL**: [https://bhm-pro-ern.pages.dev/](https://bhm-pro-ern.pages.dev/)
- **Cloudflare Worker Licensing & Compliance Edge URL**: [https://bhm-pro-license-worker.geo-score.workers.dev/](https://bhm-pro-license-worker.geo-score.workers.dev/)
- **Chrome Web Store Official URL**: [https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn](https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn) (Extension ID: `nomieaphhhhhikklfhmhhjcdgicaikgn`)

---

## 2. Architecture & File Structure

```
d:\谷歌反重力空间\基本日常\landing-page/
├── index.html                 # Main landing page with Hero, DoH showcase, 16 Titans, UGC Docs Isolation, Pricing, FAQ, Footer
├── styles.css                 # Sleek dark-mode glassmorphic styling, neon glows, responsive mobile grid
├── app.js                     # Paddle.js v2 initialization, interactive tabs, FAQ accordion, self-service license lookup
├── terms.html                 # Full Terms of Service (Paddle & CWS compliant)
├── privacy.html               # Strict Zero-Telemetry Privacy Policy
├── refund.html                # 14-Day 100% Money-Back Guarantee Refund Policy
├── _headers                   # Cloudflare Pages security & caching headers
└── assets/                    # High-res graphics and screenshots
    ├── icon.png               # 512x512 HD app icon
    ├── icon-128.png           # 128x128 store icon & favicon
    ├── twitter-card.png       # 1200x675 rich preview tile for social media
    ├── promo-tile.png         # 440x280 promo graphic
    ├── marquee-tile.png       # 1400x560 hero marquee
    ├── 01-health-scan-doh.png # Screenshot 1: Dual-stage scan & DoH
    ├── 02-16-titans-organizer.png # Screenshot 2: 16 Tech Titans ecosystem
    ├── 03-time-machine-undo.png   # Screenshot 3: Atomic rollback journal
    └── 04-native-sidepanel.png    # Screenshot 4: Chrome SidePanel UI
```

---

## 3. Commercial & Payment Setup (Paddle Billing)

The landing page features live Paddle.js v2 integration configured with authentic production credentials:

- **Paddle Client-Side Token**: `live_5b5b8dd066fd28efac60f909dcc` (Token ID: `ctkn_01m70g3djbysfydn2rgadczbsb`)
- **Single Wash Pass ($9.90 USD / 30-Day Pass)**:
  - Price ID: `pri_01m708ecngjxf937bz9zcs9m6f`
  - Product ID: `pro_01m708eac85a0v5vbbsh4g5t3v`
  - Quota: 500 dead link cleanups, deep DoH diagnostics, atomic undo
- **Lifetime Buyout ($24.90 USD / Perpetual)**:
  - Price ID: `pri_01m708eevn06vvarffpabpyprd`
  - Product ID: `pro_01m708ecv9sz188r5e1363690q`
  - Features: Unlimited dead links & 16 Tech Titans clustering forever, multi-device Chrome profiles
- **Paddle Webhook & Licensing Worker**:
  - Worker Name: `bhm-pro-license-worker`
  - Domain: `https://bhm-pro-license-worker.geo-score.workers.dev`
  - Mints Ed25519 asymmetric cryptographic license keys (`BHM1.<payload>.<sig>`) and stores in Cloudflare KV (`BHM_LICENSES_KV`).
  - Self-service license lookup endpoint: `https://bhm-pro-license-worker.geo-score.workers.dev/license?order_id=...&email=...` (enabled with full CORS headers `Access-Control-Allow-Origin: *` and OPTIONS preflights).

---

## 4. Key Sections & Value Propositions

1. **Hero Section**:
   - High-impact typography: *"Resurrect Your Bookmarks. Zero 404s. Zero Telemetry."*
   - Direct Chrome Web Store CTA button (`Add to Chrome — It's Free`).
   - Trust highlights: 100% Local-first, Chrome Manifest V3, no browsing data ever leaves device.
2. **Pain Points Comparison**:
   - Naive HTTP bot scrapers vs Dual-Stage DoH diagnostics.
   - Messy flat bookmark lists vs 16 Tech Titans auto-clustering.
   - Accidental deletion of shared docs vs UGC Collaborative Docs Smart Isolation.
   - Destructive mass deletions vs Sibling-Anchor Atomic Rollback.
3. **Interactive Feature Deep-Dive (5 Core Pillars)**:
   - Tab 1: Dual-Stage DoH Dead Link Diagnostics (filtering out WAF false alarms via Cloudflare 1.1.1.1 & Google 8.8.8.8).
   - Tab 2: 16 Tech Titans Ecosystem Auto-Clustering (AWS, GCP, Azure, Cloudflare, GitHub, Apple, Meta, OpenAI, etc.).
   - Tab 3: UGC Collaborative Docs Smart Isolation (shielding Notion, Google Docs, Sheets, Slides, Feishu/Lark, and Figma links from bulk quarantines).
   - Tab 4: Sibling-Anchor Time-Machine Rollback (exact index and parent restoration).
   - Tab 5: Native Chrome SidePanel Interface.
4. **Interactive Pricing Table**:
   - Free Community Edition on Chrome Web Store.
   - $9.90 Single Wash Pass with one-click Paddle checkout overlay + adblocker-friendly fallback.
   - $24.90 Lifetime Buyout with one-click Paddle checkout overlay + adblocker-friendly fallback.
5. **Customer Self-Service License Lookup**:
   - Allows users who purchased to query and recover their Ed25519 digital license key using Order ID and Email.
   - Connected directly to `bhm-pro-license-worker.geo-score.workers.dev` with full CORS support.
6. **Social Media & SEO Optimization**:
   - OpenGraph `og:image`, `og:title`, `og:description` pointing to `https://bhm-pro-ern.pages.dev/assets/twitter-card.png`.
   - Twitter `summary_large_image` cards for high CTR when shared on Reddit (`r/chrome`, `r/webdev`), X, and Hacker News.
   - JSON-LD `SoftwareApplication` structured schema with all three price tiers ($0, $9.90, $24.90) for Google Search rich snippets.
7. **Legal & Compliance Suite**:
   - Dedicated `terms.html`, `privacy.html`, and `refund.html` pages satisfying Paddle Merchant of Record and Google Web Store guidelines.
   - 14-Day 100% Money-Back Guarantee prominently stated.
   - Customer support contact: `qq136692547@gmail.com`.

---

## 5. End-to-End Verification Record

- **Link & Asset Integrity**: Ran `node tests/verify-landing-page.js` — 100% of internal links, images, CSS, and JS files verified with zero broken references.
- **Global HTTP Live Fetch**: Tested via remote HTTP fetchers on both `https://bhm-pro-ern.pages.dev/` and `https://bhm-pro-license-worker.geo-score.workers.dev/` — all pages returned status 200 with full markup and social tags.
- **CORS & Preflight Compliance**: Verified that `OPTIONS` and `GET` requests to `bhm-pro-license-worker.geo-score.workers.dev/license` return `Access-Control-Allow-Origin: *`.
- **Paddle.js Initialization**: Script tag loads `https://cdn.paddle.com/paddle/v2/paddle.js`, initializes with token `live_5b5b8dd066fd28efac60f909dcc`, and maps both price IDs.
- **Mobile Responsiveness**: CSS verified for viewports from 320px mobile up to 4K displays with responsive drawer navigation and fluid typography.
