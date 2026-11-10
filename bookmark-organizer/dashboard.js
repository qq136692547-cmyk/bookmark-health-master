// ============================================================================
// Bookmark Health Master (BHM-PRO) 全景大盘核心交互引擎
// ============================================================================

// P0-A & P1-2: 系统排除与跨语言等价文件夹常量
const BHM_TRASH_TITLES = new Set([
  "🗑️ Dead Links Quarantine (BHM)",
  "🗑️ 待清理死链回收站 (BHM)",
  "🗑️ [书签体检] 待清理死链回收站"
]);
const BHM_MAIN_ECO_TITLES = new Set([
  "【Official Tech Titans Ecosystems】",
  "【官方全生态总书签】"
]);
const BHM_UNCAT_TITLES = new Set([
  "📁 Uncategorized (By Domain)",
  "📁 未分类 (按主域名建夹)"
]);
const BHM_UGC_TITLES = new Set([
  "📄 Docs & Knowledge Base",
  "📄 协同文档与云端知识库 (Docs & Knowledge Base)"
]);
const BHM_SNAPSHOT_PREFIXES = [
  "🕰️ [快照恢复]",
  "🕰️ [Snapshot Restore]"
];

// 辅助函数：读写 chrome.storage.local 中的 bhm_system_folders
async function getSystemFolders() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["bhm_system_folders"], (res) => {
        resolve(res?.bhm_system_folders || {});
      });
    });
  }
  try {
    return JSON.parse(localStorage.getItem("bhm_system_folders") || "{}");
  } catch (e) {
    return {};
  }
}

async function updateSystemFolders(patch) {
  const current = await getSystemFolders();
  const updated = { ...current, ...patch };
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    await new Promise((resolve) => {
      chrome.storage.local.set({ bhm_system_folders: updated }, resolve);
    });
  } else {
    try {
      localStorage.setItem("bhm_system_folders", JSON.stringify(updated));
    } catch (e) {}
  }
  return updated;
}

/**
 * 从 Chrome 书签树读取所有有效活跃书签（P0-A: 排除死链回收站与快照恢复子树，杜绝复吸回流）
 * @returns {Promise<{ tree: any[], bookmarks: any[] }>}
 */
async function loadActiveBookmarksFromChrome() {
  const sysFolders = await getSystemFolders();
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      const flat = [];
      function traverse(nodes) {
        for (const n of nodes) {
          if (!n.url) {
            const isExcluded = (sysFolders.trashId && n.id === sysFolders.trashId) ||
              BHM_TRASH_TITLES.has(n.title) ||
              (typeof n.title === "string" && BHM_SNAPSHOT_PREFIXES.some((p) => n.title.startsWith(p)));
            if (isExcluded) {
              continue;
            }
          }
          if (n.url) {
            flat.push({
              id: n.id,
              title: n.title || n.url,
              url: n.url,
              parentId: n.parentId,
              index: typeof n.index === "number" ? n.index : 0,
              dateAdded: n.dateAdded
            });
          }
          if (n.children) traverse(n.children);
        }
      }
      traverse(tree);
      resolve({ tree, bookmarks: flat });
    });
  });
}

/**
 * 在 Chrome 原生书签树中执行 16 大生态 + UGC + 主域名归拢（P0-C 返回真实成功/失败统计 + P1-2 跨语言目录复用）
 */
async function reorganizeBookmarksInChrome(data, options = {}) {
  const {
    safetyManagerInstance = null,
    SafetyManagerClass = (typeof SafetyManager !== "undefined" ? SafetyManager : null),
    EcosystemClassifierClass = (typeof EcosystemClassifier !== "undefined" ? EcosystemClassifier : null),
    i18n = (typeof BHM_I18N !== "undefined" ? BHM_I18N : null),
    throttleMs = 50
  } = options;

  const groups = data.ecosystemGroups || {};
  const domainMap = {};

  if (data.uncategorizedGroup && data.uncategorizedGroup.subcategories) {
    for (const domain of Object.keys(data.uncategorizedGroup.subcategories)) {
      const sub = data.uncategorizedGroup.subcategories[domain];
      if (sub && sub.items && sub.items.length > 0) {
        domainMap[domain] = sub.items.slice();
      }
    }
  }

  if (Array.isArray(data.nonEcosystemItems)) {
    for (const item of data.nonEcosystemItems) {
      const domain = (EcosystemClassifierClass && EcosystemClassifierClass.extractMainDomain)
        ? EcosystemClassifierClass.extractMainDomain(item.url)
        : (item.classification?.mainDomain || "unknown");
      if (!domainMap[domain]) {
        domainMap[domain] = [];
      }
      if (!domainMap[domain].some((existing) => existing.id === item.id)) {
        domainMap[domain].push(item);
      }
    }
  }

  const targetIdSet = new Set();
  for (const ecoId of Object.keys(groups)) {
    if (ecoId === "uncategorized") continue;
    const group = groups[ecoId];
    if (!group || group.totalCount === 0) continue;
    for (const subId of Object.keys(group.subcategories || {})) {
      const sub = group.subcategories[subId];
      if (sub && sub.items) {
        for (const item of sub.items) {
          targetIdSet.add(item.id);
        }
      }
    }
  }

  for (const domain of Object.keys(domainMap)) {
    for (const item of domainMap[domain]) {
      targetIdSet.add(item.id);
    }
  }

  const allTargetIds = Array.from(targetIdSet);
  const capturedMoves = SafetyManagerClass ? await SafetyManagerClass.captureMoves(allTargetIds) : [];
  const capMap = new Map((capturedMoves || []).map((c) => [c.id, c]));

  async function getOrCreateFolder(parentId, title, index = undefined, aliasSet = null, preferredId = null) {
    const children = await new Promise((res) => {
      if (chrome.bookmarks.getChildren) {
        chrome.bookmarks.getChildren(parentId, (kids) => {
          if (chrome.runtime && chrome.runtime.lastError) return res([]);
          res(kids || []);
        });
      } else {
        res([]);
      }
    });
    const existing = (children || []).find((c) => {
      if (c.url) return false;
      if (preferredId && c.id === preferredId) return true;
      if (c.title === title) return true;
      if (aliasSet && aliasSet.has(c.title)) return true;
      return false;
    });
    if (existing) {
      return { folder: existing, created: false };
    }
    const createArg = { parentId, title };
    if (typeof index === "number") createArg.index = index;
    const newFolder = await new Promise((res) => {
      chrome.bookmarks.create(createArg, (created) => {
        res(created);
      });
    });
    return { folder: newFolder, created: true };
  }

  const sysFolders = await getSystemFolders();
  const createdFolderIds = [];

  const rootTitle = i18n ? i18n.t("folder.mainEco") : "【Official Tech Titans Ecosystems】";
  const { folder: mainEcoFolder, created: rootCreated } = await getOrCreateFolder("1", rootTitle, 0, BHM_MAIN_ECO_TITLES, sysFolders.mainEcoId);
  if (rootCreated && mainEcoFolder?.id) {
    createdFolderIds.push(mainEcoFolder.id);
    sysFolders.mainEcoId = mainEcoFolder.id;
    await updateSystemFolders({ mainEcoId: mainEcoFolder.id });
  } else if (mainEcoFolder?.id && mainEcoFolder.id !== sysFolders.mainEcoId) {
    sysFolders.mainEcoId = mainEcoFolder.id;
    await updateSystemFolders({ mainEcoId: mainEcoFolder.id });
  }

  const moveOperations = [];

  for (const ecoId of Object.keys(groups)) {
    if (ecoId === "uncategorized") continue;
    const group = groups[ecoId];
    if (!group || group.totalCount === 0) continue;

    let parentFolderId = mainEcoFolder.id;
    if (ecoId === "ugc_docs" || group.meta.isUgcContainer) {
      const ugcTitle = group.meta.folderName || (i18n ? i18n.t("folder.ugcDocs") : "📄 Docs & Knowledge Base");
      const { folder: ugcFolder, created: ugcCreated } = await getOrCreateFolder("1", ugcTitle, undefined, BHM_UGC_TITLES, sysFolders.ugcId);
      if (ugcCreated && ugcFolder?.id) {
        createdFolderIds.push(ugcFolder.id);
        sysFolders.ugcId = ugcFolder.id;
        await updateSystemFolders({ ugcId: ugcFolder.id });
      } else if (ugcFolder?.id && ugcFolder.id !== sysFolders.ugcId) {
        sysFolders.ugcId = ugcFolder.id;
        await updateSystemFolders({ ugcId: ugcFolder.id });
      }
      parentFolderId = ugcFolder.id;
    } else {
      const ecoFolderTitle = group.meta.folderName;
      const ecoAliases = new Set([group.meta.folderName, group.meta.zhFolderName, group.meta.enFolderName].filter(Boolean));
      const { folder: ecoFolder, created: ecoCreated } = await getOrCreateFolder(mainEcoFolder.id, ecoFolderTitle, undefined, ecoAliases);
      if (ecoCreated && ecoFolder?.id) createdFolderIds.push(ecoFolder.id);
      parentFolderId = ecoFolder.id;
    }

    for (const subId of Object.keys(group.subcategories || {})) {
      const sub = group.subcategories[subId];
      if (!sub || sub.items.length === 0) continue;

      const subAliases = new Set([sub.meta.name, sub.meta.zhName, sub.meta.enName].filter(Boolean));
      const { folder: subFolder, created: subCreated } = await getOrCreateFolder(parentFolderId, sub.meta.name, undefined, subAliases);
      if (subCreated && subFolder?.id) createdFolderIds.push(subFolder.id);

      for (const item of sub.items) {
        if (item.parentId === subFolder.id) continue;
        moveOperations.push({
          item,
          targetParentId: subFolder.id
        });
      }
    }
  }

  const domainKeys = Object.keys(domainMap);
  if (domainKeys.length > 0) {
    const uncatCategoryTitle = i18n ? i18n.t("folder.uncat") : "📁 Uncategorized (By Domain)";
    const { folder: uncatFolder, created: uncatCreated } = await getOrCreateFolder("1", uncatCategoryTitle, undefined, BHM_UNCAT_TITLES, sysFolders.uncatId);
    if (uncatCreated && uncatFolder?.id) {
      createdFolderIds.push(uncatFolder.id);
      sysFolders.uncatId = uncatFolder.id;
      await updateSystemFolders({ uncatId: uncatFolder.id });
    } else if (uncatFolder?.id && uncatFolder.id !== sysFolders.uncatId) {
      sysFolders.uncatId = uncatFolder.id;
      await updateSystemFolders({ uncatId: uncatFolder.id });
    }

    for (const domain of domainKeys) {
      const domainItems = domainMap[domain];
      if (!domainItems || domainItems.length === 0) continue;

      const { folder: domainFolder, created: domainCreated } = await getOrCreateFolder(uncatFolder.id, domain);
      if (domainCreated && domainFolder?.id) createdFolderIds.push(domainFolder.id);

      for (const item of domainItems) {
        if (item.parentId === domainFolder.id) continue;
        moveOperations.push({
          item,
          targetParentId: domainFolder.id
        });
      }
    }
  }

  const moves = [];
  for (let i = 0; i < moveOperations.length; i++) {
    const { item, targetParentId } = moveOperations[i];
    const cap = capMap.get(item.id);
    moves.push({
      id: item.id,
      title: item.title,
      url: item.url,
      oldParentId: cap?.oldParentId ?? item.parentId,
      oldIndex: typeof cap?.oldIndex === "number" ? cap.oldIndex : (typeof item.index === "number" ? item.index : 0),
      prevSiblingId: cap?.prevSiblingId ?? null,
      nextSiblingId: cap?.nextSiblingId ?? null,
      oldChildren: cap?.oldChildren ?? [],
      state: "pending",
      newParentId: targetParentId,
      newIndex: i
    });
  }

  if (moves.length > 0 && safetyManagerInstance) {
    await safetyManagerInstance.recordJournal("ECOSYSTEM_REORGANIZE", moves, createdFolderIds);
  }

  let movedCount = 0;
  const failedItems = [];
  for (const op of moveOperations) {
    const res = await SafetyManagerClass.moveBookmarkWithThrottling(op.item.id, { parentId: op.targetParentId }, throttleMs);
    if (res && res.success === false) {
      failedItems.push({ id: op.item.id, title: op.item.title, error: res.error });
    } else {
      movedCount++;
    }
  }

  return { aborted: false, movedCount, failedCount: failedItems.length, failedItems, createdFolderIds };
}

if (typeof document !== "undefined" && document.addEventListener) {
document.addEventListener("DOMContentLoaded", async () => {
  // 初始化轻量零依赖双语引擎
  if (typeof BHM_I18N !== "undefined") {
    await BHM_I18N.init();
  }

  // DOM 元素引用
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabContents = document.querySelectorAll(".tab-content");

  const statTotalBm = document.getElementById("statTotalBm");
  const statHealthScore = document.getElementById("statHealthScore");
  const statHealthDesc = document.getElementById("statHealthDesc");
  const statDeadCount = document.getElementById("statDeadCount");
  const statEcoCount = document.getElementById("statEcoCount");

  const startScanBtn = document.getElementById("startScanBtn");
  const stopScanBtn = document.getElementById("stopScanBtn");
  const cleanDeadBtn = document.getElementById("cleanDeadBtn");
  const scanProgressBox = document.getElementById("scanProgressBox");
  const scanProgressBar = document.getElementById("scanProgressBar");
  const scanProgressText = document.getElementById("scanProgressText");
  const scanPercentText = document.getElementById("scanPercentText");
  const scanResultSummary = document.getElementById("scanResultSummary");
  const deadListContainer = document.getElementById("deadListContainer");
  const filterChips = document.querySelectorAll(".filter-chip");

  const ecosystemsGrid = document.getElementById("ecosystemsGrid");
  const reorganizeEcoBtn = document.getElementById("reorganizeEcoBtn");

  const snapshotList = document.getElementById("snapshotList");
  const manualSnapshotBtn = document.getElementById("manualSnapshotBtn");

  const licenseKeyInput = document.getElementById("licenseKeyInput");
  const activateLicenseBtn = document.getElementById("activateLicenseBtn");
  const licenseStatusText = document.getElementById("licenseStatusText");
  const toastContainer = document.getElementById("toastContainer");
  const langToggleBtn = document.getElementById("langToggleBtn");

  // 绑定官方商业化结算 URL
  if (typeof LicenseManager !== "undefined" && LicenseManager.CHECKOUT_URLS) {
    const buySingle = document.getElementById("buySingleWashLink");
    if (buySingle && LicenseManager.CHECKOUT_URLS.SINGLE_WASH) {
      buySingle.href = LicenseManager.CHECKOUT_URLS.SINGLE_WASH;
    }
    const buyLtd = document.getElementById("buyLtdLink");
    if (buyLtd && LicenseManager.CHECKOUT_URLS.LTD) {
      buyLtd.href = LicenseManager.CHECKOUT_URLS.LTD;
    }
  }

  // 初始化引擎模块
  const safetyManager = new (window.SafetyManager || (typeof SafetyManager !== "undefined" ? SafetyManager : null))();
  const rules = (window.ECOSYSTEM_RULES || (typeof ECOSYSTEM_RULES !== "undefined" ? ECOSYSTEM_RULES : []));
  let classifier = new (window.EcosystemClassifier || (typeof EcosystemClassifier !== "undefined" ? EcosystemClassifier : null))(
    rules,
    { lang: typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() : "en" }
  );

  // 内部状态
  let fullTree = [];
  let allBookmarks = [];
  let probeResults = [];
  let classifiedData = null;
  let currentFilter = "all";
  let isPro = false;
  let activeProber = null;
  let isBusyTask = false;
  let proTier = "FREE";
  let lastScore = 100;

  // 语言切换按钮绑定
  if (langToggleBtn && typeof BHM_I18N !== "undefined") {
    langToggleBtn.addEventListener("click", async () => {
      await BHM_I18N.toggleLang();
    });
  }

  // 页面关闭保护：体检或批量位移期间禁止静默中断
  window.addEventListener("beforeunload", (e) => {
    if (isBusyTask) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // 停止体检按钮
  if (stopScanBtn) {
    stopScanBtn.addEventListener("click", () => {
      if (activeProber) {
        activeProber.abort();
        const msg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.scanAborted") : "Scan aborted. Compiling results so far...";
        showToast(msg, "info");
        stopScanBtn.disabled = true;
        stopScanBtn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.stopping") : "Stopping...";
      }
    });
  }

  // P1 快照前实时刷新 fullTree 辅助函数
  async function refreshFullTree() {
    if (typeof chrome !== "undefined" && chrome.bookmarks && chrome.bookmarks.getTree) {
      fullTree = await new Promise((resolve) => {
        chrome.bookmarks.getTree((tree) => resolve(tree || []));
      });
      return fullTree;
    }
    return fullTree;
  }

  // 检查 Pro 授权状态
  async function checkProStatus() {
    if (typeof LicenseManager !== "undefined" && LicenseManager.checkProStatus) {
      const status = await LicenseManager.checkProStatus();
      isPro = !!status.isPro;
      proTier = status.tier || (isPro ? "LTD" : "FREE");

      let storedKey = null;
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        storedKey = await new Promise((resolve) => {
          chrome.storage.local.get(["bhm_license_key"], (res) => resolve(res ? res.bhm_license_key : null));
        });
      } else if (typeof localStorage !== "undefined") {
        storedKey = localStorage.getItem("bhm_license_key");
      }

      updateProUI(isPro, storedKey, proTier, status.tierName);
      return isPro;
    }

    isPro = false;
    proTier = "FREE";
    updateProUI(false, null, "FREE");
    return false;
  }

  function updateProUI(active, key, tier = "LTD", tierName = null) {
    const isEn = typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() === "en" : true;
    let resolvedName = tierName;
    if (!resolvedName) {
      if (tier === "SINGLE_WASH") {
        resolvedName = isEn ? "30-Day Full Wash Pass ($9.90)" : "30天全量大扫除卡 ($9.90)";
      } else {
        resolvedName = isEn ? "Pro Lifetime Buyout ($24.90)" : "Pro 终身买断授权 ($24.90)";
      }
    }

    if (active) {
      if (licenseStatusText) {
        const activeBadgeText = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.licenseActiveBadge", { tier: resolvedName })
          : `👑 ${resolvedName} Active`;
        const keyMaskedText = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.licenseKeyMasked", { key: key ? key.slice(0, 10) + "••••••••" : "BHM-PRO-ACTIVE" })
          : `Key: ${key ? key.slice(0, 10) + "••••••••" : "BHM-PRO-ACTIVE"}`;

        licenseStatusText.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold">
            ${activeBadgeText}
          </span>
          <span class="text-xs text-slate-400 ml-2 font-mono">${keyMaskedText}</span>
        `;
      }
      if (licenseKeyInput) {
        licenseKeyInput.value = key || "BHM1.LIFETIME.AUTHORIZED";
        licenseKeyInput.disabled = true;
      }
      if (activateLicenseBtn) {
        activateLicenseBtn.textContent = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.deactivateBtn")
          : "Activated (Revoke)";
        activateLicenseBtn.className = "px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition border border-slate-700";
      }
    } else {
      if (licenseStatusText) {
        licenseStatusText.textContent = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.licenseHelpText")
          : "Enter the BHM1... license key from your purchase email (offline Ed25519 signature verification).";
      }
      if (licenseKeyInput) {
        licenseKeyInput.disabled = false;
        licenseKeyInput.value = "";
      }
      if (activateLicenseBtn) {
        activateLicenseBtn.textContent = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.activateBtn")
          : "Activate License";
        activateLicenseBtn.className = "px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition";
      }
    }
  }

  // Toast 浮动提示
  function showToast(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    const colors = {
      success: "bg-emerald-950/90 border-emerald-500/50 text-emerald-200",
      error: "bg-red-950/90 border-red-500/50 text-red-200",
      info: "bg-slate-900/90 border-blue-500/50 text-blue-200",
      warning: "bg-amber-950/90 border-amber-500/50 text-amber-200"
    };
    const icons = {
      success: "✅",
      error: "❌",
      info: "ℹ️",
      warning: "⚠️"
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-xs font-medium transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto ${colors[type] || colors.info}`;
    toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-4", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("translate-y-4", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 导航 Tab 切换
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-target");
      navTabs.forEach((t) => {
        t.className = "nav-tab px-4 py-2 rounded-lg text-xs font-medium bg-slate-800/60 text-slate-400 hover:text-white";
      });
      tab.className = "nav-tab px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white";

      tabContents.forEach((c) => {
        if (c.id === targetId) {
          c.classList.remove("hidden");
        } else {
          c.classList.add("hidden");
        }
      });
    });
  });

  // 读取所有书签 (P0-A: 彻底排除死链回收站与快照恢复子树，杜绝复吸回流)
  async function loadBookmarks() {
    if (typeof chrome !== "undefined" && chrome.bookmarks && chrome.bookmarks.getTree) {
      const { tree, bookmarks } = await loadActiveBookmarksFromChrome();
      fullTree = tree;
      return bookmarks;
    } else {
      // 离线/预览丰富测试数据集
      fullTree = [
        {
          id: "1",
          title: "书签栏",
          children: [
            { id: "101", title: "Google Cloud 控制台", url: "https://cloud.google.com" },
            { id: "102", title: "Google Gemini 官方入口", url: "https://gemini.google.com" },
            { id: "103", title: "Google AI Studio", url: "https://aistudio.google.com" },
            { id: "104", title: "Google Docs 文档", url: "https://docs.google.com" },
            { id: "105", title: "华为 HarmonyOS 开发者官网", url: "https://developer.huawei.com/consumer/cn/harmonyos/" },
            { id: "106", title: "华为云控制台", url: "https://console.huaweicloud.com" },
            { id: "107", title: "华为花瓣搜索 Petal Search", url: "https://petalsearch.com" },
            { id: "108", title: "GitHub 官方主站", url: "https://github.com" },
            { id: "109", title: "Microsoft Azure 管理中心", url: "https://azure.microsoft.com" },
            { id: "110", title: "Microsoft Learn 文档库", url: "https://learn.microsoft.com" },
            { id: "111", title: "Apple Developer 开发者中心", url: "https://developer.apple.com" },
            { id: "112", title: "Apple iCloud 云服务", url: "https://www.icloud.com" },
            { id: "113", title: "腾讯混元大模型", url: "https://hunyuan.tencent.com/" },
            { id: "114", title: "腾讯云控制台", url: "https://cloud.tencent.com" },
            { id: "115", title: "微信支付商户平台", url: "https://pay.weixin.qq.com" },
            { id: "116", title: "阿里云百炼大模型平台", url: "https://bailian.console.aliyun.com" },
            { id: "117", title: "阿里云管理控制台", url: "https://aliyun.com" },
            { id: "118", title: "淘宝开放平台", url: "https://open.taobao.com" },
            { id: "119", title: "字节跳动巨量引擎", url: "https://oceanengine.com" },
            { id: "120", title: "字节火山引擎控制台", url: "https://volcengine.com" },
            { id: "121", title: "剪映小云雀 AI 助手", url: "https://xyq.jianying.com/" },
            { id: "122", title: "AWS 云计算管理控制台", url: "https://console.aws.amazon.com" },
            { id: "123", title: "亚马逊全球卖家后台", url: "https://sellercentral.amazon.com" },
            { id: "124", title: "Meta 开放平台与开发者", url: "https://developers.facebook.com" },
            { id: "125", title: "Meta AI 官方入口", url: "https://meta.ai" },
            { id: "126", title: "ChatGPT 官方消费级入口", url: "https://chatgpt.com" },
            { id: "127", title: "OpenAI Platform 开发者平台", url: "https://platform.openai.com" },
            { id: "128", title: "NVIDIA Developer 开发者中心", url: "https://developer.nvidia.com" },
            { id: "129", title: "NVIDIA NGC 算力容器云", url: "https://ngc.nvidia.com" },
            { id: "130", title: "百度智能云控制台", url: "https://cloud.baidu.com" },
            { id: "131", title: "文心一言 AI 助手", url: "https://yiyan.baidu.com" },
            { id: "132", title: "小米澎湃OS 开发者官网", url: "https://dev.mi.com" },
            { id: "133", title: "米家 IoT 物联网开放平台", url: "https://iot.mi.com" },
            { id: "134", title: "Claude 对话助手核心入口", url: "https://claude.ai" },
            { id: "135", title: "Anthropic Console 开发者控制台", url: "https://console.anthropic.com" },
            { id: "136", title: "Cloudflare 全局管理控制台", url: "https://dash.cloudflare.com" },
            { id: "137", title: "京东云技术底座控制台", url: "https://console.jdcloud.com" },
            { id: "138", title: "已失效的旧服务器文档", url: "https://expired-api-old-server.org/404-doc" },
            { id: "139", title: "测试死链 - 无效域名", url: "http://example-dead-test-link-999.xyz/notfound" },
            { id: "140", title: "HTTP 301 旧地址迁移测试", url: "http://github.com" },
            { id: "141", title: "Stack Overflow 开发者社区", url: "https://stackoverflow.com" },
            { id: "142", title: "MDN Web Docs 技术文档", url: "https://developer.mozilla.org" }
          ]
        }
      ];

      const flat = [];
      let mockIdx = 0;
      function traverseMock(nodes) {
        for (const n of nodes) {
          if (!n.url) {
            const isExcluded = (sysFolders.trashId && n.id === sysFolders.trashId) ||
              BHM_TRASH_TITLES.has(n.title) ||
              (typeof n.title === "string" && BHM_SNAPSHOT_PREFIXES.some((p) => n.title.startsWith(p)));
            if (isExcluded) {
              continue;
            }
          }
          if (n.url) {
            flat.push({
              id: n.id,
              title: n.title,
              url: n.url,
              parentId: n.parentId || "1",
              index: typeof n.index === "number" ? n.index : mockIdx++
            });
          }
          if (n.children) traverseMock(n.children);
        }
      }
      traverseMock(fullTree);
      return flat;
    }
  }

  // 刷新综合健康评分描述文本
  function updateHealthScoreDesc(score) {
    if (!statHealthDesc) return;
    if (probeResults.length === 0) {
      statHealthDesc.textContent = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.statHealthNotScanned")
        : "Not inspected (Click start below)";
      return;
    }

    if (score >= 90) {
      statHealthScore.className = "text-2xl font-bold text-emerald-400 mt-1";
      statHealthDesc.textContent = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.statHealthExcellent")
        : "Excellent · Few broken links";
      statHealthDesc.className = "text-[10px] text-emerald-300 mt-1";
    } else if (score >= 75) {
      statHealthScore.className = "text-2xl font-bold text-amber-400 mt-1";
      statHealthDesc.textContent = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.statHealthGood")
        : "Good · Periodic cleaning recommended";
      statHealthDesc.className = "text-[10px] text-amber-300 mt-1";
    } else {
      statHealthScore.className = "text-2xl font-bold text-red-400 mt-1";
      statHealthDesc.textContent = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.statHealthPoor")
        : "Sub-healthy · Multiple dead links or timeouts";
      statHealthDesc.className = "text-[10px] text-red-300 mt-1";
    }
  }

  // 初始化大盘指标
  async function initDashboard() {
    await checkProStatus();
    allBookmarks = await loadBookmarks();

    // 更新总书签数
    statTotalBm.textContent = allBookmarks.length.toLocaleString();

    // 运行 16 大官方生态分析
    classifiedData = classifier.classifyAll(allBookmarks);
    statEcoCount.textContent = classifiedData.totalEcosystemCount.toLocaleString();

    // 渲染 16 大生态矩阵网格
    renderEcosystemsGrid(classifiedData);

    // 渲染快照历史与事务日志
    await renderSnapshots();
  }

  // 监听多语言切换事件
  window.addEventListener("bhm:langchange", async (e) => {
    const lang = (e && e.detail && e.detail.lang) || (typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() : "en");
    classifier = new (window.EcosystemClassifier || (typeof EcosystemClassifier !== "undefined" ? EcosystemClassifier : null))(rules, { lang });
    if (allBookmarks.length > 0) {
      classifiedData = classifier.classifyAll(allBookmarks);
    }
    renderEcosystemsGrid(classifiedData);
    updateHealthScoreDesc(lastScore);
    renderDeadList();
    await renderSnapshots();
    await checkProStatus();
  });

  await initDashboard();

  // ==========================================================================
  // TAB 1: 书签健康体检与死链探测
  // ==========================================================================

  startScanBtn.addEventListener("click", async () => {
    if (startScanBtn.disabled) return;

    if (typeof chrome !== "undefined" && chrome.permissions && chrome.permissions.request) {
      const hasPerm = await new Promise(r => chrome.permissions.contains({ origins: ["*://*/*"] }, r));
      if (!hasPerm) {
        const granted = await new Promise(r => chrome.permissions.request({ origins: ["*://*/*"] }, r));
        if (!granted) {
          const msg = typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("toast.hostPermDenied")
            : "⚠️ Host permission (*://*/*) not granted. Deep HTTP diagnostic probing and header stripping cannot run; scan aborted.";
          showToast(msg, "warning");
          return;
        }
      }
    }

    // P1: 使用 Web Locks API (ifAvailable: true) 防多窗口重复并发扫描挂起
    if (typeof navigator !== "undefined" && navigator.locks && navigator.locks.request) {
      await navigator.locks.request("bhm_probe_lock", { ifAvailable: true }, async (lock) => {
        if (!lock) {
          const lockMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.scanConcurrencyLock") : "⚠️ Another window is performing bookmark health inspection. Concurrent scan prevented.";
          showToast(lockMsg, "warning");
          return;
        }
        await executeScan();
      });
    } else {
      await executeScan();
    }
  });

  async function executeScan() {
    isBusyTask = true;
    startScanBtn.disabled = true;
    startScanBtn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.scanning") : "⚡ Scanning concurrently...";
    scanProgressBox.classList.remove("hidden");
    cleanDeadBtn.classList.add("hidden");
    if (stopScanBtn) {
      stopScanBtn.classList.remove("hidden");
      stopScanBtn.disabled = false;
      stopScanBtn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.stopScan") : "⏹️ Stop Scan";
    }

    // 1. 提取所有合法公网 HTTP/HTTPS 主机名去重数组，联动 DNR 规则放行 HEAD/GET
    const domainSet = new Set();
    for (const bm of allBookmarks) {
      if (bm.url && /^https?:\/\//i.test(bm.url)) {
        try {
          const u = new URL(bm.url);
          if (u.hostname && !u.hostname.includes("localhost") && !u.hostname.endsWith(".local") && !u.hostname.endsWith(".internal")) {
            domainSet.add(u.hostname);
          }
        } catch (e) {}
      }
    }
    const domains = Array.from(domainSet);

    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "BHM_INSTALL_PROBE_RULE", payload: { domains } }, () => {
            if (chrome.runtime && chrome.runtime.lastError) {}
            resolve();
          });
        });
      } catch (e) {}
    }

    try {
      let lastCheckpoint = 0;
      const prober = new (window.BookmarkProber || (typeof BookmarkProber !== "undefined" ? BookmarkProber : null))({
        concurrency: 6,
        timeoutMs: 5000,
        onProgress: (completed, total, current) => {
          const percent = Math.round((completed / total) * 100);
          scanProgressBar.style.width = `${percent}%`;
          const currentTitle = (current.title || current.url || "").slice(0, 32);
          scanProgressText.textContent = typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("dashboard.probingItem", { title: currentTitle })
            : `Probing: ${currentTitle}...`;
          scanPercentText.textContent = `${percent}% (${completed}/${total})`;

          if (completed - lastCheckpoint >= 25 || completed === total) {
            lastCheckpoint = completed;
            if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
              try {
                chrome.runtime.sendMessage({
                  type: "BHM_SAVE_SCAN_CHECKPOINT",
                  payload: { completed, total, timestamp: Date.now() }
                }, () => {
                  if (chrome.runtime && chrome.runtime.lastError) {}
                });
              } catch (e) {}
            }
          }
        }
      });

      activeProber = prober;
      probeResults = await prober.probeAll(allBookmarks);

      // 计算综合健康分
      const score = (window.BookmarkProber || BookmarkProber).calculateHealthScore(probeResults);
      lastScore = score;
      statHealthScore.textContent = `${score} / 100`;
      updateHealthScoreDesc(score);

      const deadItems = probeResults.filter((r) => r.status === "DEAD");
      const reviewItems = probeResults.filter((r) => r.status === "UNREACHABLE_OR_PROTECTED" || r.status === "SKIPPED_INTERNAL");
      const redirectItems = probeResults.filter((r) => r.status === "HEALTHY" && r.redirectedUrl);
      const healthyItems = probeResults.filter((r) => r.status === "HEALTHY" && !r.redirectedUrl);

      statDeadCount.textContent = deadItems.length.toLocaleString();

      updateFilterCounts(probeResults.length, deadItems.length, reviewItems.length, redirectItems.length, healthyItems.length);
      renderDeadList();

      if (deadItems.length > 0) {
        cleanDeadBtn.classList.remove("hidden");
        cleanDeadBtn.textContent = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.cleanDeadBtn", { count: deadItems.length })
          : `🗑️ Quarantine ${deadItems.length} Dead Links`;
      }

      scanProgressText.textContent = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.probeComplete", { count: probeResults.length })
        : `Inspection complete! Probed ${probeResults.length} bookmarks`;

      const completedToast = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("toast.scanCompleted", { score, dead: deadItems.length, review: reviewItems.length })
        : `Health scan complete! Score: ${score}/100. Found ${deadItems.length} dead links, ${reviewItems.length} placed in safety review.`;

      showToast(completedToast, deadItems.length > 0 ? "warning" : "success");
    } catch (err) {
      const errMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.scanError", { msg: err.message }) : ("Exception during health inspection: " + err.message);
      showToast(errMsg, "error");
    } finally {
      activeProber = null;
      isBusyTask = false;
      startScanBtn.disabled = false;
      startScanBtn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.rescan") : "🔄 Re-scan Library";
      if (stopScanBtn) {
        stopScanBtn.classList.add("hidden");
        stopScanBtn.disabled = false;
        stopScanBtn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.stopScan") : "⏹️ Stop Scan";
      }

      // 卸载 DNR 放行规则并清理 checkpoint
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({ type: "BHM_UNINSTALL_PROBE_RULE" }, () => {
            if (chrome.runtime && chrome.runtime.lastError) {}
          });
          chrome.runtime.sendMessage({ type: "BHM_CLEAR_SCAN_CHECKPOINT" }, () => {
            if (chrome.runtime && chrome.runtime.lastError) {}
          });
        } catch (e) {}
      }
    }
  }

  function updateFilterCounts(all, dead, review, redirect, healthy) {
    filterChips.forEach((chip) => {
      const filter = chip.getAttribute("data-filter");
      if (filter === "all") chip.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.filterAll", { count: all }) : `All (${all})`;
      if (filter === "dead") chip.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.filterDead", { count: dead }) : `Dead Links (${dead})`;
      if (filter === "review") chip.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.filterReview", { count: review }) : `🛡️ Safety Review (${review})`;
      if (filter === "redirect") chip.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.filterRedirect", { count: redirect }) : `301 Redirect (${redirect})`;
      if (filter === "healthy") chip.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.filterHealthy", { count: healthy }) : `Healthy (${healthy})`;
    });
  }

  // 筛选事件绑定
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => {
        c.className = "filter-chip px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800 text-slate-400 hover:text-white";
      });
      chip.className = "filter-chip px-2.5 py-1 rounded text-[11px] font-medium bg-blue-600 text-white";
      currentFilter = chip.getAttribute("data-filter");
      renderDeadList();
    });
  });

  // 渲染死链与结果清单
  function renderDeadList() {
    if (!probeResults || probeResults.length === 0) {
      const clickMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.clickToScan") : "Click \"Start Full Scan\" above to initiate deep health detection";
      deadListContainer.innerHTML = `
        <div class="p-8 text-center text-slate-500 text-xs">
          ${clickMsg}
        </div>
      `;
      return;
    }

    let filtered = probeResults;
    if (currentFilter === "dead") {
      filtered = probeResults.filter((r) => r.status === "DEAD");
    } else if (currentFilter === "review") {
      filtered = probeResults.filter((r) => r.status === "UNREACHABLE_OR_PROTECTED" || r.status === "SKIPPED_INTERNAL");
    } else if (currentFilter === "redirect") {
      filtered = probeResults.filter((r) => r.status === "HEALTHY" && r.redirectedUrl);
    } else if (currentFilter === "healthy") {
      filtered = probeResults.filter((r) => r.status === "HEALTHY" && !r.redirectedUrl);
    }

    if (filtered.length === 0) {
      const noFilterMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.noFilterMatches") : "No matching bookmarks in this category";
      deadListContainer.innerHTML = `
        <div class="p-8 text-center text-slate-500 text-xs">
          ${noFilterMsg}
        </div>
      `;
      return;
    }

    const visitLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.visitBtn") : "Visit";
    const quarantineLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.quarantineBtn") : "Quarantine";
    const untitledText = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.untitledBookmark") : "Untitled Bookmark";

    deadListContainer.innerHTML = filtered.map((item) => {
      let badge = "";
      if (item.status === "DEAD") {
        const deadTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.deadBadge") : "Dead / Unresolved";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">${item.httpCode ? `HTTP ${item.httpCode}` : deadTxt}</span>`;
      } else if (item.status === "UNREACHABLE_OR_PROTECTED") {
        const revTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.reviewBadge") : "🛡️ Safety Review";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">${revTxt}</span>`;
      } else if (item.status === "SKIPPED_INTERNAL") {
        const intTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.internalBadge") : "🛡️ Intranet Protected";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${intTxt}</span>`;
      } else if (item.redirectedUrl) {
        const redirTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.redirectBadge") : "301 Redirect";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">${redirTxt}</span>`;
      } else if (item.status === "CHALLENGE") {
        const cfTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.cfBadge") : "CF Anti-Bot Challenge";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">${cfTxt}</span>`;
      } else {
        const healthyTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.healthyBadge") : "Healthy 200 OK";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${healthyTxt}</span>`;
      }

      const isHttpUrl = /^https?:\/\//i.test(item.url || "");
      const safeHref = isHttpUrl ? escapeHtml(item.url) : "#";
      const linkTarget = isHttpUrl ? `target="_blank" rel="noopener noreferrer"` : "";
      const targetHint = item.redirectedUrl
        ? (typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.redirectTarget", { url: item.redirectedUrl }) : `↳ Target: ${item.redirectedUrl}`)
        : "";

      return `
        <div class="p-3.5 hover:bg-slate-800/40 transition flex items-center justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-white truncate">${escapeHtml(item.title || untitledText)}</span>
              ${badge}
            </div>
            <div class="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
              ${escapeHtml(item.url)}
            </div>
            ${item.redirectedUrl ? `<div class="text-[10px] text-blue-400/80 truncate mt-0.5">${escapeHtml(targetHint)}</div>` : ""}
            ${item.reason ? `<div class="text-[10px] text-red-400/80 truncate mt-0.5">${escapeHtml(item.reason)}</div>` : ""}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <a href="${safeHref}" ${linkTarget} title="${escapeHtml(item.url || "")}" class="px-2.5 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition">${visitLabel}</a>
            ${item.status === "DEAD" ? `<button class="single-quarantine-btn px-2.5 py-1 rounded text-[11px] bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 transition" data-id="${item.id}">${quarantineLabel}</button>` : ""}
          </div>
        </div>
      `;
    }).join("");

    // EXT-10: 采用单条事件委托优化死链隔离列表，杜绝上千个 DOM 监听器性能损耗
    if (!deadListContainer._hasDelegated) {
      deadListContainer._hasDelegated = true;
      deadListContainer.addEventListener("click", async (e) => {
        const btn = e.target.closest(".single-quarantine-btn");
        if (btn) {
          const id = btn.getAttribute("data-id");
          if (id) await quarantineSingleBookmark(id);
        }
      });
    }
  }

  // 单条隔离 (P1-7: 快照标题使用 i18n)
  async function quarantineSingleBookmark(bmId) {
    const item = allBookmarks.find((b) => b.id === bmId);
    if (!item) return;

    await refreshFullTree();
    const snapLabel = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("snapshot.singleQuarantine", { title: item.title })
      : `Single dead link quarantine: ${item.title}`;
    await safetyManager.createSnapshot(fullTree, snapLabel);
    const res = await moveToTrashFolder([item]);
    if (res && res.movedCount > 0) {
      const okMsg = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("toast.singleQuarantineSuccess", { title: item.title })
        : `Moved "${item.title}" to dead links quarantine.`;
      showToast(okMsg, "success");
      probeResults = probeResults.filter((r) => r.id !== bmId);
      allBookmarks = allBookmarks.filter((b) => b.id !== bmId);
      statDeadCount.textContent = probeResults.filter((r) => r.status === "DEAD").length.toString();
      renderDeadList();
      await renderSnapshots();
    } else {
      const failMsg = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("toast.singleQuarantineFailed", { title: item.title })
        : `Failed to move "${item.title}" (quota reached or move error).`;
      showToast(failMsg, "error");
    }
  }

  // 一键隔离失效死链至回收站
  cleanDeadBtn.addEventListener("click", async () => {
    const deadItems = probeResults.filter((r) => r.status === "DEAD");
    if (deadItems.length === 0) {
      const noDeadMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.noDeadLinks") : "No broken dead links detected to clean.";
      showToast(noDeadMsg, "info");
      return;
    }

    const trashFolderName = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("folder.trash")
      : "🗑️ Dead Links Quarantine (BHM)";

    const confirmTpl = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("dialog.confirmCleanDead", { count: deadItems.length, folder: trashFolderName })
      : `About to quarantine ${deadItems.length} dead links into "${trashFolderName}". Proceed?`;

    const confirmed = confirm(confirmTpl);
    if (!confirmed) return;

    // 1. 自动全量快照备份 (P1-7: 快照标题使用 i18n)
    await refreshFullTree();
    const batchSnapLabel = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("snapshot.batchQuarantine", { count: deadItems.length })
      : `Dead links batch quarantine snapshot (${deadItems.length} items)`;
    const snapshot = await safetyManager.createSnapshot(fullTree, batchSnapLabel);

    // 2. 移入回收站并获得真实处理统计
    const moveRes = await moveToTrashFolder(deadItems);
    const { movedCount = 0, movedIds = [], skippedCount = 0, skippedItems = [] } = moveRes || {};

    // 3. 仅从 probeResults 和 allBookmarks 中剔除真实成功移动的 movedIds
    const movedIdSet = new Set(movedIds);
    probeResults = probeResults.filter((r) => !movedIdSet.has(r.id));
    allBookmarks = allBookmarks.filter((b) => !movedIdSet.has(b.id));

    statTotalBm.textContent = allBookmarks.length.toLocaleString();

    const remainingDead = probeResults.filter((r) => r.status === "DEAD").length;
    statDeadCount.textContent = remainingDead.toString();

    if (remainingDead === 0) {
      cleanDeadBtn.classList.add("hidden");
    } else {
      cleanDeadBtn.classList.remove("hidden");
    }

    renderDeadList();
    await renderSnapshots();

    if (skippedCount > 0) {
      const partMsg = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("toast.quarantinePartial", { moved: movedCount, skipped: skippedCount })
        : `Quarantined ${movedCount} dead links. ${skippedCount} remaining due to tier quota limits.`;
      showToast(partMsg, "warning");
    } else {
      const succMsg = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("toast.quarantineSuccess", { count: movedCount })
        : `Successfully quarantined ${movedCount} broken dead links! Full snapshot archived.`;
      showToast(succMsg, "success");
    }
  });

  // 移至回收站核心方法 (P1-9 授权重验 + P1-7 双语配额 + P1-2 文件夹跨语言复用)
  async function moveToTrashFolder(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return { movedCount: 0, movedIds: [], movedItems: [], skippedCount: 0, skippedItems: [] };
    }

    // 1. 动态复核授权阶梯与过期状态 (P1-9)
    if (typeof LicenseManager !== "undefined" && LicenseManager.checkProStatus) {
      const live = await LicenseManager.checkProStatus();
      isPro = !!live.isPro;
      proTier = live.tier || (isPro ? "LTD" : "FREE");
      updateProUI(isPro, null, proTier, live.tierName);
    }

    let maxAllowed = items.length;
    if (proTier === "LTD" || proTier === "PRO") {
      maxAllowed = items.length;
    } else if (proTier === "SINGLE_WASH") {
      let remainingQuota = 500;
      if (typeof LicenseManager !== "undefined" && LicenseManager.getRemainingQuota) {
        remainingQuota = await LicenseManager.getRemainingQuota("SINGLE_WASH");
      }
      maxAllowed = Math.min(items.length, Math.max(0, remainingQuota));
      if (items.length > maxAllowed) {
        const washMsg = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("toast.washQuotaLimit", { quota: maxAllowed })
          : `30-Day Wash Pass remaining quota: ${maxAllowed} items. Excess items retained in list.`;
        showToast(washMsg, "warning");
      }
    } else {
      // FREE
      let remainingQuota = 10;
      if (typeof LicenseManager !== "undefined" && LicenseManager.getRemainingQuota) {
        remainingQuota = await LicenseManager.getRemainingQuota("FREE");
      }
      maxAllowed = Math.min(items.length, Math.max(0, remainingQuota));
      if (items.length > maxAllowed) {
        const freeMsg = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("toast.freeQuotaLimit", { quota: maxAllowed })
          : `Free edition remaining quota: ${maxAllowed} items. Excess items retained; upgrade to Pro for unlimited cleaning.`;
        showToast(freeMsg, "warning");
      }
    }

    const itemsToMove = items.slice(0, maxAllowed);
    const quotaSkipped = items.slice(maxAllowed);

    if (itemsToMove.length === 0) {
      return {
        movedCount: 0,
        movedIds: [],
        movedItems: [],
        skippedCount: items.length,
        skippedItems: items.slice()
      };
    }

    const trashFolderName = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("folder.trash")
      : "🗑️ Dead Links Quarantine (BHM)";

    if (typeof chrome !== "undefined" && chrome.bookmarks && chrome.bookmarks.create) {
      const capturedMoves = await SafetyManager.captureMoves(itemsToMove.map(x => x.id));
      const capMap = new Map((capturedMoves || []).map(c => [c.id, c]));
      const sysFolders = await getSystemFolders();

      return new Promise((resolve) => {
        chrome.bookmarks.getTree(async (tree) => {
          let trashNode = null;
          function findTrash(nodes) {
            for (const n of nodes) {
              if (!n.url) {
                if ((sysFolders.trashId && n.id === sysFolders.trashId) || BHM_TRASH_TITLES.has(n.title)) {
                  trashNode = n;
                  return;
                }
              }
              if (n.children) findTrash(n.children);
            }
          }
          findTrash(tree);

          const proceedMove = async (trashId, createdFolderId = null) => {
            const moves = itemsToMove.map((item, idx) => {
              const cap = capMap.get(item.id);
              return {
                id: item.id,
                title: item.title,
                url: item.url,
                oldParentId: cap?.oldParentId ?? item.parentId,
                oldIndex: typeof cap?.oldIndex === "number" ? cap.oldIndex : (typeof item.index === "number" ? item.index : idx),
                prevSiblingId: cap?.prevSiblingId ?? null,
                nextSiblingId: cap?.nextSiblingId ?? null,
                oldChildren: cap?.oldChildren ?? (item.parentId ? [item.id] : []),
                state: "pending",
                newParentId: trashId,
                newIndex: idx
              };
            });

            const createdFolderIds = createdFolderId ? [createdFolderId] : [];
            await safetyManager.recordJournal("QUARANTINE_DEAD", moves, createdFolderIds);

            const actuallyMoved = [];
            const moveFailed = [];

            for (const item of itemsToMove) {
              const res = await SafetyManager.moveBookmarkWithThrottling(item.id, { parentId: trashId }, 50);
              if (res && res.success === false) {
                moveFailed.push(item);
              } else {
                actuallyMoved.push(item);
              }
            }

            if (actuallyMoved.length > 0 && typeof LicenseManager !== "undefined" && LicenseManager.consumeQuota) {
              await LicenseManager.consumeQuota(actuallyMoved.length);
            }

            const allSkipped = quotaSkipped.concat(moveFailed);
            resolve({
              movedCount: actuallyMoved.length,
              movedIds: actuallyMoved.map((m) => m.id),
              movedItems: actuallyMoved,
              skippedCount: allSkipped.length,
              skippedItems: allSkipped
            });
          };

          if (trashNode) {
            if (trashNode.id !== sysFolders.trashId) {
              await updateSystemFolders({ trashId: trashNode.id });
            }
            await proceedMove(trashNode.id);
          } else {
            chrome.bookmarks.create({ parentId: "1", title: trashFolderName }, async (created) => {
              if (created?.id) {
                await updateSystemFolders({ trashId: created.id });
              }
              await proceedMove(created.id, created.id);
            });
          }
        });
      });
    } else {
      await new Promise((r) => setTimeout(r, 200));
      if (typeof LicenseManager !== "undefined" && LicenseManager.consumeQuota) {
        await LicenseManager.consumeQuota(itemsToMove.length);
      }
      return {
        movedCount: itemsToMove.length,
        movedIds: itemsToMove.map((m) => m.id),
        movedItems: itemsToMove,
        skippedCount: quotaSkipped.length,
        skippedItems: quotaSkipped
      };
    }
  }

  // ==========================================================================
  // TAB 2: 16 大全球与中国科技巨头官方全生态归拢矩阵
  // ==========================================================================

  function renderEcosystemsGrid(data) {
    if (!data || !data.ecosystemGroups) return;
    const groups = data.ecosystemGroups;
    const isEn = typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() === "en" : true;

    ecosystemsGrid.innerHTML = Object.keys(groups).map((ecoId) => {
      const eco = groups[ecoId];
      const meta = eco.meta;
      const count = eco.totalCount;

      const subTags = Object.keys(eco.subcategories).map((subId) => {
        const sub = eco.subcategories[subId];
        const subCount = sub.items.length;
        if (subCount === 0) return "";
        const subDisplayName = isEn ? (sub.meta.enName || sub.meta.name) : sub.meta.name;
        return `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60">
            <span>${subDisplayName}</span>
            <span class="text-blue-400 font-bold">${subCount}</span>
          </span>
        `;
      }).filter(Boolean).join("");

      let sampleList = [];
      for (const subId of Object.keys(eco.subcategories)) {
        sampleList.push(...eco.subcategories[subId].items);
      }
      const previewList = sampleList.slice(0, 3);

      const matchedLabel = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.bookmarksMatched", { count })
        : `${count} bookmarks matched`;

      const noEcoInLib = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.noEcoInLibrary")
        : "No official products found in library yet";

      const andMoreLabel = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.andMoreEco", { count: sampleList.length - 3 })
        : `...and ${sampleList.length - 3} more official bookmarks`;

      const cardFooter = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.ecoCardFooter")
        : "Authoritative domain & console clustering";

      const nativeTag = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.nativeReadyTag")
        : "✓ Native Ready";

      const titleName = isEn ? (meta.enName || meta.name) : meta.name;
      const subtitleName = isEn ? (meta.name !== meta.enName ? meta.name : "") : (meta.enName || "");

      return `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">${meta.icon}</span>
                <div>
                  <h4 class="text-xs font-bold text-white">${titleName}</h4>
                  ${subtitleName ? `<div class="text-[10px] text-slate-400">${subtitleName}</div>` : ""}
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${count > 0 ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-slate-800 text-slate-500"}">
                ${matchedLabel}
              </span>
            </div>

            <div class="flex flex-wrap gap-1.5 mt-3">
              ${subTags || `<span class="text-[10px] text-slate-500">${noEcoInLib}</span>`}
            </div>

            ${previewList.length > 0 ? `
              <div class="mt-3 space-y-1.5 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                ${previewList.map((bm) => `
                  <div class="flex items-center justify-between text-[11px] truncate">
                    <span class="text-slate-300 truncate max-w-[200px]">${escapeHtml(bm.title || bm.url)}</span>
                    <span class="text-[9px] text-slate-500 font-mono">${escapeHtml(bm.classification.matchedDomain || "")}</span>
                  </div>
                `).join("")}
                ${sampleList.length > 3 ? `<div class="text-[10px] text-slate-500 text-right">${andMoreLabel}</div>` : ""}
              </div>
            ` : ""}
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-400">
            <span>${cardFooter}</span>
            <span class="text-emerald-400 font-medium">${nativeTag}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // 一键在 Chrome 中重组全生态总书签 (P0-C: 前置权限核验 + 返回值真实捕获与上报 + P1-7 双语快照标题)
  reorganizeEcoBtn.addEventListener("click", async () => {
    // 动态复核授权状态
    if (typeof LicenseManager !== "undefined" && LicenseManager.checkProStatus) {
      const st = await LicenseManager.checkProStatus();
      isPro = !!st.isPro;
      proTier = st.tier || (isPro ? "LTD" : "FREE");
    }

    const canReorganize = (typeof LicenseManager !== "undefined" && LicenseManager.canExecuteAction)
      ? LicenseManager.canExecuteAction("ECOSYSTEM_REORGANIZE", proTier)
      : isPro;

    if (!canReorganize) {
      const proReq = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("toast.reorganizeProRequired")
        : "Physical Titans reorganization & domain bucketing is a Pro Lifetime feature. Please unlock in Pro tab.";
      showToast(proReq, "warning");
      return;
    }

    const ecoCount = classifiedData ? (classifiedData.totalEcosystemCount || 0) : 0;
    const nonEcoCount = classifiedData ? (classifiedData.totalUncategorizedCount || (classifiedData.nonEcosystemItems ? classifiedData.nonEcosystemItems.length : 0)) : 0;
    if (!classifiedData || (ecoCount === 0 && nonEcoCount === 0)) {
      const noReorgMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.noReorganizeItems") : "No bookmarks detected for reorganization.";
      showToast(noReorgMsg, "info");
      return;
    }

    const mainFolder = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("folder.mainEco") : "【Official Tech Titans Ecosystems】";
    const uncatFolder = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("folder.uncat") : "📁 Uncategorized (By Domain)";

    const confirmMsg = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("dialog.confirmReorganize", { mainFolder, uncatFolder })
      : `Will create "${mainFolder}" for the 16 Tech Titans, and "${uncatFolder}" for other bookmarks by domain. Proceed?`;

    const confirmed = confirm(confirmMsg);
    if (!confirmed) return;

    // 1. 创建备份快照 (P1-7: 快照标题使用 i18n)
    await refreshFullTree();
    const reorgSnapLabel = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("snapshot.beforeReorganize")
      : "Full bookmark ecosystem and domain reorganization snapshot";
    await safetyManager.createSnapshot(fullTree, reorgSnapLabel);

    // 2. 执行 Chrome 原生书签重组并接住真实统计 (P0-C)
    const reorgRes = await reorganizeInChrome(classifiedData);
    if (!reorgRes || reorgRes.aborted) return;

    // 3. 刷新书签并重绘
    allBookmarks = await loadBookmarks();
    statTotalBm.textContent = allBookmarks.length.toLocaleString();
    classifiedData = classifier.classifyAll(allBookmarks);
    statEcoCount.textContent = classifiedData.totalEcosystemCount.toLocaleString();
    renderEcosystemsGrid(classifiedData);
    await renderSnapshots();

    if (reorgRes.failedCount > 0) {
      showToast(
        typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("toast.reorganizePartial", { moved: reorgRes.movedCount, failed: reorgRes.failedCount })
          : `Ecosystem reorganization moved ${reorgRes.movedCount} bookmarks, ${reorgRes.failedCount} failed.`,
        "warning"
      );
    } else {
      showToast(
        typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("toast.reorganizeSuccess", { count: reorgRes.movedCount })
          : `🎉 Successfully reorganized ${reorgRes.movedCount} bookmarks! 0 orphan bookmarks.`,
        "success"
      );
    }
  });

  async function reorganizeInChrome(data) {
    const canReorganize = (typeof LicenseManager !== "undefined" && LicenseManager.canExecuteAction)
      ? LicenseManager.canExecuteAction("ECOSYSTEM_REORGANIZE", proTier)
      : isPro;

    if (!canReorganize) {
      const proReq = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("toast.reorganizeProRequired")
        : "Physical Titans reorganization & domain bucketing is a Pro Lifetime feature. Please unlock in Pro tab.";
      showToast(proReq, "warning");
      return { aborted: true, movedCount: 0, failedCount: 0, failedItems: [] };
    }

    if (typeof chrome === "undefined" || !chrome.bookmarks || !chrome.bookmarks.create) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { aborted: false, movedCount: 0, failedCount: 0, failedItems: [] };
    }

    return reorganizeBookmarksInChrome(data, {
      safetyManagerInstance: safetyManager,
      SafetyManagerClass: SafetyManager,
      EcosystemClassifierClass: typeof EcosystemClassifier !== "undefined" ? EcosystemClassifier : null,
      i18n: typeof BHM_I18N !== "undefined" ? BHM_I18N : null,
      throttleMs: 50
    });
  }

  // ==========================================================================
  // TAB 3: 时光机快照与增量位移事务原位回滚
  // ==========================================================================

  const journalList = document.getElementById("journalList");

  async function renderSnapshots() {
    // 1. 渲染增量位移事务日志 (Move Journals)
    if (journalList) {
      const journals = await new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(["bhm_journals"], (res) => resolve(res.bhm_journals || []));
        } else {
          resolve(JSON.parse(localStorage.getItem("bhm_journals") || "[]"));
        }
      });

      if (!journals || journals.length === 0) {
        const noJournalsMsg = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.noJournals")
          : "No transaction journals recorded yet. Executed actions will be logged automatically.";
        journalList.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs">${noJournalsMsg}</div>`;
      } else {
        const typeLabels = {
          QUARANTINE_DEAD: typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.journalQuarantine") : "Dead Links Quarantine Transaction",
          ECOSYSTEM_REORGANIZE: typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.journalReorganize") : "16 Titans Reorganization Transaction"
        };
        const genericLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.journalGeneric") : "Bookmark Move Transaction";
        const partialLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.journalPartialBadge") : "Partially Complete · Retryable";
        const rollbackBtnLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.journalRollbackBtn") : "🔄 Undo (In-Place)";

        journalList.innerHTML = journals.map((j) => {
          const isPartial = j.partial === true || j.status === "PARTIAL";
          const partialBadge = isPartial
            ? `<span class="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">${partialLabel}</span>`
            : "";
          const movesLabel = typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("dashboard.journalMovesCount", { count: j.count })
            : `${j.count} moves`;
          const metaLabel = typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("dashboard.journalMeta", { date: j.dateString })
            : `${j.dateString} · Original parent and order preserved`;

          return `
            <div class="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition">
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-white">${typeLabels[j.actionType] || genericLabel}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">${movesLabel}</span>
                  ${partialBadge}
                </div>
                <div class="text-[11px] text-slate-400 font-mono">${metaLabel}</div>
              </div>
              <button class="rollback-journal-btn px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm" data-id="${j.id}">
                ${rollbackBtnLabel}
              </button>
            </div>
          `;
        }).join("");

        // 绑定原位回滚事件
        journalList.querySelectorAll(".rollback-journal-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const jid = btn.getAttribute("data-id");
            const targetJ = journals.find((x) => x.id === jid);
            if (!targetJ) return;

            const confirmMsg = typeof BHM_I18N !== "undefined"
              ? BHM_I18N.t("dialog.confirmRollbackJournal", { count: targetJ.count })
              : `Restore ${targetJ.count} moved bookmarks back to their exact original parent folder and index? Proceed?`;

            const confirmed = confirm(confirmMsg);
            if (!confirmed) return;

            btn.disabled = true;
            btn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.journalRollingBack") : "Restoring in-place...";

            try {
              // EXT-03: 显式传入 delayMs = 30 毫秒串行微批节流，杜绝冲击 Chromium Sync 管道
              const res = await safetyManager.rollbackJournal(jid, null, 30);
              if (res && res.success) {
                // EXT-08: 若回滚的操作为隔离死链，自动返还已扣减的配额
                if (targetJ && targetJ.action === "QUARANTINE_DEAD" && typeof LicenseManager !== "undefined" && LicenseManager.refundQuota) {
                  await LicenseManager.refundQuota(res.count || targetJ.count || 1);
                }
                const succMsg = typeof BHM_I18N !== "undefined"
                  ? BHM_I18N.t("toast.rollbackSuccess", { count: res.count })
                  : `Successfully rolled back ${res.count} bookmarks in place! Hierarchy 100% restored.`;
                showToast(succMsg, "success");
              } else {
                const partMsg = typeof BHM_I18N !== "undefined"
                  ? BHM_I18N.t("toast.rollbackPartial", { count: res?.count || 0, failed: res?.failures?.length || 0 })
                  : `Rollback partially completed (Restored ${res?.count || 0}, failed ${res?.failures?.length || 0}). Journal preserved safely for retry.`;
                showToast(partMsg, "warning");
              }
              allBookmarks = await loadBookmarks();
              statTotalBm.textContent = allBookmarks.length.toLocaleString();
              classifiedData = classifier.classifyAll(allBookmarks);
              statEcoCount.textContent = classifiedData.totalEcosystemCount.toLocaleString();
              renderEcosystemsGrid(classifiedData);
              await renderSnapshots();
            } catch (err) {
              const errMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.rollbackError", { msg: err.message }) : ("Rollback error: " + err.message);
              showToast(errMsg, "error");
              btn.disabled = false;
              btn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.journalRollbackBtn") : "🔄 Undo (In-Place)";
            }
          });
        });
      }
    }

    // 2. 渲染全量 HTML 快照
    const list = await safetyManager.getSnapshots();

    if (!list || list.length === 0) {
      const noSnapMsg = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.noSnapshots")
        : "No historical snapshots yet. Automatic backups are taken before any destructive actions.";
      snapshotList.innerHTML = `
        <div class="p-8 text-center text-slate-500 text-xs">
          ${noSnapMsg}
        </div>
      `;
      return;
    }

    const restoreBtnLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.restoreSnapBtn") : "🔄 Restore";
    const downloadBtnLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.downloadSnapBtn") : "📥 Export HTML";
    const deleteBtnLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.deleteSnapBtn") : "🗑️ Delete";

    snapshotList.innerHTML = list.map((snap) => {
      const sizeKb = (snap.sizeBytes / 1024).toFixed(1);
      return `
        <div class="p-4 flex items-center justify-between hover:bg-slate-800/30 transition">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-white">${escapeHtml(snap.label)}</span>
              <span class="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">${sizeKb} KB</span>
            </div>
            <div class="text-[11px] text-slate-400 font-mono">${snap.dateString}</div>
          </div>
          <div class="flex items-center gap-2">
            <button class="restore-snap-btn px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shadow-sm" data-id="${snap.id}">
              ${restoreBtnLabel}
            </button>
            <button class="download-snap-btn px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-sm" data-id="${snap.id}">
              ${downloadBtnLabel}
            </button>
            <button class="delete-snap-btn px-3 py-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 rounded-lg text-xs transition border border-slate-700" data-id="${snap.id}">
              ${deleteBtnLabel}
            </button>
          </div>
        </div>
      `;
    }).join("");

    // 绑定一键安全恢复事件
    snapshotList.querySelectorAll(".restore-snap-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const snap = list.find((s) => s.id === id);
        if (!snap) return;

        const snapFolderPrefix = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("folder.snapshotPrefix")
          : "🕰️ [Snapshot Restore]";

        const confirmMsg = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dialog.confirmRestoreSnapshot", { folder: `${snapFolderPrefix} ${snap.label}` })
          : `Will create a dedicated folder to restore all bookmarks from this snapshot. Proceed?`;

        const confirmed = confirm(confirmMsg);
        if (!confirmed) return;

        btn.disabled = true;
        btn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.restoring") : "Restoring...";

        try {
          const res = await safetyManager.restoreSnapshot(snap.id);
          if (res && res.success) {
            const succMsg = typeof BHM_I18N !== "undefined"
              ? BHM_I18N.t("toast.restoreSnapshotSuccess", { count: res.restoredCount || 0, title: res.rootTitle || "Snapshot Restore" })
              : `Successfully restored ${res.restoredCount || 0} bookmarks from snapshot into "${res.rootTitle || "Snapshot Restore"}"!`;
            showToast(succMsg, "success");
            allBookmarks = await loadBookmarks();
            statTotalBm.textContent = allBookmarks.length.toLocaleString();
            classifiedData = classifier.classifyAll(allBookmarks);
            statEcoCount.textContent = classifiedData.totalEcosystemCount.toLocaleString();
            renderEcosystemsGrid(classifiedData);
            await renderSnapshots();
          } else {
            const failMsg = typeof BHM_I18N !== "undefined"
              ? BHM_I18N.t("toast.restoreSnapshotFailed", { msg: res?.error || "Unknown error" })
              : `Snapshot restore incomplete: ${res?.error || "Unknown error"}`;
            showToast(failMsg, "error");
            btn.disabled = false;
            btn.textContent = restoreBtnLabel;
          }
        } catch (err) {
          const errMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.restoreSnapshotError", { msg: err.message }) : ("Restore failed: " + err.message);
          showToast(errMsg, "error");
          btn.disabled = false;
          btn.textContent = restoreBtnLabel;
        }
      });
    });

    // 绑定导出事件
    snapshotList.querySelectorAll(".download-snap-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const snap = list.find((s) => s.id === id);
        if (snap) exportSnapshotHtml(snap);
      });
    });

    // 绑定删除事件
    snapshotList.querySelectorAll(".delete-snap-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        await deleteSnapshot(id);
      });
    });
  }

  // 导出 HTML 快照
  function exportSnapshotHtml(snap) {
    const blob = new Blob([snap.htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookmarks_backup_${snap.timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const expMsg = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("toast.exportSnapshotSuccess", { filename: `bookmarks_backup_${snap.timestamp}.html` })
      : `Backup file exported successfully: bookmarks_backup_${snap.timestamp}.html`;
    showToast(expMsg, "success");
  }

  // 删除单条快照
  async function deleteSnapshot(id) {
    const delMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.deleteSnapshotSuccess") : "Snapshot safely deleted.";
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["bhm_snapshots"], (res) => {
        let list = res.bhm_snapshots || [];
        list = list.filter((s) => s.id !== id);
        chrome.storage.local.set({ bhm_snapshots: list }, () => {
          renderSnapshots();
          showToast(delMsg, "info");
        });
      });
    } else {
      let list = JSON.parse(localStorage.getItem("bhm_snapshots") || "[]");
      list = list.filter((s) => s.id !== id);
      localStorage.setItem("bhm_snapshots", JSON.stringify(list));
      await renderSnapshots();
      showToast(delMsg, "info");
    }
  }

  // 手动创建快照
  manualSnapshotBtn.addEventListener("click", async () => {
    manualSnapshotBtn.disabled = true;
    manualSnapshotBtn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.restoring") : "Backing up...";
    await refreshFullTree();
    const snapLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.manualSnapshotDefault") : "Manual full bookmark snapshot";
    await safetyManager.createSnapshot(fullTree, snapLabel);
    await renderSnapshots();
    manualSnapshotBtn.disabled = false;
    manualSnapshotBtn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.manualSnapshotBtn") : "📸 Create Full HTML Snapshot";
    const succMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.manualSnapshotSuccess") : "📸 Manual full bookmark snapshot created successfully!";
    showToast(succMsg, "success");
  });

  // ==========================================================================
  // TAB 4: Pro 商业化特权激活
  // ==========================================================================

  activateLicenseBtn.addEventListener("click", async () => {
    if (isPro) {
      const confirmDeact = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dialog.confirmDeactivate")
        : "Are you sure you want to deactivate the current commercial license?";

      if (confirm(confirmDeact)) {
        const deactMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.deactivated") : "Commercial license deactivated successfully.";
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(["bhm_pro_activated", "bhm_license_key", "bhm_license_tier", "bhm_license_tier_name"], () => {
            isPro = false;
            proTier = "FREE";
            updateProUI(false, null, "FREE");
            showToast(deactMsg, "info");
          });
        } else {
          localStorage.removeItem("bhm_pro_activated");
          localStorage.removeItem("bhm_license_key");
          localStorage.removeItem("bhm_license_tier");
          localStorage.removeItem("bhm_license_tier_name");
          isPro = false;
          proTier = "FREE";
          updateProUI(false, null, "FREE");
          showToast(deactMsg, "info");
        }
      }
      return;
    }

    const key = licenseKeyInput.value.trim();
    if (!key) {
      const emptyMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.enterLicenseKey") : "Please enter your license key (e.g. BHM1...)";
      showToast(emptyMsg, "warning");
      return;
    }

    let verification;
    if (typeof LicenseManager !== "undefined" && LicenseManager.verifyLicense) {
      verification = await LicenseManager.verifyLicense(key);
    } else {
      verification = { valid: false, reason: "LicenseManager module not ready" };
    }

    if (!verification || !verification.valid) {
      const reason = verification ? (verification.reason || verification.error) : "Invalid license key format or verification failed";
      const failMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.activateFailed", { msg: reason }) : `Activation failed: ${reason}`;
      showToast(failMsg, "error");
      return;
    }

    const tier = verification.tier;
    const tierName = verification.tierName;

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        bhm_pro_activated: true,
        bhm_license_key: key,
        bhm_license_tier: tier,
        bhm_license_tier_name: tierName,
        bhm_last_valid_time: Math.floor(Date.now() / 1000)
      }, () => {
        isPro = true;
        proTier = tier;
        updateProUI(true, key, tier, tierName);
        const succMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.activateSuccess", { tier: tierName }) : `Congratulations! ${tierName} activated successfully!`;
        showToast(succMsg, "success");
      });
    } else {
      localStorage.setItem("bhm_pro_activated", "true");
      localStorage.setItem("bhm_license_key", key);
      localStorage.setItem("bhm_license_tier", tier);
      localStorage.setItem("bhm_license_tier_name", tierName);
      isPro = true;
      proTier = tier;
      updateProUI(true, key, tier, tierName);
      const succMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.activateSuccess", { tier: tierName }) : `Congratulations! ${tierName} activated successfully!`;
      showToast(succMsg, "success");
    }
  });

  // 工具函数：HTML 转义防注入
  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BHM_TRASH_TITLES,
    BHM_MAIN_ECO_TITLES,
    BHM_UNCAT_TITLES,
    BHM_UGC_TITLES,
    BHM_SNAPSHOT_PREFIXES,
    getSystemFolders,
    updateSystemFolders,
    loadActiveBookmarksFromChrome,
    reorganizeBookmarksInChrome
  };
}
