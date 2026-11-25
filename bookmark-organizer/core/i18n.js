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
      "popup.upgradePro": "👑 升级至 Pro 版 (早鸟特惠 $4.90 起)",
      "popup.proActive": "👑 Pro 授权已激活 (享受全部特权)",
      "popup.tierActive": "{tier} 已激活",
      "popup.openSidePanel": "打开侧边栏伴侣 (Side Panel)",
      "popup.openDashboard": "打开全景大盘管理 (Dashboard)",

      // Sidepanel
      "sidepanel.brand": "BHM 原生伴侣",
      "sidepanel.bookmarkCurrent": "⭐ 收藏当前页",
      "sidepanel.bookmarkCurrentTitle": "收藏当前正在浏览的页面",
      "sidepanel.bookmarked": "✅ 已收藏",
      "sidepanel.cantBookmarkSystem": "无法收藏浏览器系统内置页面",
      "sidepanel.cantReadTab": "无法读取当前页面地址（浏览器内置页，或请先点击扩展图标授权当前标签页）",
      "sidepanel.bookmarkFailed": "收藏失败: {msg}",
      "sidepanel.refresh": "🔄 刷新",
      "sidepanel.refreshTitle": "手动刷新书签树",
      "sidepanel.fullDashboard": "📊 全景大盘",
      "sidepanel.upgradeBtn": "升级 Pro",
      "sidepanel.footerUpgrade": "👑 升级 Pro ($4.90起)",
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
      "sidepanel.washQuotaExceeded": "当前 30 天大扫除卡配额已用尽。请升级 Pro 终身买断版以解锁无限清理。",

      // Dashboard Header & Tabs
      "dashboard.title": "Bookmark Health Master (BHM-PRO)",
      "dashboard.versionBadge": "Manifest V3 生产版",
      "dashboard.subtitle": "原生书签体检清洗、16大全球科技巨头生态智能重组与时光机安全底座",
      "dashboard.nativeReady": "Chrome 原生就绪",
      "dashboard.headerUpgrade": "升级 Pro ($4.90起)",
      "dashboard.headerProLifetime": "Pro 终身买断已激活",
      "dashboard.headerProWash": "30天大扫除已激活",
      "dashboard.tabHealth": "🩺 书签健康体检与死链清理",
      "dashboard.tabDuplicates": "🔁 重复书签去重",
      "dashboard.tabEcosystems": "🏛️ 16 大全球科技巨头生态矩阵",
      "dashboard.tabSnapshots": "⏱️ 时光机快照与安全回滚",
      "dashboard.tabPro": "💎 升级 Pro / 特权",
      "dashboard.earlyBirdTag": "早鸟特惠",
      "dashboard.healthBannerTitle": "🌟 升级解锁 Pro 版无限批量清理与 16 巨头智能重构",
      "dashboard.healthBannerDesc": "免费版单次隔离上限 10 条书签。升级享无限量批量清理死链、Cloudflare DoH 防误杀校验与毫秒级快照回滚。",
      "dashboard.healthBannerBtnText": "立即解锁 ($4.90 起)",
      "dashboard.healthBannerRedeem": "输入授权码",
      "dashboard.lookupLicenseLink": "重装系统或换电脑丢失？点击此处自助找回授权码",

      // Dashboard TAB 1 (Health)
      "dashboard.statTotal": "书签总库容量",
      "dashboard.statTotalDesc": "Chrome 原生直接读取",
      "dashboard.statHealth": "综合健康评分",
      "dashboard.statHealthNotScanned": "未体检 (点击下方开始)",
      "dashboard.statHealthExcellent": "健康极佳 · 仅少量失效或重定向",
      "dashboard.statHealthGood": "健康良好 · 建议及时清理失效书签",
      "dashboard.statHealthPoor": "亚健康 · 存在较多失效死链与超时地址",
      "dashboard.statDead": "已检出死链 / 失效",
      "dashboard.statDeadDesc": "404 / 410 / 域名已注销",
      "dashboard.statEco": "16 大官方生态产品",
      "dashboard.statEcoDesc": "已就绪归类收纳",
      "dashboard.probeCardTitle": "双阶段自适应死链健康探测",
      "dashboard.probeCardDesc": "采用 HEAD 探针 + Range GET 降级，自动识别安全网关/WAF 与内网地址，杜绝误杀正常网址",
      "dashboard.dohDisclosure": "🔒 隐私披露：全程 100% 本地运行且不附带 Cookie；仅在连接超时时向 Cloudflare DoH (cloudflare-dns.com) 查询纯主机名（不含路径与参数）以核验域名是否注销。",
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
      "dashboard.scanSummaryStats": "共检测 {total} 项 · 死链 {dead} · 复核 {review} · 重定向 {redirect}",
      "dashboard.clickToScan": "点击上方「开始全库并发体检」按钮，将启动深度健康检测",
      "dashboard.filterAll": "全部 ({count})",
      "dashboard.filterDead": "失效死链 ({count})",
      "dashboard.filterReview": "🛡️ 安全复核区 ({count})",
      "dashboard.filterRedirect": "已重定向 ({count})",
      "dashboard.filterHealthy": "正常健康 ({count})",
      "dashboard.noFilterMatches": "该分类下无匹配书签",
      "dashboard.visitBtn": "访问",
      "dashboard.quarantineBtn": "隔离",
      "dashboard.untitledBookmark": "无标题书签",
      "dashboard.deadBadge": "死链/已注销",
      "dashboard.reviewBadge": "🛡️ 安全复核区",
      "dashboard.internalBadge": "🛡️ 内网保护",
      "dashboard.dangerousBadge": "🛡️ 敏感动作免测",
      "dashboard.serverErrorBadge": "⚠️ 服务端异常 ({code})",
      "dashboard.skippedBadge": "已跳过",
      "dashboard.redirectBadge": "已重定向",
      "dashboard.authRedirectBadge": "🛡️ 登录/网关跳转",
      "dashboard.healthyBadge": "健康 200 OK",
      "dashboard.redirectTarget": "↳ 目标新地址: {url}",

      // Prober localized reasons
      "probe.reason.INVALID_URL": "无效 URL 格式（已跳过）",
      "probe.reason.NON_HTTP": "非 HTTP/HTTPS 协议书签（已跳过）",
      "probe.reason.INTRANET_PROTECTED": "🛡️ 内网/本地环境书签（自动免测保护）",
      "probe.reason.DANGEROUS_ACTION": "🛡️ 检测到注销/退订等敏感动作参数（自动免测保护）",
      "probe.reason.WAF_OR_AUTH": "受安全网关/防爬挑战拦截 (HTTP {code})，实际网站存活，严禁误删",
      "probe.reason.HTTP_404": "页面未找到 (404 Not Found)",
      "probe.reason.HTTP_410": "资源已永久下线 (410 Gone)",
      "probe.reason.SERVER_ERROR": "服务端临时故障响应 (HTTP {code})，建议稍后复查",
      "probe.reason.DNS_NXDOMAIN": "域名已彻底注销停用 (DNS NXDOMAIN 验证确诊)",
      "probe.reason.NETWORK_TIMEOUT": "网络超时或需特定网络环境，DNS 解析正常，已放入安全复核区",
      "probe.reason.UNKNOWN_PROTECTED": "状态未知，已纳入安全保护",

      // Dashboard Duplicates MVP
      "dashboard.dupBannerTitle": "精准重复书签检测与无损去重",
      "dashboard.dupBannerDesc": "基于完整规范化 URL（严格保留查询参数与锚点，杜绝误合并不同页面），自动保留最早收藏项并将冗余副本安全移入隔离回收站，支持时光机原子回滚。",
      "dashboard.cleanDupsBtn": "🗑️ 一键隔离全部重复项 ({count} 条)",
      "dashboard.cleanDupsBtnZero": "✅ 无重复书签",
      "dashboard.noDuplicates": "🎉 太棒了！当前书签库未检测到重复 URL。",
      "dashboard.dupGroupCount": "共 {groups} 组重复 · 可安全清理 {count} 条冗余副本",
      "dashboard.dupKeepBadge": "✓ 保留（最早）",
      "dashboard.dupCopyBadge": "重复副本",
      "dashboard.journalDuplicates": "🔁 重复书签无损去重事务",
      "dialog.confirmCleanDups": "【零数据丢失去重保障】\n\n即将保留每组重复 URL 中最早收藏的 1 条书签，并将 {count} 条冗余副本安全移入「{folder}」隔离回收站。\n\n操作前会自动创建全量快照并记录事务日志，随时可一键原位回滚。\n\n确认立即去重？",
      "toast.dupQuarantineSuccess": "🎉 成功隔离 {count} 条重复书签！可随时在时光机一键原位回滚。",
      "toast.dupQuarantinePartial": "已隔离 {moved} 条重复书签，剩余 {skipped} 条待处理（受当前版本配额限制）。",
      "snapshot.batchDuplicates": "重复书签批量去重前快照 ({count} 项)",

      // Dashboard TAB 2 (Ecosystems & Protection v2.2)
      "dashboard.ecoBannerTitle": "智能归档矩阵：自定义规则 + 16 大官方生态 + 文件夹保护锁",
      "dashboard.ecoBannerDesc": "默认仅整理根目录散落书签，绝不拆散您自建的文件夹；支持锁定保护目录与添加个人专属域名归类规则",
      "dashboard.reorganizeEcoBtn": "⚡ 按当前策略执行重组",
      "dashboard.bookmarksMatched": "{count} 个书签匹配",
      "dashboard.noEcoInLibrary": "当前整理范围内暂无匹配书签",
      "dashboard.andMoreEco": "及另外 {count} 个书签...",
      "dashboard.ecoCardFooter": "支持官方主域与控制台精准聚类",
      "dashboard.customRuleCardFooter": "个人专属规则 · 直接归拢至书签栏同名目录",
      "dashboard.customRuleBadge": "✨ 自定义规则",
      "dashboard.nativeReadyTag": "✓ 原生就绪",
      "dashboard.reorgControlTitle": "🛡️ 归类范围与自定义目录保护",
      "dashboard.reorgScopeLabel": "整理范围策略",
      "dashboard.scopeLooseOnly": "🟢 仅整理根目录散落书签（推荐默认 · 保留全部用户自建目录）",
      "dashboard.scopeTitansOnly": "🟡 仅归拢自定义规则 + 16 巨头（跳过保护夹 · 不动普通书签）",
      "dashboard.scopeFullLibrary": "🔴 全库深度重构（跳过保护夹 · 其余按主域名建夹）",
      "dashboard.includeUncatLabel": "将未命中规则的普通书签按主域名移入「未分类」文件夹",
      "dashboard.reorgPreviewStats": "本次将整理 {eligible} 条（自定义 {custom} · 生态/文档 {eco} · 未分类 {uncat}）· 已安全保护 {protected} 条不移动",
      "dashboard.protectedFoldersTitle": "🔒 受保护文件夹白名单（点击锁定，重组时 100% 跳过不拆散）",
      "dashboard.protectedFoldersEmpty": "暂未检测到用户自定义文件夹（书签均位于根目录）",
      "dashboard.protectedFoldersHint": "提示：当前处于「仅整理根目录散落书签」模式，所有自建文件夹已默认全部保护；切换为其他模式时，锁定项将持续生效。",
      "dashboard.customRulesTitle": "✨ 我的自定义专属归类规则（最高优先级，优先于 16 巨头）",
      "dashboard.customRuleFolderPlaceholder": "目标文件夹名（如：自建网站）",
      "dashboard.customRuleDomainsPlaceholder": "域名列表，逗号分隔（如：geoscore.help, *.pages.dev）",
      "dashboard.addCustomRuleBtn": "+ 添加规则",
      "dashboard.customRulesEmpty": "暂无自定义规则。添加后，散落各处的指定域名将优先归拢到你的同名文件夹。",
      "dashboard.deleteRuleBtn": "删除",
      "toast.customRuleInvalid": "请输入目标文件夹名与至少一个有效域名（如 geoscore.help）",
      "toast.customRuleAdded": "已添加自定义规则「{folder}」并实时生效",
      "toast.customRuleDeleted": "已删除自定义规则",
      "toast.reorganizeAlreadySorted": "所有匹配书签均已在目标目录中，无需重复移动",
      "dialog.confirmReorganizeScoped": "【智能重组确认 · 零数据丢失保护】\n\n当前策略：{scopeLabel}\n• 预计整理书签：{eligible} 条\n• 已安全保护（不移动）：{protected} 条\n• 未命中规则的普通书签：{uncatAction}\n\n执行前会自动创建全量 Netscape HTML 快照并记录原子位移日志，随时可一键原位回滚。\n\n确认按此策略执行？",
      "dashboard.uncatActionMove": "按主域名归入「{uncatFolder}」",
      "dashboard.uncatActionKeep": "保持原位不移动",

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
      "dashboard.paymentNote": "支持信用卡、PayPal、Apple Pay 全球合规即时结算 (Gumroad 官方收银)",
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

      // Paywall & Growth Funnel (P0-1)
      "paywall.badgeTitle": "BHM-PRO 深度诊断分析",
      "paywall.headlineDynamic": "已揪出 {deadCount} 个失效死链与 {dupCount} 个冗余书签，散落在 {folderCount} 个杂乱目录中。",
      "paywall.subheadlinePain": "手动逐一核对并归档这 {totalCount} 个书签预计将消耗您 {savedMinutes} 分钟的宝贵开发时间，且极易误删需登录鉴权的云端协同文档（Auth-Gated Cloud Docs）。",
      "paywall.valueAnchor": "BHM-PRO 已为您在本地沙箱构建好【时光机原子级安全快照】与【16 大云与开发者生态树】，只需 0.8 秒即可无损完成重构。",
      "paywall.tier30dTitle": "30天深层大扫除通行卡",
      "paywall.tier30dPrice": "$4.90",
      "paywall.tier30dDesc": "适合一次性集中清理与目录重构 · 含30天时光机无限回滚",
      "paywall.tierLifetimeBadge": "87% 开发者首选 · 早鸟限时特惠",
      "paywall.tierLifetimeTitle": "PRO 终身买断授权 (Lifetime)",
      "paywall.tierLifetimePrice": "$14.90",
      "paywall.tierLifetimeOriginal": "$29.00",
      "paywall.tierLifetimeDesc": "一次付清，永久买断 · 零订阅负担 · 支持 3 台个人浏览器 Ed25519 离线激活 · 永久时光机快照",
      "paywall.ctaLifetime": "立即 $14.90 终身解锁（省下 {savedMinutes} 分钟）",
      "paywall.cta30d": "仅需单次清理？$4.90 开通 30 天卡",
      "paywall.tierTeamTitle": "🏢 5 席位团队版 (5-Seat Team Pack)",
      "paywall.tierTeamDesc": "5 枚独立离线 Ed25519 密钥 · 支持公司 VAT 发票报销",
      "paywall.ctaTeam": "团队版 $39 →",
      "paywall.trustFooter": "🔒 100% 本地沙箱运行 · 零隐私上传 · Gumroad 官方安全收银（支持 Apple Pay / PayPal / 信用卡）· 激活码秒发",
      "paywall.inlineRedeemPrompt": "已获得 Ed25519 授权码？点击粘贴立即离线激活",
      "paywall.inlineLicensePlaceholder": "粘贴 BHM1.eyJ... 授权密钥",
      "paywall.inlineActivateBtn": "立即激活",
      "paywall.viralFreeTrial": "还没准备好升级？下载极客诊断战报，立即获赠 50 条死链清理额度",
      "paywall.viralUnlockBtn": "免费领取",
      "paywall.closeBtn": "稍后决定",

      // Viral Health Report (P1-1)
      "viral.btnGenerate": "📊 生成书签资产体检战报",
      "viral.generating": "正在渲染高精诊断战报...",
      "viral.cardTitle": "书签数字资产体检战报",
      "viral.rankArchaeologist": "赛博废墟考古学家",
      "viral.rankHoarder": "松鼠症晚期数字囤积者",
      "viral.rankArchitect": "硬核云原生架构师",
      "viral.rankGuardian": "零熵增秩序守护者",
      "viral.downloadSuccessToast": "🎉 诊断战报已下载！已在本地为您解锁 50 条死链自动清理体验额度！",

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
      "popup.upgradePro": "👑 Upgrade to Pro ($4.90+ Early Bird)",
      "popup.proActive": "👑 Pro License Active",
      "popup.tierActive": "{tier} Active",
      "popup.openSidePanel": "Open Side Panel",
      "popup.openDashboard": "Open Full Dashboard",

      // Sidepanel
      "sidepanel.brand": "BHM Companion",
      "sidepanel.bookmarkCurrent": "⭐ Bookmark Tab",
      "sidepanel.bookmarkCurrentTitle": "Bookmark currently active browser tab",
      "sidepanel.bookmarked": "✅ Saved",
      "sidepanel.cantBookmarkSystem": "Cannot bookmark internal browser system pages",
      "sidepanel.cantReadTab": "Unable to read this tab URL (internal browser page, or click the extension icon first to grant activeTab access).",
      "sidepanel.bookmarkFailed": "Bookmark failed: {msg}",
      "sidepanel.refresh": "🔄 Refresh",
      "sidepanel.refreshTitle": "Manually refresh bookmark tree",
      "sidepanel.fullDashboard": "📊 Dashboard",
      "sidepanel.upgradeBtn": "Upgrade Pro",
      "sidepanel.footerUpgrade": "👑 Upgrade Pro ($4.90+)",
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
      "sidepanel.washQuotaExceeded": "30-Day Wash Pass quota limit reached. Upgrade to Lifetime Pro in Dashboard for unlimited cleaning.",

      // Dashboard Header & Tabs
      "dashboard.title": "Bookmark Health Master (BHM-PRO)",
      "dashboard.versionBadge": "Manifest V3 Production",
      "dashboard.subtitle": "Native bookmark dead link cleaner, 16 tech titans organizer & Time Machine safety baseline",
      "dashboard.nativeReady": "Chrome Native Ready",
      "dashboard.headerUpgrade": "Upgrade to Pro ($4.90+)",
      "dashboard.headerProLifetime": "Pro Lifetime Active",
      "dashboard.headerProWash": "30-Day Wash Active",
      "dashboard.tabHealth": "🩺 Health & Dead Links",
      "dashboard.tabDuplicates": "🔁 Duplicates",
      "dashboard.tabEcosystems": "🏛️ 16 Titans Ecosystems",
      "dashboard.tabSnapshots": "⏱️ Time Machine & Rollback",
      "dashboard.tabPro": "💎 Upgrade Pro / Privileges",
      "dashboard.earlyBirdTag": "Early Bird",
      "dashboard.healthBannerTitle": "🌟 Upgrade to BHM-PRO: Unlock Unlimited Batch Cleaning & 16 Titans Clustering",
      "dashboard.healthBannerDesc": "Free edition is limited to 10 bookmarks. Upgrade to enjoy unlimited quarantine, Cloudflare DoH anti-false-positive verification & millisecond in-place rollback.",
      "dashboard.healthBannerBtnText": "Upgrade Now ($4.90+)",
      "dashboard.healthBannerRedeem": "Enter License",
      "dashboard.lookupLicenseLink": "Reinstall OS or lost key? Self-service license lookup here",

      // Dashboard TAB 1 (Health)
      "dashboard.statTotal": "Total Bookmarks",
      "dashboard.statTotalDesc": "Read directly from native Chrome",
      "dashboard.statHealth": "Health Score",
      "dashboard.statHealthNotScanned": "Not inspected (Click start below)",
      "dashboard.statHealthExcellent": "Excellent · Few broken links",
      "dashboard.statHealthGood": "Good · Periodic cleaning recommended",
      "dashboard.statHealthPoor": "Sub-healthy · Multiple dead links or timeouts",
      "dashboard.statDead": "Dead / Broken Links",
      "dashboard.statDeadDesc": "404 / 410 / NXDOMAIN",
      "dashboard.statEco": "16 Titans Products",
      "dashboard.statEcoDesc": "Ready for structured grouping",
      "dashboard.probeCardTitle": "Two-Stage Adaptive Dead Link Health Probe",
      "dashboard.probeCardDesc": "HEAD probe + Range GET fallback with WAF/auth & intranet shielding to prevent false positives",
      "dashboard.dohDisclosure": "🔒 Privacy Disclosure: Runs 100% locally with credentials omitted (zero cookies). Only on connection timeout does it query Cloudflare DoH (cloudflare-dns.com) with the bare hostname (no path or query) to verify NXDOMAIN.",
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
      "dashboard.scanSummaryStats": "Probed {total} · {dead} dead · {review} review · {redirect} redirected",
      "dashboard.clickToScan": "Click \"Start Full Scan\" above to initiate deep health detection",
      "dashboard.filterAll": "All ({count})",
      "dashboard.filterDead": "Dead Links ({count})",
      "dashboard.filterReview": "🛡️ Safety Review ({count})",
      "dashboard.filterRedirect": "Redirected ({count})",
      "dashboard.filterHealthy": "Healthy ({count})",
      "dashboard.noFilterMatches": "No matching bookmarks in this category",
      "dashboard.visitBtn": "Visit",
      "dashboard.quarantineBtn": "Quarantine",
      "dashboard.untitledBookmark": "Untitled Bookmark",
      "dashboard.deadBadge": "Dead / Unresolved",
      "dashboard.reviewBadge": "🛡️ Safety Review",
      "dashboard.internalBadge": "🛡️ Intranet Protected",
      "dashboard.dangerousBadge": "🛡️ Action URL Shielded",
      "dashboard.serverErrorBadge": "⚠️ Server Error ({code})",
      "dashboard.skippedBadge": "Skipped",
      "dashboard.redirectBadge": "Redirected",
      "dashboard.authRedirectBadge": "🛡️ Auth / Login Redirect",
      "dashboard.healthyBadge": "Healthy 200 OK",
      "dashboard.redirectTarget": "↳ Target: {url}",

      // Prober localized reasons
      "probe.reason.INVALID_URL": "Invalid URL format (skipped)",
      "probe.reason.NON_HTTP": "Non-HTTP/HTTPS bookmark scheme (skipped)",
      "probe.reason.INTRANET_PROTECTED": "🛡️ Intranet / local network bookmark (auto-shielded)",
      "probe.reason.DANGEROUS_ACTION": "🛡️ Sensitive action URL (logout/unsubscribe/token) auto-shielded",
      "probe.reason.WAF_OR_AUTH": "Protected by auth wall or WAF challenge (HTTP {code}) — site is alive, kept safe",
      "probe.reason.HTTP_404": "Page not found (404 Not Found)",
      "probe.reason.HTTP_410": "Resource permanently removed (410 Gone)",
      "probe.reason.SERVER_ERROR": "Temporary upstream server error (HTTP {code}) — re-check later",
      "probe.reason.DNS_NXDOMAIN": "Domain no longer exists (confirmed via DNS NXDOMAIN)",
      "probe.reason.NETWORK_TIMEOUT": "Request timed out or restricted network — DNS resolves, placed in safety review",
      "probe.reason.UNKNOWN_PROTECTED": "Unknown response status — kept safe in review",

      // Dashboard Duplicates MVP
      "dashboard.dupBannerTitle": "Exact Duplicate Bookmark Detector & Lossless Cleaner",
      "dashboard.dupBannerDesc": "Uses full normalized URLs (preserving query params & hash fragments to avoid false merges). Keeps the earliest copy and safely moves duplicates to quarantine with atomic Time-Machine undo.",
      "dashboard.cleanDupsBtn": "🗑️ Quarantine All Duplicates ({count})",
      "dashboard.cleanDupsBtnZero": "✅ No Duplicates Found",
      "dashboard.noDuplicates": "🎉 Clean library! Zero duplicate bookmark URLs detected.",
      "dashboard.dupGroupCount": "{groups} duplicate groups · {count} redundant copies ready to quarantine",
      "dashboard.dupKeepBadge": "✓ Keep (Earliest)",
      "dashboard.dupCopyBadge": "Duplicate",
      "dashboard.journalDuplicates": "🔁 Duplicate Bookmarks Cleanup Transaction",
      "dialog.confirmCleanDups": "【Zero-Data-Loss Deduplication】\n\nWill keep the earliest copy of each duplicate URL and safely move {count} redundant copies into \"{folder}\".\n\nA full Netscape HTML snapshot and Move Journal will be recorded for 1-click atomic rollback.\n\nProceed?",
      "toast.dupQuarantineSuccess": "🎉 Quarantined {count} duplicate bookmarks! Undo anytime in Time Machine.",
      "toast.dupQuarantinePartial": "Quarantined {moved} duplicates; {skipped} remaining due to tier quota limits.",
      "snapshot.batchDuplicates": "Pre-deduplication full snapshot ({count} duplicates)",

      // Dashboard TAB 2 (Ecosystems & Protection v2.2)
      "dashboard.ecoBannerTitle": "Smart Organizer Matrix: Custom Rules + 16 Titans + Folder Locks",
      "dashboard.ecoBannerDesc": "Defaults to organizing loose root bookmarks only—never breaks your existing folders. Lock protected folders or add custom personal domain rules anytime.",
      "dashboard.reorganizeEcoBtn": "⚡ Reorganize With Current Policy",
      "dashboard.bookmarksMatched": "{count} bookmarks matched",
      "dashboard.noEcoInLibrary": "No matched bookmarks in current scope",
      "dashboard.andMoreEco": "...and {count} more bookmarks",
      "dashboard.ecoCardFooter": "Authoritative domain & console clustering",
      "dashboard.customRuleCardFooter": "Personal custom rule · Direct Bookmarks Bar folder",
      "dashboard.customRuleBadge": "✨ Custom Rule",
      "dashboard.nativeReadyTag": "✓ Native Ready",
      "dashboard.reorgControlTitle": "🛡️ Reorganization Scope & Folder Protection",
      "dashboard.reorgScopeLabel": "Organization Scope",
      "dashboard.scopeLooseOnly": "🟢 Loose Root Bookmarks Only (Recommended Default · Keeps All User Folders Intact)",
      "dashboard.scopeTitansOnly": "🟡 Custom Rules + 16 Titans Only (Skips Locked Folders · Leaves Regular Sites In Place)",
      "dashboard.scopeFullLibrary": "🔴 Full Library Restructure (Skips Locked Folders · Buckets Uncategorized By Domain)",
      "dashboard.includeUncatLabel": "Move unmatched regular bookmarks into \"Uncategorized (By Domain)\" folder",
      "dashboard.reorgPreviewStats": "Will organize {eligible} items (Custom {custom} · Ecosystems/Docs {eco} · Uncategorized {uncat}) · Protected & untouched: {protected}",
      "dashboard.protectedFoldersTitle": "🔒 Protected Folders Whitelist (Click to lock — 100% skipped during reorganization)",
      "dashboard.protectedFoldersEmpty": "No custom user folders detected yet (all bookmarks are at root level)",
      "dashboard.protectedFoldersHint": "Tip: In \"Loose Root Bookmarks Only\" mode, all existing user folders are automatically protected. Locks also apply when switching to broader modes.",
      "dashboard.customRulesTitle": "✨ Personal Custom Domain Rules (Highest Priority — Runs Before 16 Titans)",
      "dashboard.customRuleFolderPlaceholder": "Target folder name (e.g. My Self-Hosted)",
      "dashboard.customRuleDomainsPlaceholder": "Domains, comma-separated (e.g. geoscore.help, *.pages.dev)",
      "dashboard.addCustomRuleBtn": "+ Add Rule",
      "dashboard.customRulesEmpty": "No custom rules yet. Add your own domains so scattered self-hosted/project links route straight into your chosen folder.",
      "dashboard.deleteRuleBtn": "Remove",
      "toast.customRuleInvalid": "Please enter a target folder name and at least one valid domain (e.g. geoscore.help)",
      "toast.customRuleAdded": "Added custom rule \"{folder}\" (active immediately)",
      "toast.customRuleDeleted": "Custom rule removed",
      "toast.reorganizeAlreadySorted": "All matching bookmarks are already in their target folders.",
      "dialog.confirmReorganizeScoped": "【Smart Reorganization Confirmation · Zero-Data-Loss】\n\nPolicy: {scopeLabel}\n• Bookmarks in scope: {eligible}\n• Protected & untouched: {protected}\n• Unmatched regular bookmarks: {uncatAction}\n\nA full Netscape HTML snapshot and atomic Move Journal will be saved first for 1-click in-place rollback.\n\nProceed?",
      "dashboard.uncatActionMove": "Bucket by domain into \"{uncatFolder}\"",
      "dashboard.uncatActionKeep": "Keep in original folders",

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
      "dashboard.paymentNote": "Supports Credit Card, PayPal, Apple Pay (Secured by Gumroad)",
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

      // Paywall & Growth Funnel (P0-1)
      "paywall.badgeTitle": "BHM-PRO Deep Diagnostic Analysis",
      "paywall.headlineDynamic": "Detected {deadCount} Dead Links & {dupCount} Duplicates buried across {folderCount} cluttered folders.",
      "paywall.subheadlinePain": "Manually verifying and sorting these {totalCount} bookmarks will cost you ~{savedMinutes} minutes of deep-work time—with a high risk of accidentally deleting Auth-Gated Cloud Docs.",
      "paywall.valueAnchor": "BHM-PRO has staged an Atomic Time-Machine Snapshot and your 16 Cloud & Dev Ecosystems tree locally. Clean and restructure everything losslessly in 0.8 seconds.",
      "paywall.tier30dTitle": "30-Day Deep Clean Pass",
      "paywall.tier30dPrice": "$4.90",
      "paywall.tier30dDesc": "Perfect for a one-off overhaul · Unlimited Time-Machine rollbacks for 30 days",
      "paywall.tierLifetimeBadge": "CHOSEN BY 87% OF DEVELOPERS · EARLY BIRD",
      "paywall.tierLifetimeTitle": "PRO Lifetime License",
      "paywall.tierLifetimePrice": "$14.90",
      "paywall.tierLifetimeOriginal": "$29.00",
      "paywall.tierLifetimeDesc": "Pay once, own forever · Zero subscriptions · Offline Ed25519 key for 3 personal browsers · Forever Time-Machine",
      "paywall.ctaLifetime": "Unlock Lifetime PRO for $14.90 (Save {savedMinutes} Mins)",
      "paywall.cta30d": "Just need a quick cleanup? Get 30-Day Pass ($4.90)",
      "paywall.tierTeamTitle": "🏢 5-Seat Team Pack ($39)",
      "paywall.tierTeamDesc": "5 independent offline Ed25519 keys • Instant VAT invoice",
      "paywall.ctaTeam": "Team Pack $39 →",
      "paywall.trustFooter": "🔒 100% Local Sandbox · Zero Telemetry · Secured by Gumroad (Apple Pay / PayPal / Cards) · Instant Ed25519 Key",
      "paywall.inlineRedeemPrompt": "Already have an Ed25519 license key? Paste here to activate offline",
      "paywall.inlineLicensePlaceholder": "Paste BHM1.eyJ... license key",
      "paywall.inlineActivateBtn": "Activate",
      "paywall.viralFreeTrial": "Not ready to upgrade? Download Health Report to unlock 50 dead links trial quota",
      "paywall.viralUnlockBtn": "Claim Free",
      "paywall.closeBtn": "Decide Later",

      // Viral Health Report (P1-1)
      "viral.btnGenerate": "📊 Generate Digital Asset Health Report",
      "viral.generating": "Rendering high-precision report...",
      "viral.cardTitle": "Bookmark Digital Asset Health Report",
      "viral.rankArchaeologist": "Digital Ruin Archaeologist",
      "viral.rankHoarder": "Grandmaster Hoarder",
      "viral.rankArchitect": "Cloud-Native Architect",
      "viral.rankGuardian": "Zero-Entropy Guardian",
      "viral.downloadSuccessToast": "🎉 Health Report downloaded! 50 dead-link batch cleanup quota unlocked locally!",

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
