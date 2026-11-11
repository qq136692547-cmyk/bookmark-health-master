// ============================================================================
// Bookmark Health Master (BHM-PRO) 轻量零依赖双语国际化引擎 (i18n Core)
// 支持: 中英双语实时切换、DOM 自动局部翻译、跨页面 storage 联动同步
// ============================================================================

const BHM_I18N = {
  currentLang: "en",
  _initialized: false,

  DICTS: {
    zh: {
      langToggleText: "🌐 EN",
      langToggleTitle: "Switch to English",

      // Popup
      "popup.title": "Bookmark Health Master",
      "popup.subtitle": "原生书签体检与科技巨头生态",
      "popup.totalBookmarks": "书签总数",
      "popup.loading": "加载中...",
      "popup.localMode": "本地模式",
      "popup.countUnit": "{count} 个",
      "popup.ecoIdentified": "已识别大厂生态",
      "popup.ecoCountVal": "16 大官方生态已支持",
      "popup.ecoCountValShort": "16 大官方生态",
      "popup.licenseStatus": "授权状态",
      "popup.freeEdition": "免费基础版 (Free)",
      "popup.washEdition": "30天大扫除卡 (Pass)",
      "popup.ltdEdition": "Pro 终身买断 (LTD)",
      "popup.openSidePanel": "打开侧边栏伴侣 (Side Panel)",
      "popup.openDashboard": "打开全景大盘管理 (Dashboard)",

      // Sidepanel
      "sidepanel.brand": "BHM 原生伴侣",
      "sidepanel.bookmarkCurrent": "⭐ 收藏当前页",
      "sidepanel.bookmarkCurrentTitle": "收藏当前正在浏览的页面",
      "sidepanel.bookmarked": "✅ 已收藏",
      "sidepanel.cantBookmarkSystem": "无法收藏浏览器系统内置页面",
      "sidepanel.bookmarkFailed": "收藏失败: {msg}",
      "sidepanel.refresh": "🔄 刷新",
      "sidepanel.refreshTitle": "手动刷新书签树",
      "sidepanel.fullDashboard": "📊 全景大盘",
      "sidepanel.searchPlaceholder": "🔍 毫秒级模糊搜索全部书签或生态...",
      "sidepanel.tabAll": "🌟 全部",
      "sidepanel.loading": "正在加载书签与生态数据...",
      "sidepanel.noMatches": "未找到匹配的书签",
      "sidepanel.totalCount": "共 {count} 个书签",
      "sidepanel.loadedCount": "已加载 {rendered} / 共 {total} 个书签",
      "sidepanel.loadMore": "加载更多 (剩余 {remaining} 项)",
      "sidepanel.copyTitle": "复制链接",
      "sidepanel.deleteTitle": "删除书签",
      "sidepanel.deleteConfirm": "确定要彻底删除书签「{title}」吗？",
      "sidepanel.deleteFailed": "删除失败: {msg}",
      "sidepanel.statusText": "已载入 16 大全球与中国科技巨头官方全生态",
      "sidepanel.nativeActive": "● 原生常驻",
      "sidepanel.quotaExceeded": "已达到免费版 10 条书签操作配额上限。请在全景大盘中升级 Pro 商业授权以继续。",

      // Dashboard Header & Tabs
      "dashboard.title": "Bookmark Health Master (BHM-PRO)",
      "dashboard.versionBadge": "Manifest V3 生产版",
      "dashboard.subtitle": "原生书签体检清洗、16大全球科技巨头生态智能重组与时光机安全底座",
      "dashboard.nativeReady": "Chrome 原生就绪",
      "dashboard.tabHealth": "🩺 书签健康体检与死链清理",
      "dashboard.tabEcosystems": "🏛️ 16 大全球科技巨头生态矩阵",
      "dashboard.tabSnapshots": "⏱️ 时光机快照与安全回滚",
      "dashboard.tabPro": "💎 Pro 商业化特权",

      // Dashboard TAB 1 (Health)
      "dashboard.statTotal": "书签总库容量",
      "dashboard.statTotalDesc": "Chrome 原生直接读取",
      "dashboard.statHealth": "综合健康评分",
      "dashboard.statHealthNotScanned": "未体检 (点击下方开始)",
      "dashboard.statHealthExcellent": "健康极佳 · 仅少量失效或重定向",
      "dashboard.statHealthGood": "健康良好 · 建议及时清理失效书签",
      "dashboard.statHealthPoor": "亚健康 · 存在较多失效死链与超时地址",
      "dashboard.statDead": "已检出死链 / 失效",
      "dashboard.statDeadDesc": "404 / 410 / 连接超时",
      "dashboard.statEco": "16 大官方生态产品",
      "dashboard.statEcoDesc": "已就绪归类收纳",
      "dashboard.probeCardTitle": "双阶段自适应死链健康探测",
      "dashboard.probeCardDesc": "采用 HEAD 探针 + Range GET 降级，自动识别 Cloudflare 防爬挑战，杜绝误杀正常网址",
      "dashboard.startScan": "🚀 开始全库并发体检",
      "dashboard.scanning": "⚡ 正在并发体检中...",
      "dashboard.rescan": "🔄 重新体检",
      "dashboard.cleanDeadBtn": "🗑️ 一键隔离失效死链 ({count} 项)",
      "dashboard.cleanDeadBtnDefault": "🗑️ 一键隔离失效死链至回收站",
      "dashboard.stopScan": "⏹️ 停止体检",
      "dashboard.stopping": "中止中...",
      "dashboard.probingStatus": "正在探测...",
      "dashboard.probingItem": "探测中: {title}...",
      "dashboard.probeComplete": "体检完成！共完成 {count} 项探测",
      "dashboard.resultListTitle": "检测结果清单",
      "dashboard.noScanRecord": "暂无体检记录",
      "dashboard.clickToScan": "点击上方「开始全库并发体检」按钮，将启动深度健康检测",
      "dashboard.filterAll": "全部 ({count})",
      "dashboard.filterDead": "失效死链 ({count})",
      "dashboard.filterReview": "🛡️ 安全复核区 ({count})",
      "dashboard.filterRedirect": "301 重定向 ({count})",
      "dashboard.filterHealthy": "正常健康 ({count})",
      "dashboard.noFilterMatches": "该分类下无匹配书签",
      "dashboard.visitBtn": "访问",
      "dashboard.quarantineBtn": "隔离",
      "dashboard.untitledBookmark": "无标题书签",
      "dashboard.deadBadge": "死链/已注销",
      "dashboard.reviewBadge": "🛡️ 安全复核区",
      "dashboard.internalBadge": "🛡️ 内网保护",
      "dashboard.redirectBadge": "301 重定向",
      "dashboard.cfBadge": "CF 防爬防护",
      "dashboard.healthyBadge": "健康 200 OK",
      "dashboard.redirectTarget": "↳ 目标新地址: {url}",

      // Dashboard TAB 2 (Ecosystems)
      "dashboard.ecoBannerTitle": "16 大全球与中国科技巨头官方全生态归拢矩阵",
      "dashboard.ecoBannerDesc": "自动识别散乱在书签中的官方控制台与产品，支持一键在 Chrome 原生书签栏首位生成权威全生态总书签",
      "dashboard.reorganizeEcoBtn": "⚡ 一键在 Chrome 中重组全生态总书签",
      "dashboard.bookmarksMatched": "{count} 个书签匹配",
      "dashboard.noEcoInLibrary": "书签库中暂未发现官方产品",
      "dashboard.andMoreEco": "及另外 {count} 个官方书签...",
      "dashboard.ecoCardFooter": "支持官方主域与控制台精准聚类",
      "dashboard.nativeReadyTag": "✓ 原生就绪",

      // Dashboard TAB 3 (Snapshots)
      "dashboard.safetyTitle": "零数据丢失安全时光机 & 原子级位移事务日志",
      "dashboard.safetyDesc": "每次执行死链隔离或生态重组前，自动记录精确到旧父目录与索引的位移日志，支持 100% 原位退回",
      "dashboard.manualSnapshotBtn": "📸 手动创建全量 HTML 快照",
      "dashboard.journalTitle": "增量操作事务日志 (Move Journals - 支持原子级原路退回)",
      "dashboard.journalSubtitle": "记录旧父目录与索引，绝不破坏原有目录树",
      "dashboard.noJournals": "暂无操作事务记录。执行清理或重组时将自动记录。",
      "dashboard.journalQuarantine": "🗑️ 失效死链隔离事务",
      "dashboard.journalReorganize": "🏛️ 16大生态归拢重组事务",
      "dashboard.journalGeneric": "书签位移事务",
      "dashboard.journalMovesCount": "{count} 项位移",
      "dashboard.journalPartialBadge": "部分未完成 · 可重试",
      "dashboard.journalMeta": "{date} · 原父目录与排序位已完整留存",
      "dashboard.journalRollbackBtn": "🔄 原位回滚 (Undo)",
      "dashboard.journalRollingBack": "正在原路退回...",
      "dashboard.snapshotTitle": "Netscape HTML 全量离线备份快照",
      "dashboard.snapshotSubtitle": "用于导出并在任意浏览器直接导入",
      "dashboard.noSnapshots": "暂无历史快照。执行体检清理或生态归拢前，系统将全自动强制创建备份。",
      "dashboard.restoreSnapBtn": "🔄 一键恢复",
      "dashboard.restoring": "恢复中...",
      "dashboard.downloadSnapBtn": "📥 导出 HTML",
      "dashboard.deleteSnapBtn": "🗑️ 删除",
      "dashboard.manualSnapshotDefault": "用户手动完整全量快照",

      // Dashboard TAB 4 (Pro)
      "dashboard.proHeroTitle": "解锁 Bookmark Health Master Pro 专业版",
      "dashboard.proHeroSubtitle": "享批量死链隔离、16大生态完全归拢、301重定向预览与时光机原子级原位退回",
      "dashboard.feature1": "无限制全库死链一键隔离与原子级无损恢复",
      "dashboard.feature2": "16 大全球与中国科技巨头官方全生态物理归拢与去重",
      "dashboard.feature3": "多租户协同文档（Google Docs/飞书/语雀）独立分类隔离",
      "dashboard.feature4": "增量位移事务日志（Move Journal）一键原子级原位退回",
      "dashboard.feature5": "Cloudflare DoH 域名注销交叉核验与增量位移原位回滚保护",
      "dashboard.planSingleWashTitle": "⚡ 30天全量大扫除卡",
      "dashboard.planSingleWashPrice": "$4.90",
      "dashboard.planSingleWashDesc": "30天内高达 500 条失效书签批量隔离、DoH 域名核验与原位回滚",
      "dashboard.planSingleWashBtn": "获取大扫除卡 ($4.90)",
      "dashboard.planLtdTitle": "👑 Pro 终身买断授权",
      "dashboard.planLtdPrice": "$14.90",
      "dashboard.planLtdDesc": "全功能永久解锁、无限量死链批量隔离、16大生态归拢、协同知识库隔离与终身更新",
      "dashboard.planLtdBtn": "终身买断授权 ($14.90)",
      "dashboard.popularBadge": "EARLY BIRD",
      "dashboard.paymentNote": "支持信用卡、PayPal、Apple Pay 全球合规即时结算 (Gumroad / Paddle)",
      "dashboard.licenseRedeemTitle": "已有激活码 / 许可证密钥？",
      "dashboard.licenseKeyPlaceholder": "粘贴您的激活密钥（格式如 BHM1.eyJ...）",
      "dashboard.activateBtn": "激活授权",
      "dashboard.deactivateBtn": "已激活 (解除授权)",
      "dashboard.licenseHelpText": "请输入购买邮箱收到的 BHM1... 格式授权密钥（本地 Ed25519 离线签名验证）。",
      "dashboard.licenseActiveBadge": "👑 {tier}已生效",
      "dashboard.licenseKeyMasked": "密钥: {key}",

      // Toasts & Dialogs
      "toast.scanAborted": "已中止体检扫描，正在汇总已探测结果...",
      "toast.scanPermissionRequired": "需要网络连通性权限方可探测全库死链状态",
      "toast.hostPermDenied": "⚠️ 未授予主机访问权限 (*://*/*)，无法执行深度 HTTP 状态探测与请求头剥离，体检已中止。",
      "toast.scanConcurrencyLock": "⚠️ 检测到另一窗口正在执行书签体检，请勿重复并发扫描",
      "toast.scanCompleted": "体检完成！健康评分 {score} 分，发现 {dead} 个失效死链，{review} 项入安全复核区",
      "toast.scanError": "体检过程出现异常: {msg}",
      "toast.noDeadLinks": "未发现需要清理的失效死链",
      "dialog.confirmCleanDead": "【零数据丢失安全保障】\n\n即将把检出的 {count} 个失效死链移入「{folder}」目录。\n\n系统已为您自动准备完整的 Netscape HTML 快照，清理后可随时一键找回或回滚。\n\n确认立即清理？",
      "toast.quarantineSuccess": "🎉 成功将 {count} 个失效死链隔离至回收站！全量快照已归档。",
      "toast.quarantinePartial": "已成功将 {moved} 个死链隔离至回收站，剩余 {skipped} 个待清理（受当前版本配额限制）。",
      "toast.singleQuarantineSuccess": "已将「{title}」移至死链回收站",
      "toast.singleQuarantineFailed": "未能将「{title}」移至回收站（配额已用尽或移动失败）",
      "toast.freeQuotaLimit": "免费版当前剩余配额 {quota} 项。超出部分将被保留在待清理列表，可升级 Pro 解锁无限清理。",
      "toast.washQuotaLimit": "30天大扫除卡当前剩余配额 {quota} 项。超出部分将被保留在待清理列表。",
      "toast.noReorganizeItems": "未检测到可重组的书签",
      "dialog.confirmReorganize": "【全生态书签权威归拢与主域名自动归类】\n\n将在您的 Chrome 原生书签栏首位生成「{mainFolder}」收纳 16 大官方生态，并在书签栏创建「{uncatFolder}」为所有未命中巨头生态的书签按主域名自动建夹分流，彻底杜绝孤儿散落。\n\n执行前将自动生成全量 Netscape HTML 快照，随时可撤销回滚。\n\n确认立即智能重组？",
      "toast.reorganizeProRequired": "全生态物理归拢与未分类主域名建夹属于 Pro 终身商业授权特权，请前往 Pro 特权页解锁",
      "toast.reorganizeSuccess": "🎉 成功归拢重组 {count} 项书签！0 散落孤儿书签。",
      "toast.reorganizePartial": "全生态重组已移动 {moved} 项，{failed} 项位移失败（已保留在原目录）。",
      "dialog.confirmRollbackJournal": "【原子级原位回滚确认】\n\n即将把该事务中的 {count} 项书签原路退回到它们被移动前的原始父目录与原始索引位置！\n\n期间绝不改变书签原有 ID，绝不重复生成多余目录。\n\n确认立即原位回滚？",
      "toast.rollbackSuccess": "🎉 成功原子级原位回滚 {count} 项书签！目录树已 100% 恢复",
      "toast.rollbackPartial": "⚠️ 回滚未完全成功（已还原 {count} 项，失败 {failed} 项），事务日志已安全保留，可排除异常后重试",
      "toast.rollbackError": "回滚失败: {msg}",
      "dialog.confirmRestoreSnapshot": "【快照一键安全恢复】\n\n将在 Chrome 书签栏新建独立的「{folder}」文件夹安全还原该快照中的全部书签与层级结构，绝不覆盖或删除现有书签！\n\n确认立即安全恢复？",
      "toast.restoreSnapshotSuccess": "🎉 成功从快照安全恢复 {count} 个书签至「{title}」目录！",
      "toast.restoreSnapshotFailed": "快照恢复未完成: {msg}",
      "toast.restoreSnapshotError": "恢复失败: {msg}",
      "toast.exportSnapshotSuccess": "已成功导出备份文件: {filename}",
      "toast.deleteSnapshotSuccess": "快照已安全删除",
      "toast.manualSnapshotSuccess": "📸 手动全量书签快照已成功创建！",
      "snapshot.singleQuarantine": "单条失效书签隔离: {title}",
      "snapshot.batchQuarantine": "死链批量隔离前快照 ({count} 项)",
      "snapshot.beforeReorganize": "全量书签生态与主域名重组前快照",
      "dialog.confirmDeactivate": "确定要解除当前的商业授权吗？",
      "toast.deactivated": "商业授权已成功解除",
      "toast.enterLicenseKey": "请输入您的许可证密钥 (License Key)",
      "toast.activateSuccess": "🎉 恭喜！{tier}已成功激活！",
      "toast.activateFailed": "激活失败: {msg}",

      // Folders
      "folder.trash": "🗑️ 待清理死链回收站 (BHM)",
      "folder.mainEco": "【官方全生态总书签】",
      "folder.uncat": "📁 未分类 (按主域名建夹)",
      "folder.ugcDocs": "📄 协同文档与云端知识库 (Docs & Knowledge Base)",
      "folder.snapshotPrefix": "🕰️ [快照恢复]"
    },

    en: {
      langToggleText: "🌐 中文",
      langToggleTitle: "Switch to Simplified Chinese / 切换中文",

      // Popup
      "popup.title": "Bookmark Health Master",
      "popup.subtitle": "Dead Link Cleaner & Titans Organizer",
      "popup.totalBookmarks": "Total Bookmarks",
      "popup.loading": "Loading...",
      "popup.localMode": "Local Mode",
      "popup.countUnit": "{count} bookmarks",
      "popup.ecoIdentified": "Titans Ecosystems",
      "popup.ecoCountVal": "16 Titans Supported",
      "popup.ecoCountValShort": "16 Titans Supported",
      "popup.licenseStatus": "License Tier",
      "popup.freeEdition": "Free Edition",
      "popup.washEdition": "Wash Pass",
      "popup.ltdEdition": "Pro Lifetime",
      "popup.openSidePanel": "Open Side Panel",
      "popup.openDashboard": "Open Full Dashboard",

      // Sidepanel
      "sidepanel.brand": "BHM Companion",
      "sidepanel.bookmarkCurrent": "⭐ Bookmark Tab",
      "sidepanel.bookmarkCurrentTitle": "Bookmark currently active browser tab",
      "sidepanel.bookmarked": "✅ Saved",
      "sidepanel.cantBookmarkSystem": "Cannot bookmark internal browser system pages",
      "sidepanel.bookmarkFailed": "Bookmark failed: {msg}",
      "sidepanel.refresh": "🔄 Refresh",
      "sidepanel.refreshTitle": "Manually refresh bookmark tree",
      "sidepanel.fullDashboard": "📊 Dashboard",
      "sidepanel.searchPlaceholder": "🔍 Search all bookmarks or ecosystems...",
      "sidepanel.tabAll": "🌟 All",
      "sidepanel.loading": "Loading bookmarks and ecosystem data...",
      "sidepanel.noMatches": "No matching bookmarks found",
      "sidepanel.totalCount": "{count} bookmarks in total",
      "sidepanel.loadedCount": "Loaded {rendered} / {total} bookmarks",
      "sidepanel.loadMore": "Load More ({remaining} remaining)",
      "sidepanel.copyTitle": "Copy URL",
      "sidepanel.deleteTitle": "Delete Bookmark",
      "sidepanel.deleteConfirm": "Are you sure you want to permanently delete \"{title}\"?",
      "sidepanel.deleteFailed": "Delete failed: {msg}",
      "sidepanel.statusText": "Loaded 16 Global & China Tech Titans Ecosystems",
      "sidepanel.nativeActive": "● Native Ready",
      "sidepanel.quotaExceeded": "Free edition quota limit (10 bookmarks) reached. Please upgrade to Pro in Dashboard to continue.",

      // Dashboard Header & Tabs
      "dashboard.title": "Bookmark Health Master (BHM-PRO)",
      "dashboard.versionBadge": "Manifest V3 Production",
      "dashboard.subtitle": "Native bookmark dead link cleaner, 16 tech titans organizer & Time Machine safety baseline",
      "dashboard.nativeReady": "Chrome Native Ready",
      "dashboard.tabHealth": "🩺 Health & Dead Links",
      "dashboard.tabEcosystems": "🏛️ 16 Titans Ecosystems",
      "dashboard.tabSnapshots": "⏱️ Time Machine & Rollback",
      "dashboard.tabPro": "💎 Pro Privileges",

      // Dashboard TAB 1 (Health)
      "dashboard.statTotal": "Total Bookmarks",
      "dashboard.statTotalDesc": "Read directly from native Chrome",
      "dashboard.statHealth": "Health Score",
      "dashboard.statHealthNotScanned": "Not inspected (Click start below)",
      "dashboard.statHealthExcellent": "Excellent · Few broken links",
      "dashboard.statHealthGood": "Good · Periodic cleaning recommended",
      "dashboard.statHealthPoor": "Sub-healthy · Multiple dead links or timeouts",
      "dashboard.statDead": "Dead / Broken Links",
      "dashboard.statDeadDesc": "404 / 410 / Connection timeout",
      "dashboard.statEco": "16 Titans Products",
      "dashboard.statEcoDesc": "Ready for structured grouping",
      "dashboard.probeCardTitle": "Two-Stage Adaptive Dead Link Health Probe",
      "dashboard.probeCardDesc": "HEAD probe + Range GET fallback, auto-detects Cloudflare anti-bot challenge to prevent false positives",
      "dashboard.startScan": "🚀 Start Full Scan",
      "dashboard.scanning": "⚡ Scanning concurrently...",
      "dashboard.rescan": "🔄 Re-scan Library",
      "dashboard.cleanDeadBtn": "🗑️ Quarantine {count} Dead Links",
      "dashboard.cleanDeadBtnDefault": "🗑️ Quarantine Dead Links to Trash",
      "dashboard.stopScan": "⏹️ Stop Scan",
      "dashboard.stopping": "Stopping...",
      "dashboard.probingStatus": "Probing...",
      "dashboard.probingItem": "Probing: {title}...",
      "dashboard.probeComplete": "Inspection complete! Probed {count} bookmarks",
      "dashboard.resultListTitle": "Inspection Results",
      "dashboard.noScanRecord": "No inspection records yet",
      "dashboard.clickToScan": "Click \"Start Full Scan\" above to initiate deep health detection",
      "dashboard.filterAll": "All ({count})",
      "dashboard.filterDead": "Dead Links ({count})",
      "dashboard.filterReview": "🛡️ Safety Review ({count})",
      "dashboard.filterRedirect": "301 Redirect ({count})",
      "dashboard.filterHealthy": "Healthy ({count})",
      "dashboard.noFilterMatches": "No matching bookmarks in this category",
      "dashboard.visitBtn": "Visit",
      "dashboard.quarantineBtn": "Quarantine",
      "dashboard.untitledBookmark": "Untitled Bookmark",
      "dashboard.deadBadge": "Dead / Unresolved",
      "dashboard.reviewBadge": "🛡️ Safety Review",
      "dashboard.internalBadge": "🛡️ Intranet Protected",
      "dashboard.redirectBadge": "301 Redirect",
      "dashboard.cfBadge": "CF Anti-Bot Challenge",
      "dashboard.healthyBadge": "Healthy 200 OK",
      "dashboard.redirectTarget": "↳ Target: {url}",

      // Dashboard TAB 2 (Ecosystems)
      "dashboard.ecoBannerTitle": "16 Global & China Tech Titans Official Ecosystem Reorganization Matrix",
      "dashboard.ecoBannerDesc": "Automatically detects official consoles & products across bookmarks, and generates official ecosystem master bookmarks at the head of native Chrome Bookmarks Bar with one click",
      "dashboard.reorganizeEcoBtn": "⚡ Reorganize Ecosystems in Chrome",
      "dashboard.bookmarksMatched": "{count} bookmarks matched",
      "dashboard.noEcoInLibrary": "No official products found in library yet",
      "dashboard.andMoreEco": "...and {count} more official bookmarks",
      "dashboard.ecoCardFooter": "Authoritative domain & console clustering",
      "dashboard.nativeReadyTag": "✓ Native Ready",

      // Dashboard TAB 3 (Snapshots)
      "dashboard.safetyTitle": "Zero-Data-Loss Safety Time Machine & Atomic Move Journals",
      "dashboard.safetyDesc": "Automatically captures pre-move parent and index before any quarantine or reorganization, guaranteeing 100% in-place rollback",
      "dashboard.manualSnapshotBtn": "📸 Create Full HTML Snapshot",
      "dashboard.journalTitle": "Incremental Move Journals (Atomic in-place rollback supported)",
      "dashboard.journalSubtitle": "Records pre-move parent directory & index without disrupting original tree",
      "dashboard.noJournals": "No transaction journals recorded yet. Executed actions will be logged automatically.",
      "dashboard.journalQuarantine": "🗑️ Dead Links Quarantine Transaction",
      "dashboard.journalReorganize": "🏛️ 16 Titans Reorganization Transaction",
      "dashboard.journalGeneric": "Bookmark Move Transaction",
      "dashboard.journalMovesCount": "{count} moves",
      "dashboard.journalPartialBadge": "Partially Complete · Retryable",
      "dashboard.journalMeta": "{date} · Original parent and order preserved",
      "dashboard.journalRollbackBtn": "🔄 Undo (In-Place)",
      "dashboard.journalRollingBack": "Restoring in-place...",
      "dashboard.snapshotTitle": "Netscape HTML Full Offline Backup Snapshots",
      "dashboard.snapshotSubtitle": "Export and import directly into any browser",
      "dashboard.noSnapshots": "No historical snapshots yet. Automatic backups are taken before any destructive actions.",
      "dashboard.restoreSnapBtn": "🔄 Restore",
      "dashboard.restoring": "Restoring...",
      "dashboard.downloadSnapBtn": "📥 Export HTML",
      "dashboard.deleteSnapBtn": "🗑️ Delete",
      "dashboard.manualSnapshotDefault": "Manual full bookmark snapshot",

      // Dashboard TAB 4 (Pro)
      "dashboard.proHeroTitle": "Unlock Bookmark Health Master Pro",
      "dashboard.proHeroSubtitle": "Enjoy batch dead link quarantine, 16 Titans clustering, 301 redirect preview & atomic in-place rollback",
      "dashboard.feature1": "Unlimited full-library dead link quarantine with atomic lossless restoration",
      "dashboard.feature2": "16 Global & China Tech Titans official ecosystem grouping & deduplication",
      "dashboard.feature3": "Multi-tenant collaborative docs (Google Docs / Feishu / Yuque) isolation",
      "dashboard.feature4": "Incremental move journals with one-click atomic in-place rollback",
      "dashboard.feature5": "Cloudflare DoH NXDOMAIN verification & incremental move atomic undo protection",
      "dashboard.planSingleWashTitle": "⚡ 30-Day Full Wash Pass",
      "dashboard.planSingleWashPrice": "$4.90",
      "dashboard.planSingleWashDesc": "30-day pass: batch quarantine up to 500 dead links, DoH verification & atomic undo",
      "dashboard.planSingleWashBtn": "Get Wash Pass ($4.90)",
      "dashboard.planLtdTitle": "👑 Pro Lifetime Buyout",
      "dashboard.planLtdPrice": "$14.90",
      "dashboard.planLtdDesc": "Permanent unlock: unlimited dead link quarantine, 16 Titans clustering, collaborative docs isolation & lifetime updates",
      "dashboard.planLtdBtn": "Lifetime Buyout ($14.90)",
      "dashboard.popularBadge": "EARLY BIRD",
      "dashboard.paymentNote": "Supports Credit Card, PayPal, Apple Pay (Gumroad / Paddle)",
      "dashboard.licenseRedeemTitle": "Already have a license key?",
      "dashboard.licenseKeyPlaceholder": "Paste your license key (e.g. BHM1.eyJ...)",
      "dashboard.activateBtn": "Activate License",
      "dashboard.deactivateBtn": "Activated (Revoke)",
      "dashboard.licenseHelpText": "Enter the BHM1... license key from your purchase email (offline Ed25519 signature verification).",
      "dashboard.licenseActiveBadge": "👑 {tier} Active",
      "dashboard.licenseKeyMasked": "Key: {key}",

      // Toasts & Dialogs
      "toast.scanAborted": "Scan aborted. Compiling results so far...",
      "toast.scanPermissionRequired": "Network permission is required to probe dead links across the bookmark library.",
      "toast.hostPermDenied": "⚠️ Host permission (*://*/*) not granted. Deep HTTP diagnostic probing and header stripping cannot run; scan aborted.",
      "toast.scanConcurrencyLock": "⚠️ Another window is performing bookmark health inspection. Concurrent scan prevented.",
      "toast.scanCompleted": "Health scan complete! Score: {score}/100. Found {dead} dead links, {review} placed in safety review.",
      "toast.scanError": "Exception during health inspection: {msg}",
      "toast.noDeadLinks": "No broken dead links detected to clean.",
      "dialog.confirmCleanDead": "【Zero-Data-Loss Safety Guarantee】\n\nAbout to quarantine {count} broken dead links into the \"{folder}\" folder.\n\nA full Netscape HTML snapshot has been created. You can recover or rollback at any time.\n\nProceed with quarantine?",
      "toast.quarantineSuccess": "🎉 Successfully quarantined {count} broken dead links! Full snapshot archived.",
      "toast.quarantinePartial": "Quarantined {moved} dead links. {skipped} remaining due to tier quota limits.",
      "toast.singleQuarantineSuccess": "Moved \"{title}\" to dead links quarantine.",
      "toast.singleQuarantineFailed": "Failed to move \"{title}\" (quota reached or move error).",
      "toast.freeQuotaLimit": "Free edition remaining quota: {quota} items. Excess items retained; upgrade to Pro for unlimited cleaning.",
      "toast.washQuotaLimit": "30-Day Wash Pass remaining quota: {quota} items. Excess items retained in list.",
      "toast.noReorganizeItems": "No bookmarks detected for reorganization.",
      "dialog.confirmReorganize": "【Official Titans Reorganization & Main-Domain Bucketing】\n\nWill create \"{mainFolder}\" at the head of your Chrome Bookmarks Bar for the 16 Tech Titans, and \"{uncatFolder}\" for all other bookmarks by domain.\n\nA full Netscape HTML snapshot will be saved first.\n\nProceed with reorganization?",
      "toast.reorganizeProRequired": "Physical Titans reorganization & domain bucketing is a Pro Lifetime feature. Please unlock in Pro tab.",
      "toast.reorganizeSuccess": "🎉 Successfully reorganized {count} bookmarks! 0 orphan bookmarks.",
      "toast.reorganizePartial": "Ecosystem reorganization moved {moved} bookmarks, {failed} failed (retained in original folder).",
      "dialog.confirmRollbackJournal": "【Atomic In-Place Rollback Confirmation】\n\nAbout to restore {count} moved bookmarks back to their exact original parent folder and index!\n\nExisting bookmark IDs are preserved without creating duplicate folders.\n\nProceed with in-place rollback?",
      "toast.rollbackSuccess": "🎉 Successfully rolled back {count} bookmarks in place! Hierarchy 100% restored.",
      "toast.rollbackPartial": "⚠️ Rollback partially completed (Restored {count}, failed {failed}). Journal preserved safely for retry.",
      "toast.rollbackError": "Rollback error: {msg}",
      "dialog.confirmRestoreSnapshot": "【Snapshot Safe Restoration】\n\nWill create a dedicated \"{folder}\" folder in your Chrome Bookmarks Bar to restore all bookmarks and folders from this snapshot. Existing bookmarks will NOT be overwritten!\n\nProceed with safe restore?",
      "toast.restoreSnapshotSuccess": "🎉 Successfully restored {count} bookmarks from snapshot into \"{title}\"!",
      "toast.restoreSnapshotFailed": "Snapshot restore incomplete: {msg}",
      "toast.restoreSnapshotError": "Restore failed: {msg}",
      "toast.exportSnapshotSuccess": "Backup file exported successfully: {filename}",
      "toast.deleteSnapshotSuccess": "Snapshot safely deleted.",
      "toast.manualSnapshotSuccess": "📸 Manual full bookmark snapshot created successfully!",
      "snapshot.singleQuarantine": "Single dead link quarantine: {title}",
      "snapshot.batchQuarantine": "Dead links batch quarantine snapshot ({count} items)",
      "snapshot.beforeReorganize": "Full bookmark ecosystem and domain reorganization snapshot",
      "dialog.confirmDeactivate": "Are you sure you want to deactivate the current commercial license?",
      "toast.deactivated": "Commercial license deactivated successfully.",
      "toast.enterLicenseKey": "Please enter your license key (e.g. BHM1...)",
      "toast.activateSuccess": "🎉 Congratulations! {tier} activated successfully!",
      "toast.activateFailed": "Activation failed: {msg}",

      // Folders
      "folder.trash": "🗑️ Dead Links Quarantine (BHM)",
      "folder.mainEco": "【Official Tech Titans Ecosystems】",
      "folder.uncat": "📁 Uncategorized (By Domain)",
      "folder.ugcDocs": "📄 Docs & Knowledge Base",
      "folder.snapshotPrefix": "🕰️ [Snapshot Restore]"
    }
  },

  /**
   * 初始化 i18n 语言状态
   */
  async init(options = {}) {
    if (this._initialized && !options.force) return this.currentLang;

    let storedLang = null;
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      storedLang = await new Promise((resolve) => {
        chrome.storage.local.get(["bhm_lang"], (res) => resolve(res ? res.bhm_lang : null));
      });
    } else if (typeof localStorage !== "undefined") {
      storedLang = localStorage.getItem("bhm_lang");
    }

    if (storedLang === "en" || storedLang === "zh") {
      this.currentLang = storedLang;
    } else {
      // 自动嗅探语言：以 zh 开头则采用 zh，其余全部默认 en
      const uiLang = (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getUILanguage)
        ? chrome.i18n.getUILanguage()
        : (typeof navigator !== "undefined" ? navigator.language : "en");

      if (typeof uiLang === "string" && uiLang.toLowerCase().startsWith("zh")) {
        this.currentLang = "zh";
      } else {
        this.currentLang = "en";
      }
    }

    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = this.currentLang === "zh" ? "zh-CN" : "en";
      this.applyToDOM();
    }

    // 跨页面 storage 变化监听 (仅绑定一次防重复监听)
    if (!this._listenerBound && typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      this._listenerBound = true;
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.bhm_lang && changes.bhm_lang.newValue) {
          const newLang = changes.bhm_lang.newValue === "zh" ? "zh" : "en";
          if (newLang !== this.currentLang) {
            this.currentLang = newLang;
            if (typeof document !== "undefined" && document.documentElement) {
              document.documentElement.lang = newLang === "zh" ? "zh-CN" : "en";
              this.applyToDOM();
              window.dispatchEvent(new CustomEvent("bhm:langchange", { detail: { lang: newLang } }));
            }
          }
        }
      });
    }

    this._initialized = true;
    return this.currentLang;
  },

  getLang() {
    return this.currentLang;
  },

  async setLang(lang) {
    const target = lang === "zh" ? "zh" : "en";
    this.currentLang = target;

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await new Promise((resolve) => {
        chrome.storage.local.set({ bhm_lang: target }, resolve);
      });
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("bhm_lang", target);
    }

    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = target === "zh" ? "zh-CN" : "en";
      this.applyToDOM();
      window.dispatchEvent(new CustomEvent("bhm:langchange", { detail: { lang: target } }));
    }

    return target;
  },

  async toggleLang() {
    const newLang = this.currentLang === "en" ? "zh" : "en";
    return await this.setLang(newLang);
  },

  t(key, vars = {}) {
    const dict = this.DICTS[this.currentLang] || this.DICTS.en;
    let template = dict[key];
    if (template === undefined) {
      template = this.DICTS.en[key];
    }
    if (template === undefined) {
      return key;
    }

    if (typeof template !== "string") {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (_, k) => {
      return vars[k] !== undefined ? vars[k] : `{${k}}`;
    });
  },

  applyToDOM(root = (typeof document !== "undefined" ? document : null)) {
    if (!root) return;

    // 1. 文本内容
    const textEls = root.querySelectorAll("[data-i18n]");
    textEls.forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) {
        el.textContent = this.t(key);
      }
    });

    // 2. 占位符 placeholder
    const placeholderEls = root.querySelectorAll("[data-i18n-placeholder]");
    placeholderEls.forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) {
        el.placeholder = this.t(key);
      }
    });

    // 3. title 悬浮说明
    const titleEls = root.querySelectorAll("[data-i18n-title]");
    titleEls.forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (key) {
        el.title = this.t(key);
      }
    });

    // 4. 自动更新语言切换按钮文案与说明
    const langBtn = root.getElementById ? root.getElementById("langToggleBtn") : root.querySelector("#langToggleBtn");
    if (langBtn) {
      const dict = this.DICTS[this.currentLang] || this.DICTS.en;
      langBtn.textContent = dict.langToggleText || (this.currentLang === "en" ? "🌐 中文" : "🌐 EN");
      langBtn.title = dict.langToggleTitle || (this.currentLang === "en" ? "Switch to Simplified Chinese / 切换中文" : "Switch to English");
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { BHM_I18N };
} else {
  (typeof window !== "undefined" ? window : global).BHM_I18N = BHM_I18N;
}
