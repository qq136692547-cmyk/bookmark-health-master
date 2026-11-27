/**
 * Bookmark Health Master (BHM-PRO) Landing Page i18n Core
 * Dual-language engine: Simplified Chinese (zh) & English (en)
 * Zero external dependencies, pure client-side reactive DOM binding
 */

const BHM_I18N_DICT = {
  en: {
    // Meta & Head
    "meta.title": "Bookmark Health Master (BHM-PRO) — Zero 404s. Zero Telemetry. 100% Local.",
    "meta.description": "The privacy-first Chrome extension that detects broken 404 bookmarks with DNS-over-HTTPS diagnostics, auto-clusters 16 dev & cloud ecosystems, and provides atomic undo snapshots.",

    // Navbar
    "nav.features": "Features",
    "nav.architecture": "Architecture",
    "nav.pricing": "Pricing",
    "nav.faq": "FAQ",
    "nav.blog": "Blog",
    "nav.terms": "Terms",
    "nav.privacy": "Privacy",
    "nav.refunds": "Refunds",
    "nav.home": "Home",
    "nav.addChrome": "Add to Chrome (Free)",

    // Hero Section
    "hero.pill": "Live on Chrome Web Store • Manifest V3 • 100% Local Execution",
    "hero.title": "Clean & Organize 1,000+ Bookmarks in Seconds. Zero False 404s. Zero Cloud Uploads.",
    "hero.subtitle": "The privacy-first Chrome SidePanel extension engineered for developers and power users. Cross-checks dead links via <strong>DNS-over-HTTPS</strong> to stop WAF false alarms, auto-clusters <strong>16 dev & cloud ecosystems</strong>, and guards every change with <strong>atomic 1-click rollback</strong>.",
    "hero.ctaAdd": "Add to Chrome — Free Health Audit",
    "hero.ctaGithub": "Star on GitHub (MIT)",
    "hero.ctaPricing": "Get Lifetime Pro — $14.90",
    "hero.microcopy": "No account required • Runs 100% locally in your browser • 14-day money-back guarantee",
    "hero.proofLocal": "100% Local Processing",
    "hero.proofMit": "Open Source (MIT)",
    "hero.proofTelemetry": "Zero Cloud Telemetry",
    "hero.proofCookies": "No Cookies Sent (credentials: 'omit')",
    "hero.proofIntranet": "RFC1918 Intranet Shielded",
    "hero.proofRollback": "Atomic Index Rollback",
    "hero.proofLicense": "Offline Ed25519 License",
    "hero.proofSidepanel": "Native SidePanel",
    "hero.proofGuarantee": "14-Day Money-Back",

    // Comparison Section
    "comp.tag": "WHY NAIVE CLEANERS BREAK YOUR WORKFLOW",
    "comp.title": "Most Bookmark Cleaners Delete Valid Links—and Leak Your Private URLs.",
    "comp.desc": "Simple HTTP scripts weren't built for modern WAFs, private SaaS workspaces, or corporate intranets. Here is why engineers switch to BHM-PRO.",
    "comp.badBadge": "❌ Outdated Naive Cleaners",
    "comp.bad1": "<strong>WAF False 404s:</strong> Naive HEAD requests get blocked by Cloudflare & Akamai bot challenges, falsely flagging live documentation as dead.",
    "comp.bad2": "<strong>Private Docs & Intranet Probing:</strong> Clumsy scripts hit corporate subnets and auth-walled links, triggering security alarms or reporting false 401/403 failures.",
    "comp.bad3": "<strong>Cloud Telemetry & URL Leaks:</strong> Uploads your entire bookmark library and sensitive tokens to untrusted third-party servers for remote parsing.",
    "comp.bad4": "<strong>Destructive Mass Deletions:</strong> Hard-deletes bookmarks in mass batches without backups, causing sync conflicts and permanent data loss.",
    "comp.bad5": "<strong>Messy Flat Graveyards:</strong> Leaves thousands of developer consoles, staging links, and APIs piled into flat, chaotic bookmark dumps.",
    "comp.goodBadge": "🛡️ BHM-PRO Engineering Edge",
    "comp.good1": "<strong>Dual-Stage DoH Verification:</strong> Validates DNS transport via Cloudflare (1.1.1.1) and Google (8.8.8.8) to distinguish genuine NXDOMAIN dead links from WAF blocks.",
    "comp.good2": "<strong>Auth & Intranet Shielding:</strong> Hardened fuse bypasses RFC 1918 subnets (10.*, 192.168.*) and isolates auth-gated SaaS (Notion, Figma, Google Docs, Lark).",
    "comp.good3": "<strong>100% Local-First Sandbox:</strong> Every check, regex evaluation, and index snapshot runs in-memory with credentials: 'omit'. Zero cloud telemetry.",
    "comp.good4": "<strong>Zero-Data-Loss Engine:</strong> Mandates Netscape HTML backups, non-destructive soft Quarantine, 50ms sync throttling, and Sibling-Anchor Move Journals for 1-click lossless rollback.",
    "comp.good5": "<strong>16 Ecosystems + Native SidePanel:</strong> Instantly clusters AWS, GCP, Azure, Cloudflare, GitHub, and Apple into structured trees with persistent SidePanel search.",

    // Features Section
    "feat.tag": "Deep Feature Architecture",
    "feat.title": "Built for Power Users, Developers & Curators",
    "feat.desc": "Explore the five core pillars that make BHM-PRO the most dependable bookmark manager in the Chrome ecosystem.",
    "feat.tab1Btn": "1. DoH Dead Link Diagnostics",
    "feat.tab2Btn": "2. 16 Cloud & Dev Ecosystems",
    "feat.tab3Btn": "3. Auth-Gated Cloud Docs & Workspaces",
    "feat.tab4Btn": "4. Atomic Time-Machine Rollback",
    "feat.tab5Btn": "5. Native SidePanel Workflow",

    // Feature Tab 1: DoH
    "feat.tab1Title": "Dual-Stage DNS-over-HTTPS (DoH) Prober",
    "feat.tab1Desc": "When a bookmark link fails to respond, traditional tools immediately declare it \"dead\". BHM-PRO triggers a secondary diagnostic handshake through Cloudflare and Google DoH endpoints to check if the authoritative domain still exists.",
    "feat.tab1Bullet1": "🎯 Filters out temporary network dropouts and aggressive WAF bot challenges.",
    "feat.tab1Bullet2": "🎯 Confirms NXDOMAIN (unregistered domain) vs HTTP 404 / 500 status codes.",
    "feat.tab1Bullet3": "🎯 Smart quarantine: moves dead links into an isolated quarantine folder before any deletion.",
    "feat.tab1Cta": "Try DoH Diagnostics",

    // Feature Tab 2: Ecosystems
    "feat.tab2Title": "16 Cloud & Dev Ecosystems Auto-Clustering",
    "feat.tab2Desc": "Tired of hunting for the AWS Console, Google Cloud Run, GitHub Repo, or Cloudflare DNS settings buried in bookmarks? BHM-PRO uses regex heuristics to identify official platforms and group them into pristine ecosystem folders.",
    "feat.tab2Bullet1": "⚡ Ecosystems: AWS, Google, Microsoft, Cloudflare, GitHub, Apple, Meta, ByteDance, Vercel, Supabase, OpenAI, Anthropic, and more.",
    "feat.tab2Bullet2": "⚡ Smart subdomain mapping: accurately differentiates public documentation from tenant apps via Longest-Suffix Specificity.",
    "feat.tab2Bullet3": "⚡ Protected Folder Whitelists, Default Loose-Root Safe Scope & Personal Custom Domain Rules — never scrambles your existing folders.",
    "feat.tab2Cta": "Explore 16 Ecosystems Organizer",

    // Feature Tab 3: Auth-Gated Docs
    "feat.tab3Title": "Auth-Gated Cloud Docs & Workspaces Smart Isolation",
    "feat.tab3Desc": "Modern workflows live in collaborative cloud documents and private workspaces. Clumsy cleaners often treat private Notion pages, Google Docs, Figma workspaces, or Lark/Feishu bases as broken links or lump them into generic company folders.",
    "feat.tab3Bullet1": "🛡️ <strong>Zero Accidental Deletions:</strong> Dedicated isolation layer shields Notion, Google Docs, Sheets, Slides, Feishu/Lark, and Figma links from bulk quarantines.",
    "feat.tab3Bullet2": "🛡️ <strong>Authentication Awareness:</strong> Recognizes private intranet and login-required collaborative doc URLs, preventing false 401/403 \"dead link\" misdiagnoses.",
    "feat.tab3Bullet3": "🛡️ <strong>Workspace Preserving:</strong> Keeps shared team links pristine and accessible without disturbing custom titles or sharing parameters.",
    "feat.tab3Cta": "Protect Auth-Gated Workspaces",

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
    "price.title": "Pay Once. Own Your Bookmarks Forever.",
    "price.desc": "Because BHM-PRO runs 100% locally with zero cloud servers to maintain, we don't charge monthly rent. Run a full diagnostic for free—upgrade only when you're ready for 1-click cleanup and organization.",

    "price.freeName": "Free",
    "price.freeSubtitle": "Diagnostic & Manual",
    "price.freeDesc": "Audit bookmark health with zero risk.",
    "price.freeCurrency": "$",
    "price.freeAmount": "0",
    "price.freePeriod": "/ forever",
    "price.freePerk1": "Full scan & audit report",
    "price.freePerk2": "Dual-stage DoH check",
    "price.freePerk3": "RFC1918 & /logout shielding",
    "price.freePerk4": "Basic SidePanel search",
    "price.freePerk5": "Mandatory pre-action HTML backup export",
    "price.freePerk6": "Manual review + preview cleanup (up to 20 items)",
    "price.freeBtn": "Add to Chrome — Free",
    "price.freeMicro": "No credit card • No account",

    "price.ltdRibbon": "Most Popular · Early Bird",
    "price.ltdName": "Pro Lifetime",
    "price.ltdStrike": "$29",
    "price.ltdDesc": "Everything in Free, plus unlimited 1-click automation for power users.",
    "price.ltdCurrency": "$",
    "price.ltdAmount": "14.90",
    "price.ltdPeriod": "/ one-time pay",
    "price.ltdPerk1": "<strong>Unlimited</strong> 1-click bulk quarantine & exact URL deduplication",
    "price.ltdPerk2": "<strong>16 Ecosystems + Protected Folders + Custom Domain Rules</strong>",
    "price.ltdPerk3": "<strong>Auth-gated Docs</strong> auto-isolation",
    "price.ltdPerk4": "<strong>Unlimited</strong> Sibling-Anchor Time Machine rollbacks",
    "price.ltdPerk5": "Full SidePanel Command Center with ecosystem filter pills",
    "price.ltdPerk6": "Offline Ed25519 License (up to 3 personal browsers)",
    "price.ltdPerk7": "All v2.x updates included",
    "price.ltdBtn": "Get Lifetime Pro — $14.90",
    "price.ltdMicro": "Early-bird price (first 200 users) • 14-day refund",

    "price.teamRibbon": "Best for Work & Reimbursement",
    "price.teamName": "Team / Power Pack",
    "price.teamDesc": "Everything in Pro Lifetime, designed for engineering teams and business expensing.",
    "price.teamCurrency": "$",
    "price.teamAmount": "39",
    "price.teamPeriod": "/ 5 license keys",
    "price.teamPerk1": "<strong>5 independent</strong> offline Ed25519 keys",
    "price.teamPerk2": "Commercial & engineering team use",
    "price.teamPerk3": "Instant business/VAT invoice for company expense reports",
    "price.teamPerk4": "Priority email support & custom ecosystem rule requests",
    "price.teamPerk5": "Everything in Pro Lifetime included",
    "price.teamBtn": "Buy 5-Seat Pack — $39",
    "price.teamMicro": "Instant key & invoice delivery • 14-day refund",

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

    "price.singlePassText": "Looking for a one-time project cleanup?",
    "price.singlePassLink": "Get the 30-Day Single Wash pass for $4.90",

    "price.faqTitle": "Pricing & Anti-Subscription FAQ",
    "price.faq1Q": "Why a one-time payment instead of a subscription?",
    "price.faq1A": "Because BHM-PRO runs 100% locally with zero cloud servers to maintain, we don't charge monthly rent. Your bookmarks live on your device, not our servers. Pay once, own it forever.",
    "price.faq2Q": "How does offline licensing work? Does it phone home?",
    "price.faq2A": "BHM-PRO verifies your Ed25519 digital signature entirely in your browser using our embedded public key in milliseconds. Zero telemetry, zero external server calls, 100% offline.",
    "price.faq3Q": "What if it doesn't save me hours of cleanup?",
    "price.faq3A": "We offer a hassle-free 14-day 100% money-back guarantee. If you are not satisfied, email bhm@geoscore.help with your Order ID for an immediate, full refund.",

    "price.guarantee": "<strong>14-Day 100% Money-Back Guarantee:</strong> If BHM-PRO doesn't save you hours of bookmark frustration, email us for a full refund.",

    // License Lookup
    "lookup.title": "Already Purchased? Retrieve Your License",
    "lookup.desc": "Lost your activation key? Enter your Gumroad Order ID and purchase Email below for instant recovery.",
    "lookup.orderPlaceholder": "Gumroad Order ID (e.g. txn_...)",
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
    "faq.a3": "Immediately after checkout via Gumroad, your Order ID is processed and an Ed25519 cryptographic license token is generated. You receive this token on screen, via email, and can retrieve it anytime using our self-service lookup box above. Simply copy and paste the key into the BHM-PRO SidePanel settings to unlock Pro features instantly.",

    "faq.q4": "Can I use my Lifetime Buyout license on multiple computers?",
    "faq.a4": "Yes! Your Lifetime Buyout license is valid for all personal Chrome browser profiles and computers (Mac, Windows, Linux) that you personally own and operate.",

    "faq.q5": "What is your refund policy?",
    "faq.a5": "We provide a <strong>14-day 100% money-back guarantee</strong> on all paid plans. If you are not satisfied for any reason, email us at <a href=\"mailto:bhm@geoscore.help\" style=\"color: #60a5fa;\">bhm@geoscore.help</a> with your Gumroad Order ID, and your payment will be refunded immediately without friction.",

    // Footer
    "footer.brandDesc": "The privacy-first Chrome extension that resurrects broken bookmarks, clusters tech ecosystems, and guarantees zero data leakage.",
    "footer.colProduct": "Product",
    "footer.cws": "Chrome Web Store",
    "footer.features": "Features",
    "footer.pricing": "Pricing Plans",
    "footer.retrieve": "Retrieve License",
    "footer.about": "About BHM-PRO",
    "footer.colResources": "Resources",
    "footer.blog": "Blog & Guides",
    "footer.blogGuides": "Blog & Guides",
    "footer.guide404": "404 Dead Link Guide",
    "footer.guideDev": "Dev Bookmarks Guide",
    "footer.guideLocal": "Local-First Architecture",
    "footer.guideBackup": "Backup & Recovery Guide",
    "footer.colLegal": "Legal & Policy",
    "footer.terms": "Terms of Service",
    "footer.privacy": "Privacy Policy",
    "footer.refund": "Refund Policy",
    "footer.colOpenSource": "Open Source",
    "footer.github": "GitHub Repo",
    "footer.mit": "MIT License",
    "footer.issues": "Issue Tracker",
    "footer.releases": "Releases (v2.2.0)",
    "footer.colSupport": "Merchant & Support",
    "footer.operator": "Operator: L.D. Studio (Pudong, Shanghai)",
    "footer.fulfillment": "Fulfillment: 100% Instant Digital Delivery",
    "footer.merchant": "Merchant: Gumroad.com",
    "footer.copyright": "© 2026 Bookmark Health Master (BHM-PRO) by L.D. Studio. All rights reserved. Merchant of Record: Gumroad, Inc.",
    "footer.disclaimer": "Chrome is a registered trademark of Google LLC. BHM-PRO is an independent extension built for Google Chrome.",

    // Blog Portal & Guides
    "blog.metaTitle": "BHM-PRO Technical Blog & Engineering Guides — Zero 404s, 16 Cloud & Dev Ecosystems & Local-First",
    "blog.metaDesc": "Official engineering blog and technical guides for Bookmark Health Master (BHM-PRO). Tutorials on Chrome 404 dead link cleanup, DoH diagnostics, 16 Cloud & Dev Ecosystems, and local-first architecture.",
    "blog.heroTag": "Engineering Blog & Guides",
    "blog.heroTitle": "Deep Engineering Guides & Browser Architecture",
    "blog.heroDesc": "In-depth tutorials, privacy analysis, and algorithmic breakdowns for mastering your Chrome bookmark ecosystem.",
    "blog.backHome": "← Back to Home",
    "blog.allArticles": "Featured Technical Guides",
    "blog.card1Tag": "404 Cleaner · DoH Diagnostics",
    "blog.card1ReadTime": "3 min read",
    "blog.card1Title": "How to Delete Dead & Broken Bookmarks in Chrome (Without False Positives)",
    "blog.card1Desc": "Why naive HTTP checkers trigger Cloudflare 403 blocks and delete active bookmarks. Learn how BHM-PRO's dual-stage RFC8484 DoH prober verifies true NXDOMAIN dead links with atomic quarantine.",
    "blog.card1Btn": "Read Guide →",
    "blog.card2Tag": "Developer Tools · 16 Ecosystems",
    "blog.card2ReadTime": "4 min read",
    "blog.card2Title": "The Chrome Bookmark Organizer Built Specifically for Software Engineers",
    "blog.card2Desc": "How to auto-cluster 2,000+ scattered AWS, GitHub, GCP, and Cloudflare links into structured hierarchies while safeguarding dynamic Notion, Figma, and Google Docs.",
    "blog.card2Btn": "Read Guide →",
    "blog.card3Tag": "Privacy Architecture · Local-First",
    "blog.card3ReadTime": "3 min read",
    "blog.card3Title": "Why Cloud-Based Bookmark Managers Are a Massive Privacy Risk",
    "blog.card3Desc": "Private staging URLs, internal docs, and medical portals should never leave your browser sandbox. Explore BHM-PRO's zero-telemetry design and offline Ed25519 Web Crypto licensing.",
    "blog.card3Btn": "Read Guide →",
    "blog.card4Tag": "Data Safety · Time-Machine Undo",
    "blog.card4ReadTime": "3 min read",
    "blog.card4Title": "How to Safely Backup & Restore Chrome Bookmarks (Zero Accidental Loss)",
    "blog.card4Desc": "Eliminate the fear of accidental mass deletion. Sibling-anchor index tracking, Netscape HTML export, and 1-click lossless rollback restored in ascending sequence.",
    "blog.card4Btn": "Read Guide →",
    "blog.card5Tag": "Comparison · Local-First",
    "blog.card5ReadTime": "4 min read",
    "blog.card5Title": "Local-First Raindrop.io Alternative for Chrome (Zero Cloud Sync, Zero Subscription)",
    "blog.card5Desc": "Head-to-head comparison between Raindrop.io ($28/yr cloud subscription) and BHM-PRO ($14.90 lifetime, 100% local MV3 sandbox, DoH validation, and atomic rollback).",
    "blog.card5Btn": "Read Guide →",
    "blog.card6Tag": "WAF & DNS · RFC 8484 DoH",
    "blog.card6ReadTime": "5 min read",
    "blog.card6Title": "Why Bookmark Checkers Trigger False 404/403 on Cloudflare — And How RFC 8484 DoH Fixes It",
    "blog.card6Desc": "Deep dive into Cloudflare/Akamai WAF blocks on naive HEAD requests, and how Range-GET fallback, credentials: 'omit', and DoH NXDOMAIN checks prevent false deletions.",
    "blog.card6Btn": "Read Guide →",
    "blog.card7Tag": "Dev Teams · 16 Ecosystems",
    "blog.card7ReadTime": "4 min read",
    "blog.card7Title": "The Ultimate Chrome Bookmark Setup for Cloud & Dev Teams (AWS, GitHub, GCP, Notion)",
    "blog.card7Desc": "Standardize engineering bookmarks across 16 Cloud & Dev Ecosystems, shield Auth-Gated Cloud Docs, and equip 5 engineers with the $39 Team Pack & VAT invoice.",
    "blog.card7Btn": "Read Guide →",

    // Demo Sandbox
    "demo.badge": "Interactive Sandbox · No Install Required",
    "demo.runBtn": "▶ Run Live Simulation (1,200 Bookmarks in 3s)",
    "demo.runningBtn": "⚡ Simulating Local Sandbox Engine...",
    "demo.statScanned": "Scanned Bookmarks:",
    "demo.statDead": "Dead 404s Detected:",
    "demo.statEco": "16 Ecosystems Clustered:",
    "demo.statShielded": "Shielded Docs:",
    "demo.ctaSuccess": "🎉 <strong>3.2s Audit Done:</strong> 142 real dead links isolated, 486 dev links clustered, 28 private docs shielded — with 1-click undo ready.",
    "demo.tabDead": "Dead Links (142)",
    "demo.tabEco": "16 Cloud Ecosystems (486)",
    "demo.tabDocs": "Auth-Gated Docs (28)",
    "demo.panelDeadSummary": "Action Playbook: Quarantine all 142 verified dead links in 1 click with automatic Netscape HTML backup & Time-Machine undo.",
    "demo.panelEcoSummary": "Action Playbook: Auto-cluster 486 engineering URLs into 16 Cloud & Dev Ecosystems folders in 0.8s without cloud uploads.",
    "demo.panelDocsSummary": "Action Playbook: 28 login-gated workspaces isolated from false 401/403 deletions and RFC 1918 intranets skipped safely.",
    "demo.ctaInstall": "Scan My Real Bookmarks (Free)",
    "demo.ctaBuyLtd": "Unlock Lifetime Pro ($14.90)",
    "demo.ctaBuyTeam": "5-Seat Team Pack ($39)",
    "demo.scarcity": "Early-bird pricing ($14.90 → $29 after 200 licenses)",

    // Dynamic SVG Health Badge Generator
    "badgeGen.tag": "OPEN-SOURCE & README INTEGRATION",
    "badgeGen.title": "Embed Your Bookmark Health Badge",
    "badgeGen.desc": "Generate a dynamic Shields-style SVG badge reflecting your Chrome bookmark audit score for GitHub READMEs, engineering wikis, or Notion dashboards.",
    "badgeGen.scoreLabel": "Health Score (0–100)",
    "badgeGen.deadLabel": "Dead Links Remaining (0–50)",
    "badgeGen.previewLabel": "Live SVG Preview",
    "badgeGen.mdLabel": "Markdown (GitHub README / Notion)",
    "badgeGen.htmlLabel": "HTML Embed",
    "badgeGen.copyMd": "Copy Markdown",
    "badgeGen.copyHtml": "Copy HTML",
    "badgeGen.tip": "Tip: Powered by edge SVG caching — zero cookies, zero tracking pixels."
  },

  zh: {
    // Meta & Head
    "meta.title": "Bookmark Health Master (BHM-PRO) — 零死链 · 零云端遥测 · 100% 本地隐私",
    "meta.description": "专为极客打造的高性能 Chrome 书签健康体检与大厂生态智能整理扩展。具备 DNS-over-HTTPS 深度死链嗅探、16 大云端与开发者生态归类、鉴权云端文档沙箱保护与同级锚点时光机回滚。",

    // Navbar
    "nav.features": "功能特性",
    "nav.architecture": "安全架构",
    "nav.pricing": "方案定价",
    "nav.faq": "常见问题",
    "nav.blog": "技术博客",
    "nav.terms": "服务条款",
    "nav.privacy": "隐私协议",
    "nav.refunds": "退款政策",
    "nav.home": "首页",
    "nav.addChrome": "免费添加至 Chrome",

    // Hero Section
    "hero.pill": "已正式上架 Google Chrome 官方商店 • Manifest V3 • 100% 本地纯离线运行",
    "hero.title": "秒级智能整理 1,000+ 书签。零 WAF 防火墙误杀 · 零云端隐私上传",
    "hero.subtitle": "专为开发者与重度知识工作者打造的隐私原生 Chrome 侧边栏扩展。通过 <strong>DNS-over-HTTPS</strong> 双阶段深度确诊彻底消灭 WAF 假死误杀，自动规整 <strong>16 大云平台与研发生态</strong>，并以<strong>同级锚点事务日志</strong>保障一键无损撤销。",
    "hero.ctaAdd": "添加至 Chrome — 免费全库健康体检",
    "hero.ctaGithub": "在 GitHub 关注开源 (MIT)",
    "hero.ctaPricing": "获取终身 Pro 授权 — $14.90 (¥99)",
    "hero.microcopy": "无需注册账号 • 100% 浏览器本地沙箱运行 • 14 天无条件全额退款保证",
    "hero.proofLocal": "100% 本地沙箱运行",
    "hero.proofMit": "核心开源 (MIT 协议)",
    "hero.proofTelemetry": "零云端隐私遥测",
    "hero.proofCookies": "不发送任何 Cookie (credentials: 'omit')",
    "hero.proofIntranet": "RFC1918 内网熔断保护",
    "hero.proofRollback": "同级锚点原子级回滚",
    "hero.proofLicense": "Ed25519 纯离线密码学授权",
    "hero.proofSidepanel": "Chrome 原生侧边栏",
    "hero.proofGuarantee": "14 天无理由全额退款",

    // Comparison Section
    "comp.tag": "WHY NAIVE CLEANERS BREAK YOUR WORKFLOW",
    "comp.title": "绝大多数书签清理器既会误删正常链接，还会泄露您的内部私有 URL",
    "comp.desc": "简易 HTTP 脚本无法应对现代防爬防火墙、私有云端工作区或企业内网。以下是工程师与极客选择 BHM-PRO 的五大核心硬实力。",
    "comp.badBadge": "❌ 传统淘汰型简易清理工具",
    "comp.bad1": "<strong>WAF 防爬误杀正常链接：</strong>简易 HTTP 请求被 Cloudflare/Akamai 防爬网关拦截，将大量活跃的技术文档误判为 404 死链。",
    "comp.bad2": "<strong>盲目探测私有文档与内网：</strong>无差别嗅探企业内网与私密工作区，触发内网安全风控告警，或因鉴权返回 401/403 被武断当作死链。",
    "comp.bad3": "<strong>云端数据隐私泄露：</strong>将用户的全部私人书签与敏感参数上传至不可信的第三方云端服务器进行所谓的「云端扫描」。",
    "comp.bad4": "<strong>破坏性不可逆物理删除：</strong>无预警直接物理批量抹除书签，不建备份、无恢复日志，极易引发浏览器同步冲突造成珍贵数据彻底损毁。",
    "comp.bad5": "<strong>平铺混乱的书签坟场：</strong>数百上千个云控制台、代码仓库与 API 文档混乱堆积，毫无研发上下文与分层结构。",
    "comp.goodBadge": "🛡️ BHM-PRO 生产级工程壁垒",
    "comp.good1": "<strong>双阶段 DoH 深度复核：</strong>通过 Cloudflare (1.1.1.1) 与 Google (8.8.8.8) 原生安全 DNS 传输，精准鉴别真正的注销死链（NXDOMAIN）与网络防爬拦截。",
    "comp.good2": "<strong>私有鉴权与企业内网深度熔断：</strong>硬件级规则严密熔断 RFC 1918 内网网段（10.*, 192.168.*），并沙箱隔离 Notion、Figma、Google Docs、飞书等私有云端文档。",
    "comp.good3": "<strong>100% 本地纯离线沙箱：</strong>所有网络探针、正则匹配与索引快照完全在本地沙箱内闭环执行，请求严格剔除 Cookie（credentials: 'omit'），零遥测。",
    "comp.good4": "<strong>零数据丢失防护引擎：</strong>强制预导出 Netscape HTML 备份、软删除安全隔离仓、50ms 微批次同步节流，配合同级锚点事务日志实现一键 100% 无损原位回滚。",
    "comp.good5": "<strong>16 大云与研发生态 + 原生侧边栏：</strong>毫秒级将 AWS、GCP、Azure、Cloudflare、GitHub、苹果等自动归类至清晰目录树，并以常驻 SidePanel 随用随查。",

    // Features Section
    "feat.tag": "深度特性矩阵",
    "feat.title": "专为极客开发者、研究学者与数字知识策展人量身打造",
    "feat.desc": "探索构筑 BHM-PRO 极客工程品质的五大核心技术支柱，重新定义书签管理体验。",
    "feat.tab1Btn": "1. DoH 深度死链嗅探",
    "feat.tab2Btn": "2. 16 云平台与研发生态聚类",
    "feat.tab3Btn": "3. 鉴权云端文档与工作空间沙箱隔离",
    "feat.tab4Btn": "4. 原子级镜像与撤销回退",
    "feat.tab5Btn": "5. Chrome 原生侧边栏工作流",

    // Feature Tab 1: DoH
    "feat.tab1Title": "双阶段 DNS-over-HTTPS (DoH) 自适应死链探针",
    "feat.tab1Desc": "当书签链接未能响应时，传统工具往往武断判死。BHM-PRO 会立即自动启动双阶段机制，利用 Cloudflare 与 Google 权威 DoH 端点进行域名存在性权威裁决，防止误判。",
    "feat.tab1Bullet1": "🎯 自动过滤网络偶发波动与各类防爬安全网关（WAF）的人机验证干扰。",
    "feat.tab1Bullet2": "🎯 精确区分域名已注销下线（NXDOMAIN）与临时性 HTTP 404 / 500 服务端状态码。",
    "feat.tab1Bullet3": "🎯 采用安全隔离仓机制：在执行任何清理前，先将疑似失效书签原样转移至安全回收站，防患于未然。",
    "feat.tab1Cta": "体验 DoH 深度体检",

    // Feature Tab 2: Ecosystems
    "feat.tab2Title": "16 大云端与开发者生态智能重组收纳",
    "feat.tab2Desc": "厌倦了在茫茫书签海洋中苦苦搜索 AWS 控制台、Google Cloud、GitHub 代码仓库或 Cloudflare 域名配置？BHM-PRO 采用严谨的生态正则启发式引擎，一键归类。",
    "feat.tab2Bullet1": "⚡ 全面覆盖 16 大官方生态：谷歌、微软、华为、AWS、苹果、字节跳动、Cloudflare、GitHub、Meta、OpenAI、百度、小米、Anthropic 等。",
    "feat.tab2Bullet2": "⚡ 智能子域名最长后缀精确映射：精准区分公共控制台与租户协作文档。",
    "feat.tab2Bullet3": "⚡ 支持「受保护文件夹白名单 + 默认仅整理根目录散落书签 + 个人自定义域名规则」，绝不拆散原有目录。",
    "feat.tab2Cta": "探索 16 大生态智能整理",

    // Feature Tab 3: Auth-Gated Docs
    "feat.tab3Title": "鉴权云端文档与工作空间安全隔离沙箱",
    "feat.tab3Desc": "现代数字工作流高度依赖云端协作文档与受权私有工作区。粗糙的清理工具常将带有私有鉴权的飞书多维表格、语雀知识库、腾讯文档、Notion 或 Google Docs 误判为死链，或粗暴归入公司通用文件夹。",
    "feat.tab3Bullet1": "🛡️ <strong>杜绝误删珍贵文档：</strong>独创协同文档保护层，自动识别并严密隔离飞书/Lark、语雀、腾讯文档、Google Docs、Notion 与 Figma 等协作文档。",
    "feat.tab3Bullet2": "🛡️ <strong>登录鉴权状态感知：</strong>智能识别需登录态的私有文档 URL，坚决阻断因 401/403 重定向造成的「死链」误判。",
    "feat.tab3Bullet3": "🛡️ <strong>完整保留工作空间上下文：</strong>保留团队共享链接的完整查询参数与自定义标签，随用随开。",
    "feat.tab3Cta": "体验云端工作空间保护",

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
    "price.title": "一次付费，永久拥有您的书签资产",
    "price.desc": "因为 BHM-PRO 100% 本地沙箱运行且无云端服务器维护成本，我们坚决不收月租。您可以免费运行全库诊断——仅在需要一键清理与自动化整理时升级。",

    "price.freeName": "免费版 (Free)",
    "price.freeSubtitle": "诊断与手动整理",
    "price.freeDesc": "零风险全面体检书签健康度。",
    "price.freeCurrency": "¥",
    "price.freeAmount": "0",
    "price.freePeriod": "($0) / 永久免费",
    "price.freePerk1": "全库书签健康扫描与诊断报告",
    "price.freePerk2": "双阶段 DoH 域名真死权威检测",
    "price.freePerk3": "RFC1918 内网与 /logout 危险链接熔断",
    "price.freePerk4": "Chrome 原生常驻 SidePanel 基础搜索",
    "price.freePerk5": "操作前强制导出 Netscape HTML 备份",
    "price.freePerk6": "手动审核 + 预览清理 (上限 20 条)",
    "price.freeBtn": "添加至 Chrome — 免费",
    "price.freeMicro": "无需信用卡 • 无需注册账号",

    "price.ltdRibbon": "极客首选 · 早鸟特惠",
    "price.ltdName": "Pro 终身买断版",
    "price.ltdStrike": "¥199",
    "price.ltdDesc": "包含免费版全部功能，专为极客与重度用户解锁无限制一键整理。",
    "price.ltdCurrency": "¥",
    "price.ltdAmount": "99",
    "price.ltdPeriod": "($14.90 USD) / 一次买断永久有效",
    "price.ltdPerk1": "<strong>无限制</strong>一键批量隔离与深度去重",
    "price.ltdPerk2": "<strong>16 大云平台与研发生态</strong>智能聚类",
    "price.ltdPerk3": "<strong>私有鉴权云端文档</strong>智能安全隔离",
    "price.ltdPerk4": "<strong>无限制</strong>同级锚点时光机原位回滚",
    "price.ltdPerk5": "完整 SidePanel 控制中心与生态筛选胶囊",
    "price.ltdPerk6": "Ed25519 纯离线授权 (支持 3 台个人设备/浏览器)",
    "price.ltdPerk7": "包含所有 v2.x 重磅新版本免费升级",
    "price.ltdBtn": "获取终身 Pro — $14.90 (¥99)",
    "price.ltdMicro": "早鸟限时价 (限量前 200 位) • 14 天无条件退款",

    "price.teamRibbon": "团队商用 · 差旅报销首选",
    "price.teamName": "团队 5 席畅享包",
    "price.teamDesc": "包含 Pro 终身版全部特权，专为研发团队协同与公司财务报销定制。",
    "price.teamCurrency": "¥",
    "price.teamAmount": "269",
    "price.teamPeriod": "($39 USD) / 5 个独立授权码",
    "price.teamPerk1": "<strong>5 个独立</strong>离线 Ed25519 商业授权码",
    "price.teamPerk2": "支持商业团队与企业工程部门合规使用",
    "price.teamPerk3": "即时开具含税商业发票/VAT 凭证便于报销",
    "price.teamPerk4": "优先邮件支持通道 & 定制团队专属生态规则",
    "price.teamPerk5": "包含 Pro 终身版所有高级特性与持续更新",
    "price.teamBtn": "购买 5 席特惠包 — $39 (¥269)",
    "price.teamMicro": "密钥与凭证即时下发 • 14 天退款保障",

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

    "price.singlePassText": "仅需临时项目大扫除？",
    "price.singlePassLink": "获取 30 天大扫除体验卡 (¥35 / $4.90)",

    "price.faqTitle": "方案定价与反订阅常见问题",
    "price.faq1Q": "为什么采用一次性付费而非按月订阅？",
    "price.faq1A": "因为 BHM-PRO 100% 本地沙箱运行且无云端服务器维护成本，我们坚决不收月租。您的书签完全保存在您本地设备上。一次买断，永久拥有。",
    "price.faq2Q": "离线密码学授权是如何工作的？会回传网络心跳吗？",
    "price.faq2A": "BHM-PRO 完全在您的本地浏览器内使用内置公钥在毫秒内验证 Ed25519 数字签名。零遥测、零外部服务器请求，100% 离线脱机运行。",
    "price.faq3Q": "如果它没有帮我节省书签整理时间怎么办？",
    "price.faq3A": "我们提供 14 天 100% 无条件全额退款承诺。如果您觉得没有达到预期，只需发邮件至 bhm@geoscore.help 附上订单号即可极速全额退款。",

    "price.guarantee": "<strong>14 天 100% 无条件全额退款承诺：</strong>若 BHM-PRO 未能为您省下梳理书签的大量精力，发邮件即可光速全额退款，无任何推诿。",

    // License Lookup
    "lookup.title": "已经购买？自助找回您的授权码",
    "lookup.desc": "找不到授权密钥邮件？输入购买时的 Gumroad 订单号与邮箱，系统将立即从边缘数据库中重新取回您的 Ed25519 密钥。",
    "lookup.orderPlaceholder": "Gumroad 订单号 (例如 txn_...)",
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
    "faq.a3": "通过 Gumroad 完成结算后，系统将自动基于非对称密码算法签发独立的 Ed25519 授权密钥。您将在页面上直接看到该密钥，同时也会收到一封包含密钥的确认邮件。在任何时候，您都可以使用本页面的「自助找回密钥」模块快速取回。复制该密钥粘贴至扩展 SidePanel 或全景大盘的授权输入框中，即可实现毫秒级脱机离线激活。",

    "faq.q4": "终身买断版可以在我的多台电脑和多个浏览器配置上使用吗？",
    "faq.a4": "<strong>完全可以！</strong>终身买断许可证支持您个人名下拥有的全部 Mac、Windows、Linux PC 设备以及同台电脑上的多个 Chrome 独立用户配置文件（Personal Profiles）。",

    "faq.q5": "你们的退款保障政策是怎样的？",
    "faq.a5": "我们为所有付费方案提供 <strong>14 天内 100% 无条件全额退款承诺</strong>。如果您在体验后有任何不满意，只需发送邮件至 <a href=\"mailto:bhm@geoscore.help\" style=\"color: #60a5fa;\">bhm@geoscore.help</a> 并附上您的 Gumroad 订单号，我们将在审核后极速原路全额退款，没有任何推诿或繁琐借口。",

    // Footer
    "footer.brandDesc": "守护隐私的 Chrome 原生扩展。深度体检复活死链、归拢全球 16 大云端与开发生态，100% 本地运行坚决捍卫数据隐私。",
    "footer.colProduct": "产品矩阵",
    "footer.cws": "Chrome 官方商店",
    "footer.features": "功能特性",
    "footer.pricing": "方案定价",
    "footer.retrieve": "自助找回密钥",
    "footer.about": "关于 BHM-PRO",
    "footer.colResources": "知识资源",
    "footer.blog": "技术博客与指南",
    "footer.blogGuides": "博客与深度指南",
    "footer.guide404": "404 死链检测指南",
    "footer.guideDev": "开发者书签整理指南",
    "footer.guideLocal": "Local-First 架构解析",
    "footer.guideBackup": "书签导出备份指南",
    "footer.colLegal": "合规政策",
    "footer.terms": "服务条款 (Terms)",
    "footer.privacy": "隐私协议 (Privacy)",
    "footer.refund": "退款政策 (Refund)",
    "footer.colOpenSource": "开源生态",
    "footer.github": "GitHub 仓库",
    "footer.mit": "MIT 开源协议",
    "footer.issues": "问题与建议反馈",
    "footer.releases": "版本发布记录 (v2.2.0)",
    "footer.colSupport": "商户与支持",
    "footer.operator": "运营团队: L.D. Studio (中国上海浦东)",
    "footer.fulfillment": "交付方式: 100% 数字化秒级下发",
    "footer.merchant": "签约商户: Gumroad.com",
    "footer.copyright": "© 2026 Bookmark Health Master (BHM-PRO) by L.D. Studio. 保留所有权利。名义商户代管: Gumroad, Inc.",
    "footer.disclaimer": "Chrome 是 Google LLC 的注册商标。BHM-PRO 是专为 Google Chrome 打造的独立第三方浏览器扩展。",

    // Blog Portal & Guides
    "blog.metaTitle": "技术博客与深度指南 — 书签健康卫士 (BHM-PRO) 官方知识库",
    "blog.metaDesc": "书签健康卫士 (BHM-PRO) 官方技术博客与工程指南。深度解析 Chrome 404 死链体检、DoH 权威防误杀、16 大云端与开发生态智能分类与 Local-First 本地优先架构。",
    "blog.heroTag": "技术博客 · 深度工程指南",
    "blog.heroTitle": "极客深度指南与浏览器底层架构解析",
    "blog.heroDesc": "深度教程、隐私架构拆解与算法原理解析，助您彻底掌控 Chrome 原生书签生态。",
    "blog.backHome": "← 返回主站首页",
    "blog.allArticles": "精选技术长文与实践指南",
    "blog.card1Tag": "死链体检 · DoH 权威防误杀",
    "blog.card1ReadTime": "3 分钟精读",
    "blog.card1Title": "如何彻底清理 Chrome 404 死链？基于 DNS-over-HTTPS 权威防误杀体检指南",
    "blog.card1Desc": "揭秘传统检测工具频繁被 Cloudflare/WAF 误判为爬虫而误删正常书签的根本原因。利用双阶段 DoH 探针精准鉴别 NXDOMAIN 真死链与安全隔离仓实践。",
    "blog.card1Btn": "阅读指南 →",
    "blog.card2Tag": "开发者工具 · 大厂生态归拢",
    "blog.card2ReadTime": "4 分钟精读",
    "blog.card2Title": "专为软件工程师打造的 Chrome 书签整理器：16 大云端与开发生态智能收纳",
    "blog.card2Desc": "如何将杂乱无章的 AWS 控制台、GitHub 仓库与 Cloudflare 配置毫秒级自动归拢？同时实现 Figma、Notion、飞书等协同文档沙箱保护与私网 IP 熔断。",
    "blog.card2Btn": "阅读指南 →",
    "blog.card3Tag": "隐私架构 · 本地优先原则",
    "blog.card3ReadTime": "3 分钟精读",
    "blog.card3Title": "为什么云端书签管理器存在巨大隐私风险？Local-First 零遥测架构深度解析",
    "blog.card3Desc": "私人后台、内部测试环境与未公开文档绝不能上传至第三方服务器。解析 BHM-PRO 纯本地沙箱运行、零云端遥测与 Web Crypto 离线 Ed25519 签名验真。",
    "blog.card3Btn": "阅读指南 →",
    "blog.card4Tag": "数据安全 · 时光机无损回滚",
    "blog.card4ReadTime": "3 分钟精读",
    "blog.card4Title": "如何安全备份与恢复 Chrome 书签：基于同级锚点事务日志的原子级时光机",
    "blog.card4Desc": "彻底消除批量整理时对丢失重要书签的焦虑。基于 Move Journal 事务日志精准记录原始位置，升序安全恢复杜绝索引偏移，配合 Netscape HTML 标准导出。",
    "blog.card4Btn": "阅读指南 →",
    "blog.card5Tag": "竞品横评 · 本地优先",
    "blog.card5ReadTime": "4 分钟精读",
    "blog.card5Title": "为什么选择本地优先的 Raindrop.io 替代方案？零云端同步、零年费订阅",
    "blog.card5Desc": "硬核对比 Raindrop.io（$28/年云端订阅）与 BHM-PRO（$14.90 终身买断、100% 本地 MV3 沙箱、DoH 死链复核与原子级时光机回滚）。",
    "blog.card5Btn": "阅读指南 →",
    "blog.card6Tag": "WAF 防误杀 · RFC 8484 DoH",
    "blog.card6ReadTime": "5 分钟精读",
    "blog.card6Title": "为什么书签检测器在 Cloudflare 上会误报 404/403？RFC 8484 DoH 工程解药",
    "blog.card6Desc": "深度拆解 Cloudflare/Akamai WAF 拦截普通 HEAD 请求的根因，及双阶段 Range-GET + credentials: 'omit' + DoH NXDOMAIN 核验方案。",
    "blog.card6Btn": "阅读指南 →",
    "blog.card7Tag": "研发团队 · 16 大生态",
    "blog.card7ReadTime": "4 分钟精读",
    "blog.card7Title": "云原生与研发团队 Chrome 书签终极配置（AWS、GitHub、GCP、Notion）",
    "blog.card7Desc": "为工程团队标准化的 16 大云端与开发生态聚类、鉴权云端文档隔离，以及支持公司 VAT 发票报销的 $39 五席位团队包。",
    "blog.card7Btn": "阅读指南 →",

    // Demo Sandbox
    "demo.badge": "免安装实时交互沙盒 · 真实感受 3 秒重构",
    "demo.runBtn": "▶ 一键体验 1,200 条书签 3 秒智能重构",
    "demo.runningBtn": "⚡ 正在本地沙箱极速重构...",
    "demo.statScanned": "已扫描书签:",
    "demo.statDead": "已揪出死链 (404/DoH):",
    "demo.statEco": "16 大生态智能归拢:",
    "demo.statShielded": "安全保护协同文档:",
    "demo.ctaSuccess": "🎉 <strong>3.2 秒本地重构模拟完成！</strong> 揪出 142 个失效死链、物理聚类 486 个大厂生态、安全隔离 28 份协作文档，并已生成时光机无损快照。",
    "demo.tabDead": "失效死链 (142)",
    "demo.tabEco": "16 大云生态 (486)",
    "demo.tabDocs": "鉴权协作文档 (28)",
    "demo.panelDeadSummary": "行动手册：一键安全隔离全部 142 条已确诊死链，自动预导出 Netscape HTML 备份并支持时光机原位回滚。",
    "demo.panelEcoSummary": "行动手册：0.8 秒内将 486 条研发链接自动聚类至 16 大云端与开发者生态目录，全程零云端上传。",
    "demo.panelDocsSummary": "行动手册：28 份需登录鉴权的协同工作文档已严格隔离保护，同时自动跳过 RFC 1918 内网地址避免风控误报。",
    "demo.ctaInstall": "免费体检我的真实书签 (Free)",
    "demo.ctaBuyLtd": "解锁终身 Pro 授权 ($14.90)",
    "demo.ctaBuyTeam": "5 席团队报销包 ($39)",
    "demo.scarcity": "早鸟特惠进行中 ($14.90，限量 200 席后恢复 $29)",

    // Dynamic SVG Health Badge Generator
    "badgeGen.tag": "开源主页与工程文档集成",
    "badgeGen.title": "生成并嵌入您的书签健康度徽章",
    "badgeGen.desc": "一键生成 Shields 极客风格动态 SVG 健康徽章，轻松嵌入 GitHub README、团队研发 Wiki 或 Notion 看板。",
    "badgeGen.scoreLabel": "健康评分 (0–100)",
    "badgeGen.deadLabel": "剩余死链数 (0–50)",
    "badgeGen.previewLabel": "实时 SVG 效果预览",
    "badgeGen.mdLabel": "Markdown 代码 (GitHub README / Notion)",
    "badgeGen.htmlLabel": "HTML 嵌入代码",
    "badgeGen.copyMd": "复制 Markdown",
    "badgeGen.copyHtml": "复制 HTML",
    "badgeGen.tip": "提示：由边缘节点缓存 SVG 驱动 — 零 Cookie、零追踪像素。"
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
  const isTerms = /\/(terms|terms\.html)(\/|$)/.test(pathname);
  const isPrivacy = /\/(privacy|privacy\.html)(\/|$)/.test(pathname);
  const isRefund = /\/(refund|refund\.html)(\/|$)/.test(pathname);
  const isBlog = /\/(blog|blog\.html)(\/|$)/.test(pathname);

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
    } else if (isBlog) {
      document.title = (lang === 'zh')
        ? "技术博客与深度指南 — 书签健康卫士 (BHM-PRO) 官方知识库"
        : "BHM-PRO Technical Blog & Engineering Guides — Zero 404s, 16 Cloud & Dev Ecosystems & Local-First";
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
      } else if (isBlog) {
        metaDesc.setAttribute('content', (lang === 'zh')
          ? "书签健康卫士 (BHM-PRO) 官方技术博客与工程指南。深度解析 Chrome 404 死链体检、DoH 权威防误杀、16 大云端与开发生态智能分类与 Local-First 本地优先架构。"
          : "Official engineering blog and technical guides for Bookmark Health Master (BHM-PRO). Tutorials on Chrome 404 dead link cleanup, DoH diagnostics, 16 Cloud & Dev Ecosystems, and local-first architecture.");
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
