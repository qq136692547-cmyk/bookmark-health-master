# Chrome Web Store (CWS) 官方上架文案与审核指南 (Store Listing Kit)

本文档已准备好所有发布至 Chrome Web Store 开发者后台所需的文案、多语言描述与官方审核合规声明。

---

## 一、 核心元数据 (Store Metadata)

* **扩展名称 (Title)**: 
  * English: `Bookmark Health Master - Dead Link Cleaner & Organizer`
  * 简体中文: `书签健康管家 (BHM-PRO) - 死链清理与智能分类整理`
* **简短摘要 (Short Summary - 132字符以内)**:
  * English: `Detect dead 404 links, organize 16 global tech giant ecosystems, native Side Panel companion, zero-loss atomic undo snapshots.`
  * 简体中文: `原生体检清洗404失效死链，一键重组16大全球科技巨头官方全生态，Chrome原生侧边栏常驻，时光机原子级原位退回。`
* **商店分类 (Category)**: `Productivity` (生产力工具) 或 `Developer Tools` (开发者工具)
* **默认语言 (Default Language)**: `English` (支持多语言自动适配)

---

## 二、 完整详细描述 (Detailed Description)

### English Version:

```markdown
Are your Chrome bookmarks a cluttered mess with hundreds of broken 404 links and scattered links? 
Bookmark Health Master (BHM-PRO) is a modern, privacy-first Manifest V3 browser extension built to audit, sanitize, and reorganize your native bookmark bar without forcing you to migrate to an external cloud.

🔥 KEY CAPABILITIES:

1. 🩺 Dual-Stage Adaptive Dead Link Prober
• Runs smart HEAD probes with automatic slice-GET fallbacks.
• Distinguishes transient network challenges and Cloudflare security checkpoints from true HTTP 404/410 dead links—never falsely flags active websites!
• Cloudflare DoH (DNS-over-HTTPS) NXDOMAIN cross-validation: Queries public DNS (`https://cloudflare-dns.com/dns-query`) solely for domain existence checks—guarantees zero false-positive trashing while keeping full URLs and queries 100% private.
• Comprehensive intranet shielding: Automatically protects internal development URLs, cloud metadata endpoints, and sensitive actions (`localhost`, `10.*`, `192.168.*`, `172.16-31.*`, `169.254.*`, `100.64.*`, `198.18.*`, IPv6, `/logout`, `/unsubscribe`).

2. 🏛️ 16 Global Tech Giant Official Ecosystem Matrix
• Automatically identifies and clusters scattered bookmarks into clean official directories:
  Google, Huawei, Microsoft, Apple, Tencent, Alibaba, ByteDance, Amazon & AWS, Meta, OpenAI, NVIDIA, Baidu, Xiaomi, Anthropic, Cloudflare, and JD.
• UGC Container Isolation: Automatically isolates collaborative documents (Google Docs/Sheets, Feishu wikis, Yuque) into a dedicated "Docs & Knowledge Base" folder so they never clutter cloud console bookmarks.

3. ⏱️ Zero Data Loss Safety Engine & Move Journal
• Pre-action mandatory Netscape HTML snapshot backup before any modification.
• Quarantines broken links into a soft-delete "Trash" folder instead of permanently deleting them.
• Move Journal: Records original parent folder and index for every moved link. Restore any individual bookmark or reverse an entire reorganization back to its exact original position with 100% fidelity!
• 50ms serial micro-batch flow control protects Google Cloud Sync from merge conflicts and node duplication.

4. 📑 Native Chrome Side Panel Cockpit
• Transforms a once-a-year cleaning tool into a daily high-frequency productivity companion.
• Embedded directly into Chrome's native Side Panel with 16-ecosystem category tabs and millisecond fuzzy search.

🔒 PRIVACY & SECURITY FIRST:
• 100% Local-First: Your bookmarks, URLs, folder structures, and backups remain strictly on your local device—never uploaded to any proprietary remote servers.
• Transparent DNS Resolution: Public Cloudflare DoH (`https://cloudflare-dns.com/dns-query`) is queried solely for hostname resolution to cross-validate unreachable domains. Full URLs, paths, query parameters, cookies, and user data are never transmitted.
• No Browsing Traffic Monitoring: The extension never monitors, collects, or alters user browsing traffic in normal web tabs. Strictly during user-initiated bookmark health checkups, temporary session rules (`updateSessionRules`) remove the Origin request header exclusively on diagnostic probe requests dispatched to bookmarked domains from the extension's dashboard page or background Service Worker, and all session rules are uninstalled immediately once inspection completes or halts.
• Credentials Omitted: Diagnostic requests strictly enforce credentials: 'omit' to ensure zero cookies or session tokens are ever transmitted.
• Minimal & Dynamic Permissions: Broad network permissions are never asked at install—only optionally requested when you start a scan.

Start reclaiming a clean, organized, and lightning-fast bookmark experience today!
```

---

## 三、 CWS 官方审核问答与权限声明 (Reviewer Justification)

在 Chrome Web Store 开发者后台的 **「Privacy Practices」 (隐私权规范)** 选项卡中，Google 审核员会审查权限用途。请直接复制以下官方审核应答话术：

### 1. Single-Purpose Policy Statement (单一用途声明):
> "Bookmark Health Master (BHM-PRO) has a single, unified purpose: to audit native Chrome bookmarks for broken links, organize bookmarks into structured directories, and provide local backup and rollback capabilities."

### 2. Permission Justification: `bookmarks`
> "The 'bookmarks' permission is essential for reading the user's bookmark tree to detect URLs, creating organized category folders, and moving broken links into a quarantined trash folder upon explicit user request."

### 3. Permission Justification: `optional_host_permissions` (`*://*/*`)
> "The extension does NOT request host permissions at installation. The optional wildcard permission is requested dynamically only when the user explicitly clicks 'Start Full Scan'. It is strictly used to send low-overhead HTTP HEAD and Range-GET diagnostic requests directly from the user's browser to determine if bookmarked URLs return HTTP 404/410 status codes. All probe requests enforce credentials: 'omit' to guarantee no cookies or authentication tokens are ever sent. The extension never monitors, collects, or alters general web browsing traffic in normal tabs; during health scans, it only strips the Origin header on probe requests initiated by the extension itself to test target domain reachability."

### 4. Permission Justification: `storage` & `unlimitedStorage`
> "Used exclusively to store user-created Move Journals (transaction change logs) and Netscape HTML backup snapshots locally inside chrome.storage.local, allowing users to perform atomic rollbacks and safely export physical backup files."

### 5. Permission Justification: `declarativeNetRequest`
> "Used strictly during active health scans via temporary session rules (chrome.declarativeNetRequest.updateSessionRules) to remove the Origin request header exclusively on probe requests dispatched by the extension (from the dashboard page or background Service Worker) to test target domain reachability. This prevents cross-origin headers from triggering server anti-bot blocks, without monitoring, collecting, or altering general web browsing traffic in normal tabs. All session rules are uninstalled immediately upon scan completion or abort."

### 6. Third-Party Service Disclosure: Cloudflare DoH (`https://cloudflare-dns.com/dns-query`)
> "The extension queries Cloudflare's public DNS-over-HTTPS service (https://cloudflare-dns.com/dns-query) solely to resolve domain hostnames and cross-validate NXDOMAIN (non-existent domain) status during dead link health checks. Only the isolated domain hostname (no URL paths, query parameters, headers, or cookies) is sent in the DNS query. No personal data, bookmark titles, or browsing history is ever transmitted."

---

## 四、 商店视觉素材规格 (Store Asset Specs)

* **应用图标 (Store Icon)**: 128 x 128 px PNG (位于 `bookmark-organizer/icons/icon128.png`)
* **主要宣传图片 (Small Promo Tile)**: 440 x 280 px
* **大屏宣传图片 (Marquee Promo Tile)**: 1400 x 560 px
* **界面截图 (Screenshots - 推荐 3~5 张, 1280 x 800 px 或 640 x 400 px)**:
  * 截图 1: 全景大盘体检与死链雷达清单 (`dashboard.html` 体检结果页)
  * 截图 2: 16 大全球科技巨头官方全生态归拢网格
  * 截图 3: Chrome 原生侧边栏伴侣快速检索 (`sidepanel.html`)
  * 截图 4: 时光机快照与 Move Journal 原子原位回滚 (`dashboard.html` 时光机页)
