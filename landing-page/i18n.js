/**
 * Bookmark Health Master (BHM-PRO) Landing Page i18n Core
 * Dual-language engine: Simplified Chinese (zh) & English (en)
 * Zero external dependencies, pure client-side reactive DOM binding
 */

const BHM_I18N_DICT = {
  en: {
    // Meta & Head
    "meta.title": "Bookmark Health Master (BHM-PRO) — Zero 404s. Zero Telemetry. 100% Local.",
    "meta.description": "The privacy-first Chrome extension that detects broken 404 bookmarks with DNS-over-HTTPS diagnostics, auto-clusters 16 tech titan ecosystems, and provides atomic undo snapshots.",

    // Navbar
    "nav.features": "Features",
    "nav.architecture": "Architecture",
    "nav.pricing": "Pricing",
    "nav.faq": "FAQ",
    "nav.terms": "Terms",
    "nav.privacy": "Privacy",
    "nav.refunds": "Refunds",
    "nav.home": "Home",
    "nav.addChrome": "Add to Chrome (Free)",

    // Hero Section
    "hero.pill": "Officially Live on Google Chrome Web Store • Manifest V3",
    "hero.title": "Resurrect Your Bookmarks.<br><span class=\"gradient-text\">Zero 404s. Zero Telemetry.</span>",
    "hero.subtitle": "The high-performance Chrome extension that diagnoses dead bookmarks with <strong>DNS-over-HTTPS fallback</strong>, auto-clusters <strong>16 Tech Titans ecosystems</strong>, and safeguards every change with <strong>sibling-anchor atomic undo snapshots</strong>.",
    "hero.ctaAdd": "Add to Chrome — It's Free",
    "hero.ctaGithub": "Star on GitHub (MIT)",
    "hero.ctaPricing": "Explore Pro ($4.90+)",
    "hero.proofLocal": "100% Local Processing",
    "hero.proofMit": "Open Source (MIT)",
    "hero.proofTelemetry": "Zero Cloud Telemetry",
    "hero.proofSidepanel": "Native SidePanel",
    "hero.proofGuarantee": "14-Day Money-Back",

    // Comparison Section
    "comp.tag": "Why Traditional Cleaners Break",
    "comp.title": "The Dangerous Flaws of Naive Bookmark Tools",
    "comp.desc": "Why clumsy HTTP bots delete valid bookmarks, trigger false alarms, and put your browsing history at risk.",
    "comp.badBadge": "❌ Outdated Naive Cleaners",
    "comp.bad1": "<strong>False 404s from WAFs:</strong> Simple HTTP HEAD requests get blocked by Cloudflare/Akamai bot detection, mistakenly marking legitimate sites as dead.",
    "comp.bad2": "<strong>Cloud Telemetry Danger:</strong> Uploads your private bookmark links and intranet URLs to remote servers for \"cloud scanning\".",
    "comp.bad3": "<strong>Destructive Mass Deletions:</strong> Deletes dead links irreversibly without snapshot tracking or sibling position recording.",
    "comp.bad4": "<strong>Messy Flat Folders:</strong> Lumps hundreds of developer consoles, cloud docs, and tools into endless disorganized lists.",
    "comp.goodBadge": "🛡️ BHM-PRO Engineering Edge",
    "comp.good1": "<strong>Dual-Stage DoH Verification:</strong> Validates DNS transport via Cloudflare (1.1.1.1) and Google (8.8.8.8) to distinguish genuine dead domains from network timeouts.",
    "comp.good2": "<strong>100% Local-First & Zero Telemetry:</strong> All URL checks, pattern matching, and state journals run entirely in your local browser sandbox.",
    "comp.good3": "<strong>Sibling-Anchor Atomic Rollback:</strong> Time-machine undo snapshots record exact indices and parent nodes for flawless one-click restoration.",
    "comp.good4": "<strong>16 Tech Titans Auto-Clustering:</strong> Instantly sorts AWS, Google Cloud, Azure, Cloudflare, GitHub, Apple, Meta into structured hierarchies.",

    // Features Section
    "feat.tag": "Deep Feature Architecture",
    "feat.title": "Built for Power Users, Developers & Curators",
    "feat.desc": "Explore the five core pillars that make BHM-PRO the most dependable bookmark manager in the Chrome ecosystem.",
    "feat.tab1Btn": "1. DoH Dead Link Diagnostics",
    "feat.tab2Btn": "2. 16 Tech Titans Clustering",
    "feat.tab3Btn": "3. UGC Docs Smart Isolation",
    "feat.tab4Btn": "4. Atomic Time-Machine Rollback",
    "feat.tab5Btn": "5. Native SidePanel Workflow",

    // Feature Tab 1: DoH
    "feat.tab1Title": "Dual-Stage DNS-over-HTTPS (DoH) Prober",
    "feat.tab1Desc": "When a bookmark link fails to respond, traditional tools immediately declare it \"dead\". BHM-PRO triggers a secondary diagnostic handshake through Cloudflare and Google DoH endpoints to check if the authoritative domain still exists.",
    "feat.tab1Bullet1": "🎯 Filters out temporary network dropouts and aggressive WAF bot challenges.",
    "feat.tab1Bullet2": "🎯 Confirms NXDOMAIN (unregistered domain) vs HTTP 404 / 500 status codes.",
    "feat.tab1Bullet3": "🎯 Smart quarantine: moves dead links into an isolated quarantine folder before any deletion.",
    "feat.tab1Cta": "Try DoH Diagnostics",

    // Feature Tab 2: Titans
    "feat.tab2Title": "16 Tech Titans Ecosystem Auto-Clustering",
    "feat.tab2Desc": "Tired of hunting for the AWS Console, Google Cloud Run, GitHub Repo, or Cloudflare DNS settings buried in bookmarks? BHM-PRO uses regex heuristics to identify official platforms and group them into pristine ecosystem folders.",
    "feat.tab2Bullet1": "⚡ Ecosystems: AWS, Google, Microsoft, Cloudflare, GitHub, Apple, Meta, ByteDance, Vercel, Supabase, OpenAI, Anthropic, and more.",
    "feat.tab2Bullet2": "⚡ Smart subdomain mapping: accurately differentiates public documentation from tenant apps.",
    "feat.tab2Bullet3": "⚡ Retains custom folder structures without disturbing untouched subdirectories.",
    "feat.tab2Cta": "Explore 16 Titans Organizer",

    // Feature Tab 3: UGC
    "feat.tab3Title": "UGC Collaborative Docs Smart Isolation",
    "feat.tab3Desc": "Modern workflows live in collaborative cloud documents. Clumsy cleaners often treat private Notion pages, Google Docs, Figma workspaces, or Lark/Feishu bases as broken links or lump them into generic company folders.",
    "feat.tab3Bullet1": "🛡️ <strong>Zero Accidental Deletions:</strong> Dedicated isolation layer shields Notion, Google Docs, Sheets, Slides, Feishu/Lark, and Figma links from bulk quarantines.",
    "feat.tab3Bullet2": "🛡️ <strong>Authentication Awareness:</strong> Recognizes private intranet and login-required collaborative doc URLs, preventing false 401/403 \"dead link\" misdiagnoses.",
    "feat.tab3Bullet3": "🛡️ <strong>Workspace Preserving:</strong> Keeps shared team links pristine and accessible without disturbing custom titles or sharing parameters.",
    "feat.tab3Cta": "Protect Collaborative Docs",

    // Feature Tab 4: Undo
    "feat.tab4Title": "Sibling-Anchor Atomic Rollback Journal",
    "feat.tab4Desc": "Never fear reorganizing or cleaning bookmarks again. Every batch action taken in BHM-PRO creates a cryptographic delta snapshot in your browser's private local storage.",
    "feat.tab4Bullet1": "⏳ Restores exact index positions, parent folder IDs, and sibling hierarchy.",
    "feat.tab4Bullet2": "⏳ Full history log with date, action type, and total items impacted.",
    "feat.tab4Bullet3": "⏳ Instant one-click rollback even if Chrome restarts.",
    "feat.tab4Cta": "Experience Zero-Risk Undo",

    // Feature Tab 5: SidePanel
    "feat.tab5Title": "Native Chrome SidePanel Interface",
    "feat.tab5Desc": "No annoying popups that close when you click elsewhere. BHM-PRO lives seamlessly inside the official Chrome SidePanel, allowing you to audit and organize bookmarks side-by-side with your active browser tabs.",
    "feat.tab5Bullet1": "📌 Zero popup dismissal — inspect bookmarks while browsing live documentation.",
    "feat.tab5Bullet2": "📌 Sleek dark glassmorphic UI matching Chrome's latest design specifications.",
    "feat.tab5Bullet3": "📌 Keyboard shortcuts and fast search filter for instant navigation.",
    "feat.tab5Cta": "Install Extension Free",

    // Architecture Section
    "arch.tag": "Engineered For Privacy",
    "arch.title": "Cryptographic Integrity & Local-First Design",
    "arch.desc": "We designed BHM-PRO to provide enterprise-grade reliability without compromising your privacy.",
    "arch.card1Title": "Ed25519 Cryptographic Licensing",
    "arch.card1Desc": "Pro activation uses offline asymmetric digital signatures (RFC 8032). The extension verifies your license key locally using our public key in milliseconds — zero \"phone-home\" licensing pings.",
    "arch.card2Title": "Zero Telemetry & RFC 1918 Intranet Fuse",
    "arch.card2Desc": "BHM-PRO has no telemetry collectors, analytics beacons, or remote logging servers. Your bookmark names, folder structures, and web history never leave your computer. Prober automatically shields RFC 1918 private subnets from SSRF.",
    "arch.card3Title": "Chrome Manifest V3 Compliant",
    "arch.card3Desc": "Complies strictly with Google's Manifest V3 security model. No remotely hosted scripts, sandboxed execution, and memory-efficient service workers.",

    // Pricing Section
    "price.tag": "Transparent Pricing",
    "price.title": "Simple, Honest Plans for Every Workflow",
    "price.desc": "Start free on the Chrome Web Store, or upgrade with a one-time pass or lifetime buyout. No recurring subscriptions or hidden lock-ins.",

    "price.freeName": "Free Edition",
    "price.freeDesc": "For everyday casual bookmark audits and individual cleanups.",
    "price.freeCurrency": "$",
    "price.freeAmount": "0",
    "price.freePeriod": "/ forever",
    "price.freePerk1": "Full bookmark health inspection",
    "price.freePerk2": "Single dead link quarantine",
    "price.freePerk3": "Chrome SidePanel UI",
    "price.freePerk4": "100% Local-first privacy",
    "price.freeBtn": "Download from Chrome Web Store",

    "price.washName": "30-Day Single Wash",
    "price.washDesc": "Perfect for spring cleaning large bookmark libraries with batch power.",
    "price.washCurrency": "$",
    "price.washAmount": "4.90",
    "price.washPeriod": "/ 30 days",
    "price.washPerk1": "<strong>500 dead link</strong> batch quarantine quota",
    "price.washPerk2": "Deep DoH DNS-over-HTTPS diagnostics",
    "price.washPerk3": "Full atomic rollback journal",
    "price.washPerk4": "Instant Ed25519 digital license delivery",
    "price.washBtn": "Get 30-Day Pass ($4.90)",

    "price.ltdRibbon": "Most Popular · Early Bird",
    "price.ltdName": "Lifetime Buyout",
    "price.ltdDesc": "Perpetual license for serious developers, researchers, and creators.",
    "price.ltdCurrency": "$",
    "price.ltdAmount": "14.90",
    "price.ltdPeriod": "/ one-time pay",
    "price.ltdPerk1": "<strong>Unlimited</strong> dead link batch quarantines",
    "price.ltdPerk2": "<strong>Unlimited 16 Tech Titans</strong> auto-clustering",
    "price.ltdPerk3": "Multi-device Chrome profile activation",
    "price.ltdPerk4": "Lifetime free software updates",
    "price.ltdPerk5": "Priority developer support (<a href=\"mailto:qq136692547@gmail.com\" style=\"color:#60a5fa;\">24hr SLA</a>)",
    "price.ltdBtn": "Buy Lifetime License ($14.90)",

    "price.guarantee": "<strong>14-Day 100% Money-Back Guarantee:</strong> If BHM-PRO doesn't save you hours of bookmark frustration, email us for a full refund.",

    // License Lookup
    "lookup.title": "Already Purchased? Retrieve Your License",
    "lookup.desc": "Lost your activation key? Enter your Paddle Order ID and purchase Email below for instant recovery.",
    "lookup.orderPlaceholder": "Paddle Order ID (e.g. txn_...)",
    "lookup.emailPlaceholder": "Your purchase email",
    "lookup.btn": "Retrieve Key",

    // FAQ Section
    "faq.tag": "Frequently Asked Questions",
    "faq.title": "Everything You Need to Know",
    "faq.desc": "Have questions about BHM-PRO? Find quick answers right here.",

    "faq.q1": "Does BHM-PRO send my bookmarks to your servers?",
    "faq.a1": "<strong>Absolutely NOT.</strong> BHM-PRO operates with a strict 100% local-first architecture. All bookmark reading, probing, pattern clustering, and snapshot tracking occur locally on your machine. We never collect or transmit your bookmark URLs or browsing history.",

    "faq.q2": "How does the DNS-over-HTTPS (DoH) diagnostic work?",
    "faq.a2": "Many anti-bot systems (like Cloudflare Turnstile or Akamai) return 403 or 503 HTTP errors to browser probes, making active websites look dead. BHM-PRO performs a secondary DoH lookup directly against Cloudflare (1.1.1.1) and Google (8.8.8.8) to verify if the domain still resolves at the DNS level. Only genuine dead links (such as NXDOMAIN or true 404s) are flagged.",

    "faq.q3": "How is my license key activated?",
    "faq.a3": "Immediately after checkout via Paddle, your Order ID is processed and an Ed25519 cryptographic license token is generated. You receive this token on screen, via email, and can retrieve it anytime using our self-service lookup box above. Simply copy and paste the key into the BHM-PRO SidePanel settings to unlock Pro features instantly.",

    "faq.q4": "Can I use my Lifetime Buyout license on multiple computers?",
    "faq.a4": "Yes! Your Lifetime Buyout license is valid for all personal Chrome browser profiles and computers (Mac, Windows, Linux) that you personally own and operate.",

    "faq.q5": "What is your refund policy?",
    "faq.a5": "We provide a <strong>14-day 100% money-back guarantee</strong> on all paid plans. If you are not satisfied for any reason, email us at <a href=\"mailto:qq136692547@gmail.com\" style=\"color: #60a5fa;\">qq136692547@gmail.com</a> with your Paddle Order ID, and your payment will be refunded immediately without friction.",

    // Footer
    "footer.brandDesc": "The privacy-first Chrome extension that resurrects broken bookmarks, clusters tech ecosystems, and guarantees zero data leakage.",
    "footer.colProduct": "Product",
    "footer.cws": "Chrome Web Store",
    "footer.features": "Features",
    "footer.pricing": "Pricing Plans",
    "footer.retrieve": "Retrieve License",
    "footer.colLegal": "Legal & Policy",
    "footer.terms": "Terms of Service",
    "footer.privacy": "Privacy Policy",
    "footer.refund": "Refund Policy",
    "footer.colOpenSource": "Open Source",
    "footer.github": "GitHub Repo",
    "footer.mit": "MIT License",
    "footer.issues": "Issue Tracker",
    "footer.releases": "Releases (v2.1.0)",
    "footer.colSupport": "Merchant & Support",
    "footer.operator": "Operator: L.D. Studio (Pudong, Shanghai)",
    "footer.fulfillment": "Fulfillment: 100% Instant Digital Delivery",
    "footer.merchant": "Merchant: Paddle.com",
    "footer.copyright": "© 2026 Bookmark Health Master (BHM-PRO) by L.D. Studio. All rights reserved. Merchant of Record: Paddle.com Market Ltd.",
    "footer.disclaimer": "Chrome is a registered trademark of Google LLC. BHM-PRO is an independent extension built for Google Chrome."
  },

  zh: {
    // Meta & Head
    "meta.title": "Bookmark Health Master (BHM-PRO) — 零死链 · 零云端遥测 · 100% 本地隐私",
    "meta.description": "专为极客打造的高性能 Chrome 书签健康体检与大厂生态智能整理扩展。具备 DNS-over-HTTPS 深度死链嗅探、16 科技巨头生态归类、UGC 协同文档沙箱保护与同级锚点时光机回滚。",

    // Navbar
    "nav.features": "功能特性",
    "nav.architecture": "安全架构",
    "nav.pricing": "方案定价",
    "nav.faq": "常见问题",
    "nav.terms": "服务条款",
    "nav.privacy": "隐私协议",
    "nav.refunds": "退款政策",
    "nav.home": "首页",
    "nav.addChrome": "免费添加至 Chrome",

    // Hero Section
    "hero.pill": "已正式上架 Google Chrome 官方商店 • Manifest V3 原生架构",
    "hero.title": "让沉睡的书签重获新生。<br><span class=\"gradient-text\">零 404 死链 · 零云端遥测 · 100% 本地隐私</span>",
    "hero.subtitle": "专为极客与研究者打造的高性能 Chrome 原生扩展。集成 <strong>DNS-over-HTTPS 深度双阶段死链体检</strong>、<strong>16 大全球与中国科技巨头生态智能归类收纳</strong>，并以<strong>同级锚点时光机快照</strong>提供原子级 100% 无损撤销回滚。",
    "hero.ctaAdd": "免费添加至 Chrome",
    "hero.ctaGithub": "在 GitHub 关注开源 (MIT)",
    "hero.ctaPricing": "了解 Pro 特权 (¥35+)",
    "hero.proofLocal": "100% 本地沙箱运行",
    "hero.proofMit": "核心开源 (MIT 协议)",
    "hero.proofTelemetry": "零云端隐私遥测",
    "hero.proofSidepanel": "Chrome 原生侧边栏",
    "hero.proofGuarantee": "14 天无理由全额退款",

    // Comparison Section
    "comp.tag": "为什么传统书签清理工具频频误杀",
    "comp.title": "传统简陋清理工具的四大致命缺陷",
    "comp.desc": "揭秘简易 HTTP 探测器为何屡屡误判正常网址、误删珍贵收藏，甚至将您的个人私密链接泄露给第三方云端。",
    "comp.badBadge": "❌ 传统淘汰型简易清理工具",
    "comp.bad1": "<strong>WAF 防爬误报死链：</strong>简陋的 HTTP HEAD 请求极易触发 Cloudflare、Akamai 等防御拦截，导致大量正常高频站点被当成死链误杀。",
    "comp.bad2": "<strong>云端数据隐私泄露：</strong>将用户的全部私人书签与内网敏感地址上传至未经审计的远程服务器进行所谓「云端检测」。",
    "comp.bad3": "<strong>破坏性不可逆删除：</strong>直接硬编码暴力批量删除，无快照归档、不记录原位父节点与同级相对位置，误删后永远无法找回。",
    "comp.bad4": "<strong>结构混乱杂草丛生：</strong>数百个云计算控制台、开发者文档与生产力工具无序混杂，层级错乱，毫无归纳效率。",
    "comp.goodBadge": "🛡️ BHM-PRO 生产级工程壁垒",
    "comp.good1": "<strong>双阶段 DoH 深度复核：</strong>通过 Cloudflare (1.1.1.1) 与 Google (8.8.8.8) 原生安全 DNS 传输，精准鉴别域名真死（NXDOMAIN）与网络偶发波动。",
    "comp.good2": "<strong>100% 本地沙箱与零遥测：</strong>所有 URL 探测、生态正则匹配、事务日志均在浏览器沙箱内本地闭环执行，绝不向外发送任何请求。",
    "comp.good3": "<strong>同级锚点原子级时光机回滚：</strong>毫秒级记录原始父节点 ID 与绝对序号索引，支持一键 100% 无损原位恢复，绝不丢书签。",
    "comp.good4": "<strong>16 大科技巨头生态智能收纳：</strong>毫秒级将 AWS、谷歌、微软、Cloudflare、GitHub、苹果、字节跳动、华为等自动归纳至规范目录树。",

    // Features Section
    "feat.tag": "深度特性矩阵",
    "feat.title": "专为极客开发者、研究学者与数字知识策展人量身打造",
    "feat.desc": "探索构筑 BHM-PRO 极客工程品质的五大核心技术支柱，重新定义书签管理体验。",
    "feat.tab1Btn": "1. DoH 深度死链嗅探",
    "feat.tab2Btn": "2. 16 科技巨头生态归类",
    "feat.tab3Btn": "3. UGC 协同文档沙箱隔离",
    "feat.tab4Btn": "4. 原子级镜像与撤销回退",
    "feat.tab5Btn": "5. Chrome 原生侧边栏工作流",

    // Feature Tab 1: DoH
    "feat.tab1Title": "双阶段 DNS-over-HTTPS (DoH) 自适应死链探针",
    "feat.tab1Desc": "当书签链接未能响应时，传统工具往往武断判死。BHM-PRO 会立即自动启动双阶段机制，利用 Cloudflare 与 Google 权威 DoH 端点进行域名存在性权威裁决，防止误判。",
    "feat.tab1Bullet1": "🎯 自动过滤网络偶发波动与各类防爬安全网关（WAF）的人机验证干扰。",
    "feat.tab1Bullet2": "🎯 精确区分域名已注销下线（NXDOMAIN）与临时性 HTTP 404 / 500 服务端状态码。",
    "feat.tab1Bullet3": "🎯 采用安全隔离仓机制：在执行任何清理前，先将疑似失效书签原样转移至安全回收站，防患于未然。",
    "feat.tab1Cta": "体验 DoH 深度体检",

    // Feature Tab 2: Titans
    "feat.tab2Title": "16 大全球与中国科技巨头生态智能重组收纳",
    "feat.tab2Desc": "厌倦了在茫茫书签海洋中苦苦搜索 AWS 控制台、Google Cloud、GitHub 代码仓库或 Cloudflare 域名配置？BHM-PRO 采用严谨的生态正则启发式引擎，一键归类。",
    "feat.tab2Bullet1": "⚡ 全面覆盖 16 大官方生态：谷歌、微软、华为、AWS、苹果、字节跳动、Cloudflare、GitHub、Meta、OpenAI、百度、小米、Anthropic 等。",
    "feat.tab2Bullet2": "⚡ 智能子域名精准映射：精确隔离公开通用产品文档与企业租户业务平台。",
    "feat.tab2Bullet3": "⚡ 保持用户自有层级：不破坏用户既有的个人自定义目录与未命中生态的独立节点。",
    "feat.tab2Cta": "探索 16 大生态智能整理",

    // Feature Tab 3: UGC
    "feat.tab3Title": "UGC 协同文档与云端知识库安全隔离沙箱",
    "feat.tab3Desc": "现代数字工作流高度依赖云端协作文档。粗糙的清理工具常将带有私有鉴权的飞书多维表格、语雀知识库、腾讯文档、Notion 或 Google Docs 误判为死链，或粗暴归入公司通用文件夹。",
    "feat.tab3Bullet1": "🛡️ <strong>杜绝误删珍贵文档：</strong>独创 UGC 保护层，自动识别并严密隔离飞书/Lark、语雀、腾讯文档、Google Docs、Notion 与 Figma 等协作文档。",
    "feat.tab3Bullet2": "🛡️ <strong>登录鉴权状态感知：</strong>智能识别需登录态的私有文档 URL，坚决阻断因 401/403 重定向造成的「死链」误判。",
    "feat.tab3Bullet3": "🛡️ <strong>完整保留工作空间上下文：</strong>保留团队共享链接的完整查询参数与自定义标签，随用随开。",
    "feat.tab3Cta": "体验协同文档保护",

    // Feature Tab 4: Undo
    "feat.tab4Title": "基于同级锚点事务日志的原子级时光机回滚",
    "feat.tab4Desc": "再也不必担心误改或误删书签。BHM-PRO 每次执行批量清理或重组时，均会在浏览器本地 IndexedDB 中生成带时间戳的高精度差分快照与位置还原日志。",
    "feat.tab4Bullet1": "⏳ 精确原位还原：完美恢复书签在原文件夹中的绝对前后顺序与从属父节点，不发生索引漂移。",
    "feat.tab4Bullet2": "⏳ 全量操作审计日志：清晰追溯每次整理的时间、操作类型与影响书签数量。",
    "feat.tab4Bullet3": "⏳ 即便浏览器重启或崩溃，本地快照与日志始终完好，支持一键无缝还原。",
    "feat.tab4Cta": "体验零风险原位回滚",

    // Feature Tab 5: SidePanel
    "feat.tab5Title": "Chrome 原生侧边栏常驻工作流伴侣",
    "feat.tab5Desc": "彻底告别鼠标一点就自动消失的易失弹窗。BHM-PRO 深度集成 Chrome 官方 SidePanel API，像代码编辑器侧边栏一样常驻，一边查阅网页，一边同步整理书签。",
    "feat.tab5Bullet1": "📌 常驻不失焦：在浏览长篇技术文档或视频时随时检索、收藏与分类，绝不意外关闭。",
    "feat.tab5Bullet2": "📌 高质感深色流光磨砂玻璃视觉：完美契合 Chrome 最新设计语言与现代极客审美。",
    "feat.tab5Bullet3": "📌 毫秒级即时模糊搜索：海量书签瞬时过滤定位。",
    "feat.tab5Cta": "免费安装 Chrome 扩展",

    // Architecture Section
    "arch.tag": "专为极度隐私而生",
    "arch.title": "高可靠密码学验真与纯本地离线架构",
    "arch.desc": "我们在底层架构上恪守企业级工程规范，在赋予您强大治理能力的同时，守住最严苛的数据隐私底线。",
    "arch.card1Title": "Ed25519 纯本地离线密码学验真",
    "arch.card1Desc": "Pro 版商业授权基于 RFC 8032 工业级 Ed25519 非对称公钥密码体系。扩展内部使用内置公钥在本地毫秒级验证签名真伪，无需任何网络心跳回传，实现 100% 离线脱机激活。",
    "arch.card2Title": "零云端遥测与 RFC 1918 内网熔断",
    "arch.card2Desc": "全系无任何第三方统计 SDK、追踪信标或远程日志上报。您的书签标题、URL 与分类层级 100% 保留在本地机器。探测引擎内置 RFC 1918 内网熔断防御，坚决阻止对本地内网与回环地址（192.168.*, 10.*, 127.0.0.1）的非法嗅探。",
    "arch.card3Title": "严格遵循 Chrome Manifest V3 现代规范",
    "arch.card3Desc": "严格符合 Google Chrome 官方 Manifest V3 安全标准与上架审计要求。绝无任何远程动态脚本执行，基于极低内存占用的 Service Worker 事件生命周期驱动。",

    // Pricing Section
    "price.tag": "透明实在的定价",
    "price.title": "契合不同工作流的清晰方案",
    "price.desc": "可在 Chrome Web Store 永久免费体验基础功能；支持按需购买 30 天大扫除卡或终身买断。无周期性扣费订阅，无任何隐藏绑架套路。",

    "price.freeName": "免费社区版 (Free)",
    "price.freeDesc": "适合日常基础书签体检与少量死链清理需求。",
    "price.freeCurrency": "¥",
    "price.freeAmount": "0",
    "price.freePeriod": "($0) / 永久免费",
    "price.freePerk1": "全库书签健康深度体检",
    "price.freePerk2": "单条失效死链手动安全隔离",
    "price.freePerk3": "Chrome 原生常驻 SidePanel 侧边栏",
    "price.freePerk4": "100% 纯本地离线隐私沙箱",
    "price.freeBtn": "从 Chrome 应用商店免费安装",

    "price.washName": "30 天大扫除体验卡",
    "price.washDesc": "适合一次性大扫除海量积压旧书签，全面恢复目录整洁。",
    "price.washCurrency": "¥",
    "price.washAmount": "35",
    "price.washPeriod": "($4.90 USD) / 30 天有效",
    "price.washPerk1": "<strong>500 个失效死链</strong>批量一键隔离回收配额",
    "price.washPerk2": "开启 DoH (DNS-over-HTTPS) 权威防误杀深度诊断",
    "price.washPerk3": "完整同级锚点原子级快照与事务回滚记录",
    "price.washPerk4": "Ed25519 数字许可证秒级自动下发",
    "price.washBtn": "获取 30 天体验卡 (¥35 / $4.90)",

    "price.ltdRibbon": "极客首选 · 早鸟限时特惠",
    "price.ltdName": "Pro 终身买断授权",
    "price.ltdDesc": "面向开发者、学术研究者与信息知识博主的终极效率底座。",
    "price.ltdCurrency": "¥",
    "price.ltdAmount": "99",
    "price.ltdPeriod": "($14.90 USD) / 一次买断永久有效",
    "price.ltdPerk1": "<strong>无限制</strong>批量死链一键隔离与智能恢复",
    "price.ltdPerk2": "<strong>无限制 16 大科技巨头生态</strong>智能重组与未分类建夹",
    "price.ltdPerk3": "支持个人名下多台设备与多个 Chrome 用户配置多端激活",
    "price.ltdPerk4": "享有一切未来重磅新版免费无缝升级",
    "price.ltdPerk5": "优先技术支持通道 (<a href=\"mailto:qq136692547@gmail.com\" style=\"color:#60a5fa;\">24 小时 SLA</a>)",
    "price.ltdBtn": "购买终身授权 (¥99 / $14.90)",

    "price.guarantee": "<strong>14 天 100% 无条件全额退款承诺：</strong>若 BHM-PRO 未能为您省下梳理书签的大量精力，发邮件即可光速全额退款，无任何推诿。",

    // License Lookup
    "lookup.title": "已经购买？自助找回您的授权码",
    "lookup.desc": "找不到授权密钥邮件？输入购买时的 Paddle 订单号与邮箱，系统将立即从边缘数据库中重新取回您的 Ed25519 密钥。",
    "lookup.orderPlaceholder": "Paddle 订单号 (例如 txn_...)",
    "lookup.emailPlaceholder": "下单时填写的邮箱地址",
    "lookup.btn": "立即找回密钥",

    // FAQ Section
    "faq.tag": "常见问题答疑",
    "faq.title": "您关心的问题，这里都有答案",
    "faq.desc": "关于 BHM-PRO 的隐私机制、运作原理及授权说明。",

    "faq.q1": "BHM-PRO 会将我的书签或浏览记录上传到服务器吗？",
    "faq.a1": "<strong>绝对不会。</strong>BHM-PRO 恪守严格的 100% 本地优先（Local-First）原则。所有书签读取、网络健康探针、生态正则匹配、快照生成及数据存储均在您本地计算机的 Chrome 浏览器沙箱内独立闭环完成。我们没有后端数据收集服务器，绝不收集或传输您的任何书签与浏览历史。",

    "faq.q2": "DNS-over-HTTPS (DoH) 深度死链嗅探是如何运作的？",
    "faq.a2": "许多主流网站（如 Cloudflare、Akamai 保护的站点）对非人工 HTTP 探测默认返回 403 或 503 拦截码，容易被普通工具误判为失效。BHM-PRO 在遇到异常状态时，会立即通过全球顶级安全 DNS 服务商 Cloudflare (1.1.1.1) 与 Google (8.8.8.8) 进行二次 DoH 查询，核查该域名是否在 DNS 层面上真实注销失效（NXDOMAIN）。只有确诊彻底弃用的域名才会被归为死链，极大避免误杀。",

    "faq.q3": "购买后如何激活我的 Pro 商业授权？",
    "faq.a3": "通过 Paddle 完成结算后，系统将自动基于非对称密码算法签发独立的 Ed25519 授权密钥。您将在页面上直接看到该密钥，同时也会收到一封包含密钥的确认邮件。在任何时候，您都可以使用本页面的「自助找回密钥」模块快速取回。复制该密钥粘贴至扩展 SidePanel 或全景大盘的授权输入框中，即可实现毫秒级脱机离线激活。",

    "faq.q4": "终身买断版可以在我的多台电脑和多个浏览器配置上使用吗？",
    "faq.a4": "<strong>完全可以！</strong>终身买断许可证支持您个人名下拥有的全部 Mac、Windows、Linux PC 设备以及同台电脑上的多个 Chrome 独立用户配置文件（Personal Profiles）。",

    "faq.q5": "你们的退款保障政策是怎样的？",
    "faq.a5": "我们为所有付费方案提供 <strong>14 天内 100% 无条件全额退款承诺</strong>。如果您在体验后有任何不满意，只需发送邮件至 <a href=\"mailto:qq136692547@gmail.com\" style=\"color: #60a5fa;\">qq136692547@gmail.com</a> 并附上您的 Paddle 订单号，我们将在审核后极速原路全额退款，没有任何推诿或繁琐借口。",

    // Footer
    "footer.brandDesc": "守护隐私的 Chrome 原生扩展。深度体检复活死链、归拢全球科技巨头生态，100% 本地运行坚决捍卫数据隐私。",
    "footer.colProduct": "产品矩阵",
    "footer.cws": "Chrome 官方商店",
    "footer.features": "功能特性",
    "footer.pricing": "方案定价",
    "footer.retrieve": "自助找回密钥",
    "footer.colLegal": "合规政策",
    "footer.terms": "服务条款 (Terms)",
    "footer.privacy": "隐私协议 (Privacy)",
    "footer.refund": "退款政策 (Refund)",
    "footer.colOpenSource": "开源生态",
    "footer.github": "GitHub 仓库",
    "footer.mit": "MIT 开源协议",
    "footer.issues": "问题与建议反馈",
    "footer.releases": "版本发布记录 (v2.1.0)",
    "footer.colSupport": "商户与支持",
    "footer.operator": "运营团队: L.D. Studio (中国上海浦东)",
    "footer.fulfillment": "交付方式: 100% 数字化秒级下发",
    "footer.merchant": "签约商户: Paddle.com",
    "footer.copyright": "© 2026 Bookmark Health Master (BHM-PRO) by L.D. Studio. 保留所有权利。名义商户代管: Paddle.com Market Ltd.",
    "footer.disclaimer": "Chrome 是 Google LLC 的注册商标。BHM-PRO 是专为 Google Chrome 打造的独立第三方浏览器扩展。"
  }
};

/**
 * Intelligent Language Detector:
 * 1. URL search param ?lang=zh (or zh-CN, zh_CN) or ?lang=en
 * 2. localStorage 'bhm_lang'
 * 3. navigator.language (starts with 'zh' -> 'zh', else 'en')
 */
function detectPreferredLanguage() {
  if (typeof window !== 'undefined' && window.location) {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryLang = params.get('lang');
      if (queryLang) {
        const q = queryLang.toLowerCase();
        if (q === 'zh' || q.startsWith('zh')) return 'zh';
        if (q === 'en' || q.startsWith('en')) return 'en';
      }
    } catch (e) {}
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('bhm_lang');
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) {}
  }

  if (typeof navigator !== 'undefined') {
    try {
      const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (browserLang.startsWith('zh')) return 'zh';
    } catch (e) {}
  }

  return 'en';
}

// Global active state
if (typeof window !== 'undefined') {
  window.BHM_CURRENT_LANG = 'en';
}

/**
 * Apply language to all elements in DOM
 */
function applyLanguage(lang) {
  if (lang !== 'zh' && lang !== 'en') lang = 'en';
  if (typeof window !== 'undefined') {
    window.BHM_CURRENT_LANG = lang;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('bhm_lang', lang);
    } catch (e) {}
  }

  if (typeof document === 'undefined') return;

  // Update HTML lang attribute
  if (document.documentElement) {
    document.documentElement.lang = (lang === 'zh' ? 'zh-CN' : 'en');
  }

  const dict = BHM_I18N_DICT[lang] || BHM_I18N_DICT.en;

  // Title & Meta (aware of legal subpages)
  const pathname = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
  const isTerms = pathname.includes('terms.html');
  const isPrivacy = pathname.includes('privacy.html');
  const isRefund = pathname.includes('refund.html');

  if (typeof document !== 'undefined') {
    if (isTerms) {
      document.title = (lang === 'zh')
        ? "服务条款 (Terms of Service) - 书签健康卫士 (BHM-PRO)"
        : "Terms of Service - Bookmark Health Master (BHM-PRO)";
    } else if (isPrivacy) {
      document.title = (lang === 'zh')
        ? "隐私政策 (Privacy Policy) - 书签健康卫士 (BHM-PRO)"
        : "Privacy Policy - Bookmark Health Master (BHM-PRO)";
    } else if (isRefund) {
      document.title = (lang === 'zh')
        ? "退款政策 (Refund Policy) - 书签健康卫士 (BHM-PRO)"
        : "Refund Policy - Bookmark Health Master (BHM-PRO)";
    } else if (dict["meta.title"] && typeof document.title !== 'undefined') {
      document.title = dict["meta.title"];
    }
  }

  if (document.querySelector) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      if (isTerms) {
        metaDesc.setAttribute('content', (lang === 'zh')
          ? "书签健康卫士 (BHM-PRO) 官方服务条款与双轨授权协议（MIT 开源核心 + PRO 商业授权）。"
          : "Terms of Service for Bookmark Health Master (BHM-PRO) Chrome Extension and Official Website.");
      } else if (isPrivacy) {
        metaDesc.setAttribute('content', (lang === 'zh')
          ? "书签健康卫士 (BHM-PRO) 隐私政策与安全保障：严格恪守零遥测、100% 纯本地沙箱运行与 RFC 1918 私网屏蔽承诺。"
          : "Strict zero-telemetry local-first commitment. All bookmark audits and actions remain in your browser sandbox.");
      } else if (isRefund) {
        metaDesc.setAttribute('content', (lang === 'zh')
          ? "书签健康卫士 (BHM-PRO) 14 天 100% 全额无理由退款保障政策与申请指引。"
          : "14-Day 100% Money-Back Guarantee Refund Policy for Bookmark Health Master (BHM-PRO).");
      } else if (dict["meta.description"]) {
        metaDesc.setAttribute('content', dict["meta.description"]);
      }
    }
  }

  if (!document.querySelectorAll) return;

  // Text elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  // HTML formatted elements (safe pre-defined strings)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key] !== undefined) {
      el.innerHTML = dict[key];
    }
  });

  // Placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key] !== undefined) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  // Title / tooltip attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key] !== undefined) {
      el.setAttribute('title', dict[key]);
    }
  });

  // Update language switcher chips active styles
  document.querySelectorAll('.lang-chip').forEach(btn => {
    const btnLang = btn.getAttribute('data-lang');
    if (btnLang === lang) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }
  });

  // Dispatch custom event
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('bhm-lang-changed', { detail: { lang } }));
    } catch (e) {}
  }
}

/**
 * Setup Click Listeners for Language Switcher
 */
function setupLangSwitcherListeners() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  document.querySelectorAll('.lang-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetLang = btn.getAttribute('data-lang');
      const current = typeof window !== 'undefined' ? window.BHM_CURRENT_LANG : 'en';
      if (targetLang && targetLang !== current) {
        applyLanguage(targetLang);
      }
    });
  });
}

/**
 * Initialize Landing Page i18n
 */
function initLandingI18n() {
  const preferred = detectPreferredLanguage();
  applyLanguage(preferred);
  setupLangSwitcherListeners();
}

// Make accessible to app.js & external scripts
const BHM_LANDING_I18N = {
  dict: BHM_I18N_DICT,
  detect: detectPreferredLanguage,
  setLang: applyLanguage,
  t: (key) => {
    const cur = (typeof window !== 'undefined' && window.BHM_CURRENT_LANG) ? window.BHM_CURRENT_LANG : 'en';
    return (BHM_I18N_DICT[cur] || BHM_I18N_DICT.en)[key] || key;
  },
  tHtml: (key) => {
    const cur = (typeof window !== 'undefined' && window.BHM_CURRENT_LANG) ? window.BHM_CURRENT_LANG : 'en';
    return (BHM_I18N_DICT[cur] || BHM_I18N_DICT.en)[key] || key;
  }
};

if (typeof window !== 'undefined') {
  window.BHM_LANDING_I18N = BHM_LANDING_I18N;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BHM_I18N_DICT, detectPreferredLanguage, applyLanguage, BHM_LANDING_I18N };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLandingI18n);
  } else {
    initLandingI18n();
  }
}
