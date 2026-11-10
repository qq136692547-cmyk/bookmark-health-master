# Bookmark Health Master (BHM-PRO) — Open Source Launch Kit

This kit contains battle-tested, anti-spam-filtered promotional copy engineered for technical communities: Hacker News, Reddit (`r/opensource`, `r/SideProject`, `r/webdev`), and Twitter / X.

---

## 1. Hacker News — Show HN Submission

### Post Title
```
Show HN: Bookmark Health Master – Local-first dead link finder with DoH fallback (MV3)
```
*(Alternative)*
```
Show HN: BHM – Open-core bookmark organizer using DNS-over-HTTPS to prevent false 404s
```

### Post Body
```markdown
Hi HN,

Like many of you, my browser bookmarks accumulated over a decade into a chaotic mess of 2,000+ links. Whenever I tried existing bookmark cleaners, I ran into two infuriating problems:

1. **WAF False Positives**: Naive HTTP HEAD/GET scrapers trigger Cloudflare, Akamai, or anti-bot shields, which return HTTP 403 or 503. The cleaner flags them as "Dead" and deletes your alive bookmarks.
2. **Privacy & Security**: Most modern extensions demand intrusive cloud permissions or beam your browsing catalog to third-party analytics servers. Other tools blindly scan internal subnets (192.168.x.x, 10.x.x.x), posing SSRF risks.

To fix this for myself, I built **Bookmark Health Master (BHM)** as a 100% local-first Chrome Extension (Manifest V3):

### Technical Innovations:
- **Dual-Stage Dead Link Diagnostics**: When an HTTP probe fails or returns 403/503, BHM falls back to querying authoritative DNS over HTTPS (DoH via Cloudflare 1.1.1.1 and Google 8.8.8.8). A URL is only classified as DEAD if DNS returns `NXDOMAIN` (authoritatively non-existent or dropped domain). Otherwise, it is preserved as `UNREACHABLE_OR_PROTECTED`.
- **RFC 1918 & Intranet Shielding**: Explicitly blocks requests to private IPv4 ranges, IPv6 unique locals, and pseudo-schemes (`javascript:`, `chrome:`, `file:`) to protect local network devices.
- **DNR Session Isolation**: Dynamically installs DeclarativeNetRequest session rules to strip `Origin` and `Referer` headers from probe fetches, preventing probed origins from tracing background pings.
- **Sibling-Anchor Time-Machine Rollback**: Rather than simple bulk moves that destroy folder indexing, operations record an append-only `MoveJournal` that rolls back in exact ascending index order with 100% positional fidelity.
- **Zero Telemetry**: No analytics SDKs, no trackers, no external backend required for core scanning. Everything runs in the browser's local sandbox.

### Open-Core Architecture:
The core scanning engine, DoH resolver, intranet shielding, and Netscape HTML backups are completely open source under the MIT license. For power users with massive bookmark trees, an optional Lifetime Buyout ($24.90) unlocks uncapped 16 Tech Titan clustering and perpetual undo journals.

We also designed the license verification to be **100% offline**: digital tokens are verified client-side using `crypto.subtle.verify()` with an Ed25519 public key—zero phone-home heartbeats.

- **GitHub Repo**: https://github.com/qq136692547-cmyk/bookmark-health-master
- **Chrome Web Store**: https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn
- **Official Website**: https://bhm-pro-ern.pages.dev/

I would love to hear feedback on the DoH fallback logic and ideas for refining community domain classification rules!
```

---

## 2. Reddit Strategy & Posts

> **Pro-Tip for Reddit**: To pass automated spam filters, never use link shorteners, keep marketing jargon to zero, highlight the open-source GitHub repo first, and emphasize privacy (zero telemetry / local-first).

### 2.1 Post for `r/opensource`

**Title**:
```
I built Bookmark Health Master – an MIT-licensed, local-first Chrome extension with zero telemetry and DoH dead link verification
```

**Body**:
```markdown
Hey everyone,

I wanted to share an open-source project I've been working on to solve the bookmark bloat problem without sacrificing privacy: **Bookmark Health Master (BHM)**.

### Why another bookmark tool?
Almost every bookmark manager in the Chrome Web Store today suffers from one of two flaws:
1. They require account registration and upload your private bookmark URLs to remote servers.
2. Their link checkers naively delete alive links because Cloudflare/WAFs return HTTP 403/503 to unauthenticated requests.

### How BHM is built:
- **100% Local-First & Zero Telemetry**: Absolutely no telemetry, no Google Analytics, no PostHog, no tracking scripts. All data stays inside `chrome.storage.local`.
- **Dual-Stage DoH Verification**: When an HTTP check encounters a bot block (403/503) or timeout, it queries DNS-over-HTTPS (DoH) via Cloudflare 1.1.1.1 and Google 8.8.8.8. It only flags a link as DEAD if DNS confirms an authoritative `NXDOMAIN`.
- **Intranet SSRF Shielding**: Strict RFC 1918 validation blocks probes against internal IPs (`192.168.0.0/16`, `10.0.0.0/8`, `127.0.0.1`, etc.).
- **Move Journal & Atomic Undo**: All organizing operations record a sibling-anchor journal, allowing 100% position fidelity on rollback.
- **MIT License**: Clean Vanilla JS codebase, zero npm dependencies in runtime.

### Links:
- Source Code (GitHub): https://github.com/qq136692547-cmyk/bookmark-health-master
- Chrome Web Store: https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn

Contributions are welcome—especially PRs for expanding developer ecosystem categorization rules in `bookmark-organizer/core/ecosystem_rules.js`!
```

---

### 2.2 Post for `r/SideProject`

**Title**:
```
I got tired of bookmark cleaners deleting working links, so I built a local-first extension that checks DNS records first (14 test suites, MV3)
```

**Body**:
```markdown
Hey r/SideProject,

I finally tackled the mess of 1,800+ bookmarks in my Chrome browser that had accumulated since 2017. 

When testing existing tools, I found that ~15% of my completely valid links (AWS consoles, GitHub docs, internal portals) were falsely flagged as dead because aggressive WAFs returned HTTP 403 or 503 to automated HEAD requests.

So I spent the last few months building **Bookmark Health Master (BHM)**.

### Key Highlights:
1. **DNS-over-HTTPS (DoH) Fallback**: Uses Cloudflare/Google DoH to verify `NXDOMAIN` status before ever marking a link dead. If the DNS is alive, the link is preserved.
2. **Sibling-Anchor Rollback**: Mass reorganizing can destroy your muscle memory if indices shift. BHM tracks original parent IDs and sibling indices to restore items to their exact original order.
3. **Collaborative Docs Protection**: Auto-detects Google Docs, Sheets, Notion, and Feishu/Lark links and isolates them so active team docs are never dumped into generic company folders.
4. **SidePanel UI**: Native Chrome SidePanel integration alongside the web page.

### The Business Model (Open-Core):
- Core link prober, DoH engine, and backups are open source under the MIT license.
- Power users can buy a $24.90 Lifetime Buyout for unlimited Titan clustering and history.
- License verification runs 100% offline via Ed25519 WebCrypto (zero server phone-homes).

Check out the project:
- GitHub: https://github.com/qq136692547-cmyk/bookmark-health-master
- Chrome Web Store: https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn
- Landing Page: https://bhm-pro-ern.pages.dev/

Would love any thoughts on the UI or feature suggestions!
```

---

### 2.3 Post for `r/webdev`

**Title**:
```
Engineering a resilient dead link detector in Chrome Manifest V3: Avoiding WAF false positives with DNS-over-HTTPS & DNR header stripping
```

**Body**:
```markdown
Hey webdevs,

Building background link verifiers in Chrome Manifest V3 has some tricky engineering constraints:
1. Short-lived Service Workers can terminate mid-batch.
2. Bot-protection services (Cloudflare Turnstile, Cloudfront WAF) frequently return HTTP 403/503 to non-standard HTTP probes.
3. Probing external sites from an extension risks leaking the user's active browsing context in request headers.

In building **Bookmark Health Master**, we implemented a few interesting architecture patterns to solve these issues:

### 1. Dual-Stage Probing with DoH Fallback
Instead of trusting HTTP status codes alone, when an HTTP request fails or returns an ambiguous code, we send a parallel JSON DoH request (`https://cloudflare-dns.com/dns-query?name=...&type=A`).
If DoH returns `Status: 3` (`NXDOMAIN`), we know with cryptographic certainty the domain has expired or dropped. If DoH returns `NOERROR` with active IP answers, the site is simply blocking automated probes and is marked `UNREACHABLE_OR_PROTECTED` rather than deleted.

### 2. Ephemeral DeclarativeNetRequest Rules
To prevent background fetches from leaking sensitive referer data to probed servers, the service worker registers dynamic session rules with Chrome's `declarativeNetRequest` API to strip `Origin` and `Referer` headers for probe URLs, cleaning up after the batch completes.

### 3. Immediate Stream Cancellation
To minimize network usage across 1,000+ links, the fetch response body is immediately cancelled via `response.body.cancel()` right after reading response headers, preventing multi-megabyte payloads from downloading.

### 4. Zero External Dependencies
The entire test harness (14 suites, unit/integration/stress testing 1,500+ bookmarks) is written in native Node.js with zero npm modules.

Source code and architecture docs are available on GitHub:
👉 https://github.com/qq136692547-cmyk/bookmark-health-master
👉 CWS Extension: https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn

Happy to discuss MV3 performance tuning, service worker lifecycle tricks, or DoH edge cases!
```

---

## 3. Twitter / X Launch Thread

### Tweet 1 (Hook + Visual)
> 🚨 Most bookmark cleaners are broken.
> 
> When Cloudflare or Akamai blocks their scraper (HTTP 403/503), they falsely assume the page is dead and delete your alive links.
> 
> Today we’re open-sourcing Bookmark Health Master (BHM) v2.1.0 on GitHub! 🧵👇
> 
> [Attach landing-page/assets/01-health-scan-doh.png]

### Tweet 2 (The DoH Breakthrough)
> 2/ How BHM fixes false positives:
> 
> When an HTTP check encounters a WAF block or error, it executes a Stage 2 fallback using DNS-over-HTTPS (DoH via @Cloudflare 1.1.1.1 & @Google 8.8.8.8).
> 
> A link is ONLY marked DEAD if DNS authoritatively confirms `NXDOMAIN`. Zero false deletions. 🛡️

### Tweet 3 (Local-First & Zero Telemetry)
> 3/ 100% Local-First & Zero Telemetry 🔒
> 
> - 0 analytics SDKs (no GA, no Mixpanel, no trackers)
> - Strict RFC 1918 shielding protects your local network (192.168.x.x, localhost)
> - Dynamic DeclarativeNetRequest strips Referer headers during checks
> - Your bookmarks NEVER leave your device.

### Tweet 4 (Time-Machine Rollback)
> 4/ Ever had a bookmark organizer scramble your folder order?
> 
> BHM includes a Sibling-Anchor Move Journal. Rollbacks execute in exact ascending index order, guaranteeing 100% position fidelity across thousands of bookmarks.
> 
> [Attach landing-page/assets/03-time-machine-undo.png]

### Tweet 5 (Call to Action)
> 5/ BHM is open source (MIT) and available now on the Chrome Web Store!
> 
> ⭐ Star the repo: https://github.com/qq136692547-cmyk/bookmark-health-master
> 💻 Install free on Chrome Web Store: https://chromewebstore.google.com/detail/nomieaphhhhhikklfhmhhjcdgicaikgn
> 🌐 Website: https://bhm-pro-ern.pages.dev/
> 
> RTs appreciated! 🚀
