# Chrome Web Store (CWS) 官方开发者后台一页式提审指南 (Submission Guide)

> **适用版本**: Bookmark Health Master (BHM-PRO) Manifest V3 Production  
> **更新时间**: 2026-11-07  
> **配套物料目录**: `cws-store-assets/`

---

## 📌 Step 0: 提审封包核验信息 (Package Verification)

在上传 Chrome Web Store 开发者控制台前，请核对上传包的完整性指纹：

| 校验项 | 校验标准值 | 说明 |
| :--- | :--- | :--- |
| **上传文件绝对路径** | `d:\谷歌反重力空间\基本日常\bhm-pro-extension.zip` | 已经过 Manifest V3 深度安全审计与生产环境打包 |
| **文件大小 (Bytes)** | **`99,801` 字节** | 严格对照字节数，确保未被重新打包或篡改 |
| **SHA-256 校验和** | `8BF40E9FDAB55914F5B74D241AEB1AB898922F0F2B60F00ABADE0DEDF48C6DEC` | 官方安全基线校验散列值 |
| **Manifest 版本** | `3` (`manifest_version: 3`) | 遵循 Chrome 官方 2026 最新扩展规范 |

---

## 📝 Step 1: Store Listing (商店详情页一键复制)

进入 Chrome 开发者后台 -> 选中该扩展 -> 点击左侧 **Store listing** (商品详情)。

### 1.1 扩展名称 (Extension Name / Title)
* **English (Default)**:
```text
Bookmark Health Master - Dead Link Cleaner & Organizer
```
* **简体中文 (Simplified Chinese)**:
```text
书签健康管家 (BHM-PRO) - 死链清理与智能分类整理
```

### 1.2 简短摘要 (Short Summary - 132 字符以内)
* **English (127 chars)**:
```text
Detect dead 404 links, organize 16 global tech giant ecosystems, native Side Panel companion, zero-loss atomic undo snapshots.
```
* **简体中文 (58 chars)**:
```text
原生体检清洗404失效死链，一键重组16大全球科技巨头官方全生态，Chrome原生侧边栏常驻，时光机原子级原位退回。
```

### 1.3 完整详细描述 (Detailed Description)

#### 【English Version (Default)】
```markdown
Are your browser bookmarks a cluttered mess with hundreds of broken links and scattered folders? 
Bookmark Health Master (BHM-PRO) is a modern, privacy-first Manifest V3 browser extension built to audit, sanitize, and reorganize your native bookmark bar without forcing you to migrate to an external cloud.

KEY CAPABILITIES:

1. Dual-Stage Adaptive Dead Link Prober
- Runs smart HTTP HEAD probes with automatic Range-GET fallbacks to verify page reachability.
- Distinguishes transient network challenges and security checkpoints from true HTTP 404/410 dead links so active websites are never falsely flagged.
- Public DNS-over-HTTPS (DoH) NXDOMAIN cross-validation: Queries https://cloudflare-dns.com/dns-query solely for domain hostname existence checks, preventing false positives while keeping full URLs and query parameters completely private.
- Comprehensive intranet and action shielding: Automatically bypasses private local network addresses (localhost, RFC1918 private ranges, link-local) and sensitive action paths (/logout, /unsubscribe) to protect active sessions.

2. Intelligent Domain & Ecosystem Auto-Clustering
- Automatically identifies and groups scattered bookmarks into structured category folders based on domain hierarchy and platform ecosystems (cloud consoles, developer portals, AI workspaces, and productivity suites).
- Collaborative Document Isolation: Separates shared online documents, spreadsheets, and wiki pages into a dedicated "Docs & Knowledge Base" directory so they never clutter your primary workspace folders.

3. Zero Data Loss Safety Engine & Move Journal
- Mandatory pre-action Netscape HTML snapshot backup before any batch modification.
- Quarantines broken links into a soft-delete Trash folder instead of permanently deleting them.
- Move Journal: Records the original parent folder and exact slot index for every moved bookmark, allowing you to undo and restore items back to their exact original positions at any time.
- 50ms serial micro-batch flow control prevents bookmark sync conflicts and node duplication.

4. Native Side Panel Companion
- Built directly into the browser's native Side Panel for daily workflow efficiency.
- Features category filter pills and instant keyword search to locate any bookmark in milliseconds alongside your active tabs.

PRIVACY & SECURITY FIRST:
- 100% Local-First: Your bookmarks, URLs, folder structures, and HTML backups remain strictly on your local device and are never uploaded to remote servers.
- Hostname-Only DNS Check: Public DoH resolution sends only the isolated domain hostname to verify unreachable domains; full URLs, paths, queries, and cookies are never transmitted.
- No Browsing Traffic Monitoring: The extension never monitors, collects, or alters user browsing traffic in normal tabs. Strictly during user-initiated health scans, temporary session rules remove the Origin header only on diagnostic probe requests initiated by the extension itself, and are uninstalled immediately once the scan finishes.
- Credentials Omitted: All diagnostic probe requests enforce credentials: 'omit' so no cookies or session tokens are ever sent.
- Minimal & Dynamic Permissions: Host permissions are never requested at installation—only optionally requested when you start a scan.
```

#### 【简体中文版 (Simplified Chinese)】
```markdown
你的浏览器书签栏是否积压了上千条链接、充斥着大量打不开的 404 失效死链，以及杂乱无章的散落网页？
书签健康管家 (BHM-PRO) 是一款专为高效工作者与深度浏览器用户打造的 Manifest V3 原生架构扩展。无需迁往第三方云端书签服务，直接在本地对你的原生书签栏进行深度连通性体检、死链隔离清洗与多维生态目录自动归拢！

核心功能亮点：

1. 两阶段自适应死链体检引擎
- 智能 HEAD 探测与 Range-GET 降级兜底，精准区分站点安全防护质询与真实的 HTTP 404/410 失效死链，杜绝误判正常存活网站。
- DoH (DNS-over-HTTPS) 域名解析复核：仅在站点不可达时，向公共 DNS 接口 (https://cloudflare-dns.com/dns-query) 仅查询纯域名主机名是否存在 (NXDOMAIN)，兼顾高准确率与完整 URL 隐私保护。
- 内网地址与敏感参数熔断保护：自动识别并跳过本地与私有内网地址（如 localhost、RFC1918 私有网段等）及包含退出登录等敏感动作参数的链接（如 /logout、/unsubscribe），保护开发内网与当前登录会话。

2. 智能域名聚类与生态目录归拢
- 根据域名层级与平台属性，将散落在书签栏各处的链接自动归拢至结构化的官方生态与高频域名目录（涵盖云端控制台、开发者工具、AI 工作台与日常效率工具）。
- 协作文档独立隔离：自动识别在线文档、表格与知识库页面，将其独立归集至专属的“文档与知识库”目录，避免日常协作文档淹没核心工具书签。

3. 零数据丢失时光机与原子级 Move Journal 事务日志
- 执行任何批量隔离或归拢操作前，自动生成标准 Netscape HTML 全量离线备份快照。
- 检出的失效死链仅软移动至专属“隔离回收站”文件夹，绝不直接物理硬删除。
- Move Journal 完整记录每一条被移动书签的原父目录与精确插槽位置，支持随时一键 100% 原位无损回退。
- 50ms 串行微批流控机制，有效避免书签云同步冲突与节点重复。

4. 原生侧边栏 (Side Panel) 日常检索伴侣
- 深度集成浏览器原生侧边栏，随调随用。
- 内置分类快捷筛选标签与毫秒级关键词即时搜索，无需离开当前工作标签页即可快速定位并打开目标书签。

隐私与安全保障：
- 100% 本地优先：所有书签结构、网址与备份快照均保存在本机浏览器存储中，绝不上传至任何私有远端服务器。
- 纯主机名解析复核：DoH 复核仅传输纯域名，绝不发送完整路径、查询参数或身份凭据。
- 绝不监控日常浏览流量：扩展绝不监控、收集或修改用户在普通标签页中的浏览流量；仅在用户主动发起体检期间，通过会话级规则对扩展自身发出的探测请求移除 Origin 头，并在扫描结束时立即卸载。
- 凭据强制脱敏：所有诊断探测请求均强制设置 credentials: 'omit'，绝不携带任何 Cookie 或登录态。
```

### 1.4 分类与语言设置 (Category & Languages)
* **Category (分类)**: `Productivity` -> `Workflow & Planning` (或 `Developer Tools`)
* **Default Language (默认语言)**: `English (United States)`
* **Supported Languages**: 支持自动适配 English、中文 (简体)

### 1.5 视觉素材对应上传路径 (Graphic Assets)
在 Store Listing 页面的 **Graphic assets** 区域依次上传以下文件：

| 素材位置 | 推荐规格要求 | 本地文件路径 | 状态 |
| :--- | :--- | :--- | :--- |
| **Store Icon** | 128 × 128 px PNG | `cws-store-assets/promo/store-icon-128x128.png` | ✅ 规范就绪 |
| **Screenshots 1** | 1280 × 800 px, 24-bit RGB PNG (无 Alpha) | `cws-store-assets/screenshots/01-health-scan-doh.png` | ✅ 规范就绪 |
| **Screenshots 2** | 1280 × 800 px, 24-bit RGB PNG (无 Alpha) | `cws-store-assets/screenshots/02-16-titans-organizer.png` | ✅ 规范就绪 |
| **Screenshots 3** | 1280 × 800 px, 24-bit RGB PNG (无 Alpha) | `cws-store-assets/screenshots/03-time-machine-undo.png` | ✅ 规范就绪 |
| **Screenshots 4** | 1280 × 800 px, 24-bit RGB PNG (无 Alpha) | `cws-store-assets/screenshots/04-native-sidepanel.png` | ✅ 规范就绪 |
| **Small Promo Tile** | 440 × 280 px, 24-bit RGB PNG (无 Alpha) | `cws-store-assets/promo/promo-tile-440x280.png` | ✅ 规范就绪 |

---

## 🔒 Step 2: Privacy Practices (隐私权规范审核一键填表)

进入开发者后台 -> 点击左侧 **Privacy practices** (隐私权规范)。此页面为 Google CWS 审核团队人工审查最严格的核心板块，请逐项严格复制以下标准应答：

### 2.1 单一用途声明 (Single Purpose)
在 **Single purpose description** 输入框中粘贴：
```text
Bookmark Health Master (BHM-PRO) has a single, unified purpose: to audit native Chrome bookmarks for broken links, organize bookmarks into structured directories, and provide local backup and rollback capabilities.
```

### 2.2 权限声明 (Permission Justifications - 全部 7 项)

当后台展示权限列表时，在对应的文本框中分别填入以下说明：

1. **`bookmarks`**:
```text
The 'bookmarks' permission is essential for reading the user's bookmark tree to detect URLs, creating organized category folders, and moving broken links into a quarantined trash folder upon explicit user request.
```

2. **`storage`**:
```text
Used exclusively to store user-created Move Journals (transaction change logs), configuration preferences, and Netscape HTML backup snapshots locally inside chrome.storage.local, allowing users to perform atomic rollbacks and safely export physical backup files.
```

3. **`unlimitedStorage`**:
```text
Required to ensure large bookmark collections with extensive transaction histories (Move Journals) and multiple pre-operation HTML snapshots can be safely saved locally without exceeding quota limits.
```

4. **`sidePanel`**:
```text
Enables the native Chrome Side Panel interface, allowing users to search, filter by ecosystem, and access their organized bookmarks directly alongside their active browsing tabs without switching windows.
```

5. **`alarms`**:
```text
Used to maintain background Service Worker keepalive cycles strictly during active user-initiated health scans, preventing Chromium's 30-second idle termination from interrupting batch diagnostic operations.
```

6. **`declarativeNetRequest`**:
```text
Used strictly during active health scans via temporary session rules (chrome.declarativeNetRequest.updateSessionRules) to remove the Origin request header exclusively on probe requests dispatched by the extension (from the dashboard page or background Service Worker) to test target domain reachability. This prevents cross-origin headers from triggering server anti-bot blocks, without monitoring, collecting, or altering general web browsing traffic in normal tabs. All session rules are uninstalled immediately upon scan completion or abort.
```

7. **`Host permission (*://*/*)` / `optional_host_permissions`**:
```text
The extension does NOT request host permissions at installation. The optional wildcard permission is requested dynamically only when the user explicitly clicks 'Start Full Scan'. It is strictly used to send low-overhead HTTP HEAD and Range-GET diagnostic requests directly from the user's browser to determine if bookmarked URLs return HTTP 404/410 status codes. All probe requests enforce credentials: 'omit' to guarantee no cookies or authentication tokens are ever sent. The extension never monitors, collects, or alters general web browsing traffic in normal tabs; during health scans, it only strips the Origin header on probe requests initiated by the extension itself to test target domain reachability.
```

### 2.3 数据使用情况勾选指南 (Data Usage)

在 **Data usage** (数据使用) 区域，严格按照以下要求勾选：

1. **Website content (网页内容)**:
   * **操作**: **【勾选】**
   * **说明文本框 (Explanation)**:
```text
The extension reads bookmark URLs locally from the user's browser and dispatches connectivity probe requests directly to target servers to diagnose reachability. In addition, when domain existence verification is required during dead-link diagnostics, the extension queries Cloudflare's public DNS-over-HTTPS service (https://cloudflare-dns.com/dns-query) solely with the isolated domain hostname (e.g., example.com) to cross-validate NXDOMAIN status. No personal identifiers, bookmark titles, full URL paths, search parameters, or user browsing histories are transmitted or collected. All other 8 data categories (Personally identifiable information, Financial info, Health info, Location, User activity/browsing history, Authentication info, Personal communications, Sensitive categories) are strictly NOT collected.
```

2. **其余数据类别**:
   * **操作**: **【全部保持不勾选】** (不收集任何个人身份、金融资产、位置、健康、通讯或日常浏览历史数据)。

3. **三项核心合规承诺 (Certification Checkboxes)**:
   * **全部勾选确认**:
     - [x] **I do not sell or transfer user data to third parties, outside of the approved use cases.**
     - [x] **I do not use or transfer user data for purposes that are unrelated to the item's core functionality.**
     - [x] **I do not use or transfer user data to determine creditworthiness or for lending purposes.**

### 2.4 Privacy Policy URL 1 分钟零成本获取指南 (公开托管发布)

Chrome Web Store 要求必须提供公网可访问的 HTTPS 隐私政策页面链接。我们已为您生成完整的静态文件：`cws-store-assets/privacy-policy/index.html`。

你可以通过以下任意一种方式在 30 秒内获得永久免费的 HTTPS 链接：

* **方案 A (最推荐 - Cloudflare Pages Direct Upload)**:
  1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) -> 进入 **Compute (Workers & Pages)** -> **Pages**。
  2. 点击 **Upload assets (上传静态资源)**。
  3. 为项目命名为 `bhm-pro-privacy`，直接将 `cws-store-assets/privacy-policy/` 文件夹拖拽上传。
  4. 点击 **Deploy**，立即获得形如 `https://bhm-pro-privacy.pages.dev` 的全球高可用 HTTPS 链接，直接填入后台 **Privacy policy URL** 字段。
* **方案 B (GitHub Pages)**:
  1. 新建公开仓库 `bhm-pro-privacy`，上传 `cws-store-assets/privacy-policy/index.html`。
  2. 在 Settings -> Pages 中开启部署，获得 `https://<username>.github.io/bhm-pro-privacy/` 链接。
* **方案 C (Netlify Drop)**:
  1. 打开 `https://app.netlify.com/drop`。
  2. 拖入 `privacy-policy/` 文件夹，即刻生成免费 HTTPS 网址。

---

## 🧪 Step 3: 提审前本机 Chrome 3 分钟真机冒烟核对表 (Smoke Verification)

在点击最终提交审核按钮前，请使用解压版扩展进行 3 分钟真机快速复查：

1. **加载解压版测试**:
   * 打开 Chrome 浏览器，访问 `chrome://extensions`。
   * 打开右上角 **开发者模式 (Developer mode)** 开关。
   * 点击 **加载已解压的扩展程序 (Load unpacked)**，选择 `bookmark-organizer` 目录。
2. **核对核心路径 1：Chrome 原生 Side Panel 伴侣**:
   * 点击浏览器工具栏扩展图标，或在侧边栏下拉菜单选择 **Bookmark Health Master**。
   * 核验侧边栏正常展现，顶部的生态标签（`All` / `Google` / `AWS` / `OpenAI` / `Docs` 等）切换顺畅，在搜索栏输入关键词（如 `google`、`aws`）能毫秒级即时过滤高亮书签。
3. **核对核心路径 2：DNR 规则会话级生命周期安全隔离**:
   * 点击侧边栏右上角仪表盘图标打开 Dashboard 全景大盘。
   * 点击“Start Full Scan”启动体检，此时浏览器会弹出动态主机权限申请提示，确认授权。
   * 体检进行中，Service Worker 注入会话级 DNR 规则（针对发往书签域名的探测请求移除 `Origin` 头）。
   * 体检完成或点击 Stop Scan 停止后，在扩展 Service Worker 控制台执行 `chrome.declarativeNetRequest.getSessionRules().then(console.log)`，检查返回数组为空 `[]`，确认临时规则已彻底卸载，对常规网页浏览毫无影响。
4. **核对核心路径 3：多语言切换与分类归拢幂等性**:
   * 在 Dashboard 右上角点击 `🌐 中文` 切换为中文，确认所有标题、指标卡与说明瞬时切换；再次点击切换回 `🌐 EN`。
   * 点击“Reorganize Ecosystems”执行官方生态重组；重组完毕后再次点击执行重组，确认系统具备严格的幂等性保护，绝不会重复创建同名生态文件夹。

> ⚠️ **最终提审提醒**:  
> 完成真机测试后，请直接在 Chrome 开发者后台上传现成的 `d:\谷歌反重力空间\基本日常\bhm-pro-extension.zip`（99,801 字节，SHA-256: `8BF40E9FDAB55914F5B74D241AEB1AB898922F0F2B60F00ABADE0DEDF48C6DEC`）。请勿重新运行打包脚本或手动压缩，以确保线上包与审计指纹绝对一致！
