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

// v2.2.0: 持久化读写受保护文件夹、重组范围策略、用户自定义规则
async function getReorgPreferences() {
  const defaults = {
    protectedFolderIds: [],
    reorgConfig: { scope: "loose_only", includeUncategorized: false },
    customRules: []
  };
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["bhm_protected_folders", "bhm_reorg_config", "bhm_custom_rules"], (res) => {
        const protectedFolderIds = Array.isArray(res?.bhm_protected_folders) ? res.bhm_protected_folders.map(String) : [];
        const rawCfg = res?.bhm_reorg_config;
        const validScopes = new Set(["loose_only", "titans_only", "full_library"]);
        const scope = (rawCfg && validScopes.has(rawCfg.scope)) ? rawCfg.scope : defaults.reorgConfig.scope;
        const includeUncategorized = (rawCfg && typeof rawCfg.includeUncategorized === "boolean")
          ? rawCfg.includeUncategorized
          : defaults.reorgConfig.includeUncategorized;
        const customRules = Array.isArray(res?.bhm_custom_rules) ? res.bhm_custom_rules : [];
        resolve({ protectedFolderIds, reorgConfig: { scope, includeUncategorized }, customRules });
      });
    });
  }
  try {
    const protectedFolderIds = JSON.parse(localStorage.getItem("bhm_protected_folders") || "[]");
    const rawCfg = JSON.parse(localStorage.getItem("bhm_reorg_config") || "null");
    const customRules = JSON.parse(localStorage.getItem("bhm_custom_rules") || "[]");
    const validScopes = new Set(["loose_only", "titans_only", "full_library"]);
    return {
      protectedFolderIds: Array.isArray(protectedFolderIds) ? protectedFolderIds.map(String) : [],
      reorgConfig: {
        scope: (rawCfg && validScopes.has(rawCfg.scope)) ? rawCfg.scope : "loose_only",
        includeUncategorized: (rawCfg && typeof rawCfg.includeUncategorized === "boolean") ? rawCfg.includeUncategorized : false
      },
      customRules: Array.isArray(customRules) ? customRules : []
    };
  } catch (e) {
    return defaults;
  }
}

async function saveReorgPreferences({ protectedFolderIds, reorgConfig, customRules }) {
  const payload = {};
  if (Array.isArray(protectedFolderIds)) payload.bhm_protected_folders = protectedFolderIds;
  if (reorgConfig && typeof reorgConfig === "object") payload.bhm_reorg_config = reorgConfig;
  if (Array.isArray(customRules)) payload.bhm_custom_rules = customRules;

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    await new Promise((resolve) => chrome.storage.local.set(payload, resolve));
  } else {
    try {
      if (payload.bhm_protected_folders) localStorage.setItem("bhm_protected_folders", JSON.stringify(payload.bhm_protected_folders));
      if (payload.bhm_reorg_config) localStorage.setItem("bhm_reorg_config", JSON.stringify(payload.bhm_reorg_config));
      if (payload.bhm_custom_rules) localStorage.setItem("bhm_custom_rules", JSON.stringify(payload.bhm_custom_rules));
    } catch (e) {}
  }
}

// v2.2.0: 动态提取 Chrome 顶层根容器 ID（书签栏/其他书签/移动设备书签，兼容多账号双根架构）
function getTopLevelRootIds(tree) {
  const ids = new Set(["1", "2", "3"]);
  if (Array.isArray(tree) && tree[0] && Array.isArray(tree[0].children)) {
    for (const rootChild of tree[0].children) {
      if (rootChild && !rootChild.url && rootChild.id) {
        ids.add(String(rootChild.id));
      }
    }
  }
  return ids;
}

// v2.2.0: 提取用户所有可保护的自定义书签文件夹（自动排除系统根容器与 BHM 内置目录）
function extractUserFoldersFromTree(tree, sysFolders = {}) {
  const rootIds = getTopLevelRootIds(tree);
  rootIds.add("0");
  const result = [];

  function countBookmarks(node) {
    let total = 0;
    for (const c of (node.children || [])) {
      if (c.url) total++;
      else if (c.children) total += countBookmarks(c);
    }
    return total;
  }

  function walk(nodes, pathParts = []) {
    for (const n of (nodes || [])) {
      if (n.url) continue;
      const idStr = String(n.id || "");
      const title = String(n.title || "");

      const isBhmSystem =
        (sysFolders.trashId && idStr === String(sysFolders.trashId)) ||
        (sysFolders.mainEcoId && idStr === String(sysFolders.mainEcoId)) ||
        (sysFolders.uncatId && idStr === String(sysFolders.uncatId)) ||
        (sysFolders.ugcId && idStr === String(sysFolders.ugcId)) ||
        BHM_TRASH_TITLES.has(title) ||
        BHM_MAIN_ECO_TITLES.has(title) ||
        BHM_UNCAT_TITLES.has(title) ||
        BHM_UGC_TITLES.has(title) ||
        BHM_SNAPSHOT_PREFIXES.some((p) => title.startsWith(p));

      if (isBhmSystem) continue;

      const isChromeRoot = rootIds.has(idStr);
      if (!isChromeRoot && idStr) {
        const nextPath = pathParts.concat(title || idStr);
        result.push({
          id: idStr,
          title: title || idStr,
          pathLabel: nextPath.join(" / "),
          count: countBookmarks(n),
          depth: pathParts.length
        });
        if (n.children) walk(n.children, nextPath);
      } else if (n.children) {
        walk(n.children, pathParts);
      }
    }
  }

  walk(tree, []);
  return result;
}

// v2.2.0: 递归展开已锁定文件夹及其全部嵌套子目录 ID
function collectProtectedSubtreeIds(tree, protectedIds = []) {
  const seedSet = new Set((protectedIds || []).map(String));
  const expanded = new Set();
  if (seedSet.size === 0) return expanded;

  function walk(nodes, insideProtected) {
    for (const n of (nodes || [])) {
      if (n.url) continue;
      const idStr = String(n.id || "");
      const nowProtected = insideProtected || seedSet.has(idStr);
      if (nowProtected && idStr) expanded.add(idStr);
      if (n.children) walk(n.children, nowProtected);
    }
  }
  walk(tree, false);
  for (const id of seedSet) expanded.add(id);
  return expanded;
}

// v2.2.0: 根据整理范围策略 + 受保护文件夹白名单，精确过滤待重组书签集合
function filterBookmarksForReorganize(bookmarks, tree, options = {}) {
  const scope = options.scope || "loose_only";
  const protectedFolderIds = Array.isArray(options.protectedFolderIds) ? options.protectedFolderIds : [];
  const rootIds = getTopLevelRootIds(tree);
  const protectedSet = collectProtectedSubtreeIds(tree, protectedFolderIds);

  const eligibleBookmarks = [];
  let protectedCount = 0;

  for (const bm of (bookmarks || [])) {
    const parentId = String(bm.parentId || "1");
    if (scope === "loose_only") {
      if (!rootIds.has(parentId)) {
        protectedCount++;
        continue;
      }
      eligibleBookmarks.push(bm);
    } else {
      if (protectedSet.has(parentId)) {
        protectedCount++;
        continue;
      }
      eligibleBookmarks.push(bm);
    }
  }

  return { eligibleBookmarks, protectedCount };
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
    throttleMs = 50,
    includeUncategorized = true
  } = options;

  const groups = data.ecosystemGroups || {};
  const domainMap = {};

  if (includeUncategorized) {
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

  // 仅当存在至少 1 条需要归入 16 巨头生态的书签时才创建【官方全生态总书签】目录，避免生成空目录
  const hasStandardTitanItems = Object.keys(groups).some((ecoId) => {
    if (ecoId === "uncategorized" || ecoId === "ugc_docs") return false;
    const g = groups[ecoId];
    return g && g.totalCount > 0 && !g.meta?.isUgcContainer && !g.meta?.isCustomRule;
  });

  let mainEcoFolder = null;
  if (hasStandardTitanItems) {
    const rootTitle = i18n ? i18n.t("folder.mainEco") : "【Official Tech Titans Ecosystems】";
    const { folder: f, created: rootCreated } = await getOrCreateFolder("1", rootTitle, 0, BHM_MAIN_ECO_TITLES, sysFolders.mainEcoId);
    mainEcoFolder = f;
    if (rootCreated && mainEcoFolder?.id) {
      createdFolderIds.push(mainEcoFolder.id);
      sysFolders.mainEcoId = mainEcoFolder.id;
      await updateSystemFolders({ mainEcoId: mainEcoFolder.id });
    } else if (mainEcoFolder?.id && mainEcoFolder.id !== sysFolders.mainEcoId) {
      sysFolders.mainEcoId = mainEcoFolder.id;
      await updateSystemFolders({ mainEcoId: mainEcoFolder.id });
    }
  }

  const moveOperations = [];

  for (const ecoId of Object.keys(groups)) {
    if (ecoId === "uncategorized") continue;
    const group = groups[ecoId];
    if (!group || group.totalCount === 0) continue;

    // v2.2.0: 用户自定义专属规则直接复用或创建在书签栏 ("1") 下的同名目录（例如「自建网站」），不建多余嵌套子夹
    if (group.meta?.isCustomRule) {
      const customFolderTitle = group.meta.folderName || group.meta.name;
      const { folder: customFolder, created: customCreated } = await getOrCreateFolder("1", customFolderTitle);
      if (customCreated && customFolder?.id) createdFolderIds.push(customFolder.id);
      for (const subId of Object.keys(group.subcategories || {})) {
        const sub = group.subcategories[subId];
        if (!sub || !sub.items) continue;
        for (const item of sub.items) {
          if (item.parentId === customFolder.id) continue;
          moveOperations.push({ item, targetParentId: customFolder.id });
        }
      }
      continue;
    }

    let parentFolderId = mainEcoFolder ? mainEcoFolder.id : "1";
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
  if (includeUncategorized && domainKeys.length > 0) {
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
  const reorgScopeSelect = document.getElementById("reorgScopeSelect");
  const includeUncatCheckbox = document.getElementById("includeUncatCheckbox");
  const reorgPreviewStats = document.getElementById("reorgPreviewStats");
  const protectedFoldersHint = document.getElementById("protectedFoldersHint");
  const protectedFoldersList = document.getElementById("protectedFoldersList");
  const customRuleFolderInput = document.getElementById("customRuleFolderInput");
  const customRuleDomainsInput = document.getElementById("customRuleDomainsInput");
  const addCustomRuleBtn = document.getElementById("addCustomRuleBtn");
  const customRulesList = document.getElementById("customRulesList");

  const snapshotList = document.getElementById("snapshotList");
  const journalList = document.getElementById("journalList");
  const manualSnapshotBtn = document.getElementById("manualSnapshotBtn");

  const licenseKeyInput = document.getElementById("licenseKeyInput");
  const activateLicenseBtn = document.getElementById("activateLicenseBtn");
  const licenseStatusText = document.getElementById("licenseStatusText");
  const toastContainer = document.getElementById("toastContainer");
  const langToggleBtn = document.getElementById("langToggleBtn");

  const headerUpgradeBtn = document.getElementById("headerUpgradeBtn");
  const headerProStatus = document.getElementById("headerProStatus");
  const headerProTierText = document.getElementById("headerProTierText");
  const proHealthBanner = document.getElementById("proHealthBanner");
  const healthBannerRedeemBtn = document.getElementById("healthBannerRedeemBtn");

  // P0-1: 将 Paywall 与健康战报 DOM 引用全部提升至 DOMContentLoaded 顶部，彻底消除 TDZ 风险
  const paywallModal = document.getElementById("paywallModal");
  const closePaywallBtn = document.getElementById("closePaywallBtn");
  const paywallHeadline = document.getElementById("paywallHeadline");
  const paywallSubheadline = document.getElementById("paywallSubheadline");
  const pwDeadCount = document.getElementById("pwDeadCount");
  const pwDupCount = document.getElementById("pwDupCount");
  const pwSavedMinutes = document.getElementById("pwSavedMinutes");
  const paywallViralUnlockBtn = document.getElementById("paywallViralUnlockBtn");
  const paywallLicenseInput = document.getElementById("paywallLicenseInput");
  const paywallActivateBtn = document.getElementById("paywallActivateBtn");
  const generateHealthCardBtn = document.getElementById("generateHealthCardBtn");

  if (healthBannerRedeemBtn) {
    healthBannerRedeemBtn.addEventListener("click", () => {
      const proTab = document.querySelector('.nav-tab[data-target="tab-pro"]');
      if (proTab) proTab.click();
      if (licenseKeyInput) {
        setTimeout(() => licenseKeyInput.focus(), 100);
      }
    });
  }

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

  const dupTabBadge = document.getElementById("dupTabBadge");
  const cleanDupsBtn = document.getElementById("cleanDupsBtn");
  const dupSummaryText = document.getElementById("dupSummaryText");
  const duplicatesListContainer = document.getElementById("duplicatesListContainer");

  // 内部状态
  let fullTree = [];
  let allBookmarks = [];
  let allDuplicates = [];
  let duplicateGroups = [];
  let probeResults = [];
  let classifiedData = null;
  let reorgClassifiedData = null;
  let protectedFolderIds = [];
  let reorgConfig = { scope: "loose_only", includeUncategorized: false };
  let userCustomRules = [];
  let cachedSysFolders = {};
  let lastProtectedCount = 0;
  let currentFilter = "all";
  let isPro = false;
  let activeProber = null;
  let isBusyTask = false;
  let proTier = "FREE";
  let lastScore = 100;
  let currentLicenseKey = null;

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

      currentLicenseKey = storedKey || currentLicenseKey;
      const isEn = typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() === "en" : true;
      const localizedTierName = isEn ? (status.tierEnName || null) : (status.tierName || null);
      updateProUI(isPro, currentLicenseKey, proTier, localizedTierName);
      return isPro;
    }

    isPro = false;
    proTier = "FREE";
    currentLicenseKey = null;
    updateProUI(false, null, "FREE");
    return false;
  }

  function updateProUI(active, key, tier = "LTD", tierName = null) {
    const isEn = typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() === "en" : true;
    let resolvedName = tierName;
    if (!resolvedName) {
      if (tier === "SINGLE_WASH") {
        resolvedName = isEn ? "30-Day Full Wash Pass ($4.90)" : "30天全量大扫除卡 ($4.90)";
      } else {
        resolvedName = isEn ? "Pro Lifetime Buyout ($14.90)" : "Pro 终身买断授权 ($14.90)";
      }
    }

    if (active) {
      if (headerUpgradeBtn) headerUpgradeBtn.classList.add("hidden");
      if (headerProStatus) {
        headerProStatus.classList.remove("hidden");
        headerProStatus.classList.add("inline-flex");
      }
      if (headerProTierText) {
        headerProTierText.textContent = resolvedName || "Pro Active";
      }
      if (proHealthBanner) proHealthBanner.classList.add("hidden");

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
      if (headerUpgradeBtn) headerUpgradeBtn.classList.remove("hidden");
      if (headerProStatus) {
        headerProStatus.classList.add("hidden");
        headerProStatus.classList.remove("inline-flex");
      }
      if (proHealthBanner) proHealthBanner.classList.remove("hidden");

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
    const iconSpan = document.createElement("span");
    iconSpan.textContent = icons[type] || "ℹ️";
    const msgSpan = document.createElement("span");
    msgSpan.textContent = String(message ?? "");
    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-4", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("translate-y-4", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 导航 Tab 切换（保留 tab-duplicates 与 tab-pro 的 flex/徽章样式）
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-target");
      navTabs.forEach((t) => {
        const tid = t.getAttribute("data-target");
        if (tid === "tab-pro") {
          t.className = "nav-tab px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center gap-1.5";
        } else if (tid === "tab-duplicates") {
          t.className = "nav-tab px-4 py-2 rounded-lg text-xs font-medium bg-slate-800/60 text-slate-400 hover:text-white flex items-center gap-1.5";
        } else {
          t.className = "nav-tab px-4 py-2 rounded-lg text-xs font-medium bg-slate-800/60 text-slate-400 hover:text-white";
        }
      });
      if (targetId === "tab-pro") {
        tab.className = "nav-tab px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 border border-amber-400 transition flex items-center gap-1.5";
      } else if (targetId === "tab-duplicates") {
        tab.className = "nav-tab px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white flex items-center gap-1.5";
      } else {
        tab.className = "nav-tab px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white";
      }

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
      const sysFolders = await getSystemFolders();
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

  function renderProtectedFoldersPanel(sysFolders = {}) {
    if (!protectedFoldersList) return;
    const folders = extractUserFoldersFromTree(fullTree, sysFolders);
    const lockedSet = new Set(protectedFolderIds.map(String));

    if (protectedFoldersHint) {
      if (reorgConfig.scope === "loose_only") {
        protectedFoldersHint.classList.remove("hidden");
      } else {
        protectedFoldersHint.classList.add("hidden");
      }
    }

    if (folders.length === 0) {
      const emptyTxt = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.protectedFoldersEmpty")
        : "No custom user folders detected yet (all bookmarks are at root level)";
      protectedFoldersList.innerHTML = `<span class="text-[11px] text-slate-500">${escapeHtml(emptyTxt)}</span>`;
      return;
    }

    protectedFoldersList.innerHTML = folders.map((f) => {
      const isLocked = lockedSet.has(f.id);
      const cls = isLocked
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
        : "bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500";
      return `
        <button type="button" class="protected-folder-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${cls}" data-folder-id="${escapeHtml(f.id)}" title="${escapeHtml(f.pathLabel)}">
          <span>${isLocked ? "🔒" : "🔓"}</span>
          <span class="max-w-[180px] truncate">${escapeHtml(f.pathLabel)}</span>
          <span class="text-[10px] opacity-75 font-mono">(${f.count})</span>
        </button>
      `;
    }).join("");

    if (!protectedFoldersList._hasDelegated) {
      protectedFoldersList._hasDelegated = true;
      protectedFoldersList.addEventListener("click", async (e) => {
        const pill = e.target.closest(".protected-folder-pill");
        if (!pill) return;
        const fid = pill.getAttribute("data-folder-id");
        if (!fid) return;
        const idx = protectedFolderIds.indexOf(fid);
        if (idx >= 0) {
          protectedFolderIds.splice(idx, 1);
        } else {
          protectedFolderIds.push(fid);
        }
        await saveReorgPreferences({ protectedFolderIds });
        recomputeDuplicatesAndEcosystems();
      });
    }
  }

  function renderCustomRulesPanel() {
    if (!customRulesList) return;
    if (!userCustomRules || userCustomRules.length === 0) {
      const emptyTxt = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.customRulesEmpty")
        : "No custom rules yet. Add your own domains so scattered self-hosted/project links route straight into your chosen folder.";
      customRulesList.innerHTML = `<div class="text-[11px] text-slate-500">${escapeHtml(emptyTxt)}</div>`;
      return;
    }

    const delLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.deleteRuleBtn") : "Remove";
    customRulesList.innerHTML = userCustomRules.map((r) => {
      const ecoKey = `custom_${r.id}`;
      const matchCount = reorgClassifiedData?.ecosystemGroups?.[ecoKey]?.totalCount || 0;
      return `
        <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/70 border border-emerald-500/25">
          <div class="min-w-0 flex items-center gap-2 flex-wrap">
            <span class="text-xs font-semibold text-emerald-300">📁 ${escapeHtml(r.folderName)}</span>
            <span class="text-[10px] text-slate-400 font-mono truncate max-w-[360px]">${escapeHtml((r.domains || []).join(", "))}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 font-mono">${matchCount}</span>
          </div>
          <button type="button" class="delete-custom-rule-btn px-2 py-0.5 rounded text-[10px] bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-500/30 transition" data-rule-id="${escapeHtml(r.id)}">${escapeHtml(delLabel)}</button>
        </div>
      `;
    }).join("");

    if (!customRulesList._hasDelegated) {
      customRulesList._hasDelegated = true;
      customRulesList.addEventListener("click", async (e) => {
        const btn = e.target.closest(".delete-custom-rule-btn");
        if (!btn) return;
        const rid = btn.getAttribute("data-rule-id");
        userCustomRules = userCustomRules.filter((r) => r.id !== rid);
        await saveReorgPreferences({ customRules: userCustomRules });
        recomputeDuplicatesAndEcosystems();
        const delMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.customRuleDeleted") : "Custom rule removed";
        showToast(delMsg, "info");
      });
    }
  }

  function updateReorgPreviewStats() {
    if (!reorgPreviewStats || !reorgClassifiedData) return;
    const customCount = reorgClassifiedData.totalCustomCount || 0;
    const ecoCount = Math.max(0, (reorgClassifiedData.totalEcosystemCount || 0) - customCount);
    const uncatCount = reorgConfig.includeUncategorized ? (reorgClassifiedData.totalUncategorizedCount || 0) : 0;
    const eligible = customCount + ecoCount + uncatCount;
    const uncatKept = reorgConfig.includeUncategorized ? 0 : (reorgClassifiedData.totalUncategorizedCount || 0);
    const protectedTotal = lastProtectedCount + uncatKept;

    reorgPreviewStats.textContent = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("dashboard.reorgPreviewStats", {
        eligible,
        custom: customCount,
        eco: ecoCount,
        uncat: uncatCount,
        protected: protectedTotal
      })
      : `Will organize ${eligible} items (Custom ${customCount} · Ecosystems/Docs ${ecoCount} · Uncategorized ${uncatCount}) · Protected & untouched: ${protectedTotal}`;
  }

  function recomputeDuplicatesAndEcosystems() {
    if (classifier && classifier.setCustomRules) {
      classifier.setCustomRules(userCustomRules);
    }
    classifiedData = classifier.classifyAll(allBookmarks);
    const dupRes = (window.EcosystemClassifier || EcosystemClassifier).findDuplicates(allBookmarks);
    allDuplicates = dupRes.duplicates || [];
    duplicateGroups = dupRes.duplicateGroups || [];
    statEcoCount.textContent = classifiedData.totalEcosystemCount.toLocaleString();

    const filtered = filterBookmarksForReorganize(allBookmarks, fullTree, {
      scope: reorgConfig.scope,
      protectedFolderIds
    });
    lastProtectedCount = filtered.protectedCount;
    reorgClassifiedData = classifier.classifyAll(filtered.eligibleBookmarks);

    renderProtectedFoldersPanel(cachedSysFolders);
    renderCustomRulesPanel();
    updateReorgPreviewStats();
    renderEcosystemsGrid(reorgClassifiedData);
    renderDuplicatesPanel();
  }

  // v2.2.0: 绑定整理范围策略、未分类开关与自定义规则添加事件
  if (reorgScopeSelect) {
    reorgScopeSelect.addEventListener("change", async () => {
      const nextScope = reorgScopeSelect.value;
      reorgConfig.scope = nextScope;
      if (nextScope === "full_library") {
        reorgConfig.includeUncategorized = true;
      } else if (nextScope === "titans_only" || nextScope === "loose_only") {
        reorgConfig.includeUncategorized = false;
      }
      if (includeUncatCheckbox) {
        includeUncatCheckbox.checked = reorgConfig.includeUncategorized;
      }
      await saveReorgPreferences({ reorgConfig });
      recomputeDuplicatesAndEcosystems();
    });
  }

  if (includeUncatCheckbox) {
    includeUncatCheckbox.addEventListener("change", async () => {
      reorgConfig.includeUncategorized = !!includeUncatCheckbox.checked;
      // 非 loose_only 模式下自动联动下拉框文案与实际策略一致
      if (reorgConfig.scope !== "loose_only") {
        reorgConfig.scope = reorgConfig.includeUncategorized ? "full_library" : "titans_only";
        if (reorgScopeSelect) reorgScopeSelect.value = reorgConfig.scope;
      }
      await saveReorgPreferences({ reorgConfig });
      recomputeDuplicatesAndEcosystems();
    });
  }

  if (addCustomRuleBtn) {
    addCustomRuleBtn.addEventListener("click", async () => {
      const folderName = (customRuleFolderInput?.value || "").trim();
      const rawDomains = (customRuleDomainsInput?.value || "").trim();
      const sanitized = (window.EcosystemClassifier || EcosystemClassifier).sanitizeCustomRules([
        { id: `u_${Date.now()}`, folderName, icon: "📁", domains: rawDomains }
      ]);
      if (sanitized.length === 0) {
        const errTxt = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("toast.customRuleInvalid")
          : "Please enter a target folder name and at least one valid domain (e.g. geoscore.help)";
        showToast(errTxt, "warning");
        return;
      }
      const newRule = sanitized[0];
      // 若已存在同名文件夹规则则合并域名，避免重复规则
      const existing = userCustomRules.find((r) => r.folderName === newRule.folderName);
      if (existing) {
        existing.domains = Array.from(new Set([...(existing.domains || []), ...newRule.domains]));
      } else {
        userCustomRules.push(newRule);
      }
      if (customRuleFolderInput) customRuleFolderInput.value = "";
      if (customRuleDomainsInput) customRuleDomainsInput.value = "";
      await saveReorgPreferences({ customRules: userCustomRules });
      recomputeDuplicatesAndEcosystems();
      const okTxt = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("toast.customRuleAdded", { folder: newRule.folderName })
        : `Added custom rule "${newRule.folderName}" (active immediately)`;
      showToast(okTxt, "success");
    });
  }

  function renderDuplicatesPanel() {
    if (dupTabBadge) {
      if (allDuplicates.length > 0) {
        dupTabBadge.textContent = allDuplicates.length.toString();
        dupTabBadge.classList.remove("hidden");
      } else {
        dupTabBadge.classList.add("hidden");
      }
    }
    if (cleanDupsBtn) {
      if (allDuplicates.length > 0) {
        cleanDupsBtn.disabled = false;
        cleanDupsBtn.textContent = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.cleanDupsBtn", { count: allDuplicates.length })
          : `🗑️ Quarantine All Duplicates (${allDuplicates.length})`;
      } else {
        cleanDupsBtn.disabled = true;
        cleanDupsBtn.textContent = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.cleanDupsBtnZero")
          : "✅ No Duplicates Found";
      }
    }
    if (dupSummaryText) {
      dupSummaryText.textContent = allDuplicates.length > 0
        ? (typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.dupGroupCount", { groups: duplicateGroups.length, count: allDuplicates.length })
          : `${duplicateGroups.length} duplicate groups · ${allDuplicates.length} redundant copies ready to quarantine`)
        : (typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.noDuplicates")
          : "🎉 Clean library! Zero duplicate bookmark URLs detected.");
    }
    if (!duplicatesListContainer) return;
    if (duplicateGroups.length === 0) {
      const emptyMsg = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.noDuplicates")
        : "🎉 Clean library! Zero duplicate bookmark URLs detected.";
      duplicatesListContainer.innerHTML = `<div class="p-8 text-center text-slate-500 text-xs">${escapeHtml(emptyMsg)}</div>`;
      return;
    }

    const keepLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.dupKeepBadge") : "✓ Keep (Earliest)";
    const copyLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.dupCopyBadge") : "Duplicate";
    const quarantineLabel = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.quarantineBtn") : "Quarantine";
    const untitled = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.untitledBookmark") : "Untitled Bookmark";

    duplicatesListContainer.innerHTML = duplicateGroups.map((group) => `
      <div class="p-4 space-y-2">
        <div class="text-[11px] font-mono text-blue-300 truncate">${escapeHtml(group.normalizedUrl)}</div>
        <div class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <div class="min-w-0 flex items-center gap-2">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 shrink-0">${escapeHtml(keepLabel)}</span>
            <span class="text-xs text-slate-200 truncate">${escapeHtml(group.keep.title || untitled)}</span>
          </div>
        </div>
        ${group.duplicates.map((dup) => `
          <div class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div class="min-w-0 flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 shrink-0">${escapeHtml(copyLabel)}</span>
              <span class="text-xs text-slate-300 truncate">${escapeHtml(dup.title || untitled)}</span>
            </div>
            <button class="single-dup-quarantine-btn px-2.5 py-1 rounded text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition shrink-0" data-id="${escapeHtml(dup.id)}">${escapeHtml(quarantineLabel)}</button>
          </div>
        `).join("")}
      </div>
    `).join("");

    if (!duplicatesListContainer._hasDelegated) {
      duplicatesListContainer._hasDelegated = true;
      duplicatesListContainer.addEventListener("click", async (e) => {
        const btn = e.target.closest(".single-dup-quarantine-btn");
        if (!btn) return;
        const id = btn.getAttribute("data-id");
        const target = allDuplicates.find((d) => d.id === id);
        if (!target) return;
        const moveRes = await moveToTrashFolder([target], { actionType: "QUARANTINE_DUPLICATES" });
        if (moveRes && moveRes.movedCount > 0) {
          allBookmarks = allBookmarks.filter((b) => b.id !== id);
          probeResults = probeResults.filter((r) => r.id !== id);
          statTotalBm.textContent = allBookmarks.length.toLocaleString();
          recomputeDuplicatesAndEcosystems();
          refreshScanCountersAndList();
          await renderSnapshots();
          const okMsg = typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("toast.singleQuarantineSuccess", { title: target.title || target.url })
            : `Moved "${target.title || target.url}" to quarantine.`;
          showToast(okMsg, "success");
        } else {
          const failMsg = typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("toast.singleQuarantineFailed", { title: target.title || target.url })
            : `Failed to move "${target.title || target.url}" (quota reached or move error).`;
          showToast(failMsg, "error");
        }
      });
    }
  }

  if (cleanDupsBtn) {
    cleanDupsBtn.addEventListener("click", async () => {
      if (!allDuplicates || allDuplicates.length === 0) return;

      const trashFolderName = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("folder.trash")
        : "🗑️ Dead Links Quarantine (BHM)";
      const confirmMsg = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dialog.confirmCleanDups", { count: allDuplicates.length, folder: trashFolderName })
        : `Move ${allDuplicates.length} duplicate bookmark copies to "${trashFolderName}"?`;
      if (!confirm(confirmMsg)) return;

      // 配额前置校验，避免 0 配额时白建快照
      const livePro = (typeof LicenseManager !== "undefined" && LicenseManager.checkProStatus)
        ? await LicenseManager.checkProStatus()
        : { isPro, tier: proTier };
      const activeTier = livePro.tier || (livePro.isPro ? "LTD" : "FREE");
      const rem = (typeof LicenseManager !== "undefined" && LicenseManager.getRemainingQuota)
        ? await LicenseManager.getRemainingQuota(activeTier)
        : Infinity;

      if (rem > 0) {
        await refreshFullTree();
        const snapLabel = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("snapshot.batchDuplicates", { count: allDuplicates.length })
          : `Pre-deduplication full snapshot (${allDuplicates.length} duplicates)`;
        await safetyManager.createSnapshot(fullTree, snapLabel);
      }

      const moveRes = await moveToTrashFolder(allDuplicates, { actionType: "QUARANTINE_DUPLICATES" });
      const { movedCount = 0, movedIds = [], skippedCount = 0 } = moveRes || {};

      if (movedIds.length > 0) {
        const movedSet = new Set(movedIds);
        allBookmarks = allBookmarks.filter((b) => !movedSet.has(b.id));
        probeResults = probeResults.filter((r) => !movedSet.has(r.id));
        statTotalBm.textContent = allBookmarks.length.toLocaleString();
        recomputeDuplicatesAndEcosystems();
        refreshScanCountersAndList();
        await renderSnapshots();
      }

      if (skippedCount > 0) {
        showToast(
          typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("toast.dupQuarantinePartial", { moved: movedCount, skipped: skippedCount })
            : `Quarantined ${movedCount} duplicates; ${skippedCount} remaining due to tier quota limits.`,
          "warning"
        );
      } else if (movedCount > 0) {
        showToast(
          typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("toast.dupQuarantineSuccess", { count: movedCount })
            : `🎉 Quarantined ${movedCount} duplicate bookmarks! Undo anytime in Time Machine.`,
          "success"
        );
      }
    });
  }

  // 初始化大盘指标
  async function initDashboard() {
    await checkProStatus();
    cachedSysFolders = await getSystemFolders();
    const prefs = await getReorgPreferences();
    protectedFolderIds = prefs.protectedFolderIds || [];
    reorgConfig = prefs.reorgConfig || { scope: "loose_only", includeUncategorized: false };
    userCustomRules = (window.EcosystemClassifier || EcosystemClassifier).sanitizeCustomRules(prefs.customRules || []);

    if (reorgScopeSelect) reorgScopeSelect.value = reorgConfig.scope;
    if (includeUncatCheckbox) includeUncatCheckbox.checked = !!reorgConfig.includeUncategorized;

    allBookmarks = await loadBookmarks();

    // 更新总书签数
    statTotalBm.textContent = allBookmarks.length.toLocaleString();

    // 运行自定义规则 + 16 大官方生态分析 + 精准去重检测
    recomputeDuplicatesAndEcosystems();

    // 渲染快照历史与事务日志
    await renderSnapshots();
  }

  // 监听多语言切换事件
  window.addEventListener("bhm:langchange", async (e) => {
    const lang = (e && e.detail && e.detail.lang) || (typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() : "en");
    classifier = new (window.EcosystemClassifier || (typeof EcosystemClassifier !== "undefined" ? EcosystemClassifier : null))(rules, { lang, userCustomRules });
    recomputeDuplicatesAndEcosystems();
    updateHealthScoreDesc(lastScore);
    refreshScanCountersAndList();
    if (startScanBtn && !isBusyTask) {
      startScanBtn.textContent = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t(probeResults.length > 0 ? "dashboard.rescan" : "dashboard.startScan")
        : (probeResults.length > 0 ? "🔄 Re-scan Library" : "🚀 Start Full Scan");
    }
    await renderSnapshots();
    await checkProStatus();
  });

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

    // 1. 提取所有合法公网 HTTP/HTTPS 主机名去重数组，联动 DNR 规则放行 HEAD/GET（过滤内网 IP 与 IPv6 字面量防 DNR 报错）
    const ProberCls = window.BookmarkProber || (typeof BookmarkProber !== "undefined" ? BookmarkProber : null);
    const domainSet = new Set();
    for (const bm of allBookmarks) {
      if (bm.url && /^https?:\/\//i.test(bm.url)) {
        if (ProberCls && ProberCls.isIntranetUrl && ProberCls.isIntranetUrl(bm.url)) {
          continue;
        }
        try {
          const u = new URL(bm.url);
          if (
            u.hostname &&
            !u.hostname.includes(":") &&
            !u.hostname.startsWith("[") &&
            !u.hostname.includes("localhost") &&
            !u.hostname.endsWith(".local") &&
            !u.hostname.endsWith(".internal")
          ) {
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
                  payload: { completed, total, timestamp: Date.now(), updatedAt: Date.now() }
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

      const { deadItems, reviewItems } = refreshScanCountersAndList();

      if (generateHealthCardBtn) {
        generateHealthCardBtn.classList.remove("hidden");
        generateHealthCardBtn.classList.add("flex");
      }

      // P0-1: 扫描完成后若发现严重死链或堆积，触发痛点诊断
      if (!isPro && (deadItems.length >= 10 || allDuplicates.length >= 10)) {
        setTimeout(() => {
          openPaywallModal({
            deadCount: deadItems.length,
            dupCount: allDuplicates.length,
            clusterCount: classifiedData ? (classifiedData.totalEcosystemCount || 0) : 0
          });
        }, 1200);
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

  function isReviewStatus(status) {
    return (
      status === "UNREACHABLE_OR_PROTECTED" ||
      status === "SKIPPED_INTERNAL" ||
      status === "SKIPPED_DANGEROUS" ||
      status === "SERVER_ERROR" ||
      status === "SKIPPED"
    );
  }

  function resolveProbeReason(item) {
    if (!item) return "";
    if (item.reasonCode && typeof BHM_I18N !== "undefined") {
      const key = `probe.reason.${item.reasonCode}`;
      const translated = BHM_I18N.t(key, item.reasonParams || {});
      if (translated && translated !== key) return translated;
    }
    return item.reason || "";
  }

  function refreshScanCountersAndList() {
    const deadItems = probeResults.filter((r) => r.status === "DEAD");
    const reviewItems = probeResults.filter((r) => isReviewStatus(r.status));
    const redirectItems = probeResults.filter((r) => r.status === "HEALTHY" && r.redirectedUrl);
    const healthyItems = probeResults.filter((r) => r.status === "HEALTHY" && !r.redirectedUrl);

    statDeadCount.textContent = deadItems.length.toLocaleString();
    updateFilterCounts(probeResults.length, deadItems.length, reviewItems.length, redirectItems.length, healthyItems.length);

    if (scanResultSummary) {
      if (probeResults.length === 0) {
        scanResultSummary.textContent = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.noScanRecord")
          : "No inspection records yet";
      } else {
        scanResultSummary.textContent = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.scanSummaryStats", {
            total: probeResults.length,
            dead: deadItems.length,
            review: reviewItems.length,
            redirect: redirectItems.length
          })
          : `Probed ${probeResults.length} · ${deadItems.length} dead · ${reviewItems.length} review · ${redirectItems.length} redirected`;
      }
    }

    if (deadItems.length > 0) {
      cleanDeadBtn.classList.remove("hidden");
      cleanDeadBtn.textContent = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dashboard.cleanDeadBtn", { count: deadItems.length })
        : `🗑️ Quarantine ${deadItems.length} Dead Links`;
    } else {
      cleanDeadBtn.classList.add("hidden");
    }

    renderDeadList();
    return { deadItems, reviewItems, redirectItems, healthyItems };
  }

  function updateFilterCounts(all, dead, review, redirect, healthy) {
    filterChips.forEach((chip) => {
      const filter = chip.getAttribute("data-filter");
      if (filter === "all") chip.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.filterAll", { count: all }) : `All (${all})`;
      if (filter === "dead") chip.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.filterDead", { count: dead }) : `Dead Links (${dead})`;
      if (filter === "review") chip.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.filterReview", { count: review }) : `🛡️ Safety Review (${review})`;
      if (filter === "redirect") chip.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.filterRedirect", { count: redirect }) : `Redirected (${redirect})`;
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
      filtered = probeResults.filter((r) => isReviewStatus(r.status));
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
      } else if (item.status === "SERVER_ERROR") {
        const srvTxt = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("dashboard.serverErrorBadge", { code: item.httpCode || "5xx" })
          : `⚠️ Server Error (${item.httpCode || "5xx"})`;
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">${escapeHtml(srvTxt)}</span>`;
      } else if (item.status === "SKIPPED_INTERNAL") {
        const intTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.internalBadge") : "🛡️ Intranet Protected";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${intTxt}</span>`;
      } else if (item.status === "SKIPPED_DANGEROUS") {
        const dngTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.dangerousBadge") : "🛡️ Action URL Shielded";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">${dngTxt}</span>`;
      } else if (item.status === "SKIPPED") {
        const skipTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.skippedBadge") : "Skipped";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">${skipTxt}</span>`;
      } else if (item.redirectedUrl) {
        const isAuth = !!item.authOrWafProtected;
        const redirTxt = typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t(isAuth ? "dashboard.authRedirectBadge" : "dashboard.redirectBadge")
          : (isAuth ? "🛡️ Auth / Login Redirect" : "Redirected");
        const colorCls = isAuth
          ? "bg-amber-500/10 text-amber-300 border border-amber-500/25"
          : "bg-blue-500/10 text-blue-400 border border-blue-500/20";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold ${colorCls}">${redirTxt}</span>`;
      } else {
        const healthyTxt = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.healthyBadge") : "Healthy 200 OK";
        badge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${healthyTxt}</span>`;
      }

      const displayReason = resolveProbeReason(item);

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
            ${displayReason ? `<div class="text-[10px] ${item.status === "DEAD" ? "text-red-400/80" : "text-amber-300/80"} truncate mt-0.5">${escapeHtml(displayReason)}</div>` : ""}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <a href="${safeHref}" ${linkTarget} title="${escapeHtml(item.url || "")}" class="px-2.5 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition">${visitLabel}</a>
            ${item.status === "DEAD" ? `<button class="single-quarantine-btn px-2.5 py-1 rounded text-[11px] bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 transition" data-id="${escapeHtml(item.id)}">${quarantineLabel}</button>` : ""}
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

  // 单条隔离 (P1-12: 仅记原子 Move Journal，避免连点冲毁 10 槽全量历史快照)
  async function quarantineSingleBookmark(bmId) {
    const item = allBookmarks.find((b) => b.id === bmId);
    if (!item) return;

    const res = await moveToTrashFolder([item], { actionType: "QUARANTINE_DEAD" });
    if (res && res.movedCount > 0) {
      const okMsg = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("toast.singleQuarantineSuccess", { title: item.title })
        : `Moved "${item.title}" to dead links quarantine.`;
      showToast(okMsg, "success");
      probeResults = probeResults.filter((r) => r.id !== bmId);
      allBookmarks = allBookmarks.filter((b) => b.id !== bmId);
      statTotalBm.textContent = allBookmarks.length.toLocaleString();
      recomputeDuplicatesAndEcosystems();
      refreshScanCountersAndList();
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

    // P1-12: 先校验可用配额，再决定是否建全量快照（避免 0 配额时白建垃圾快照）
    const liveStatus = (typeof LicenseManager !== "undefined" && LicenseManager.checkProStatus)
      ? await LicenseManager.checkProStatus()
      : { isPro, tier: proTier };
    const effectiveTier = liveStatus.tier || (liveStatus.isPro ? "LTD" : "FREE");
    const preQuota = (typeof LicenseManager !== "undefined" && LicenseManager.getRemainingQuota)
      ? await LicenseManager.getRemainingQuota(effectiveTier)
      : Infinity;

    if (preQuota > 0) {
      await refreshFullTree();
      const batchSnapLabel = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("snapshot.batchQuarantine", { count: deadItems.length })
        : `Dead links batch quarantine snapshot (${deadItems.length} items)`;
      await safetyManager.createSnapshot(fullTree, batchSnapLabel);
    }

    // 2. 移入回收站并获得真实处理统计
    const moveRes = await moveToTrashFolder(deadItems, { actionType: "QUARANTINE_DEAD" });
    const { movedCount = 0, movedIds = [], skippedCount = 0 } = moveRes || {};

    // 3. 仅从 probeResults 和 allBookmarks 中剔除真实成功移动的 movedIds
    const movedIdSet = new Set(movedIds);
    probeResults = probeResults.filter((r) => !movedIdSet.has(r.id));
    allBookmarks = allBookmarks.filter((b) => !movedIdSet.has(b.id));

    statTotalBm.textContent = allBookmarks.length.toLocaleString();
    recomputeDuplicatesAndEcosystems();
    refreshScanCountersAndList();
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
  async function moveToTrashFolder(items, options = {}) {
    const actionType = options.actionType || "QUARANTINE_DEAD";
    if (!Array.isArray(items) || items.length === 0) {
      return { movedCount: 0, movedIds: [], movedItems: [], skippedCount: 0, skippedItems: [] };
    }

    // 1. 动态复核授权阶梯与过期状态 (P1-9，保留当前已展示密钥不被 null 覆盖)
    if (typeof LicenseManager !== "undefined" && LicenseManager.checkProStatus) {
      const live = await LicenseManager.checkProStatus();
      isPro = !!live.isPro;
      proTier = live.tier || (isPro ? "LTD" : "FREE");
      const isEn = typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() === "en" : true;
      updateProUI(isPro, currentLicenseKey, proTier, isEn ? (live.tierEnName || null) : (live.tierName || null));
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
        setTimeout(() => {
          openPaywallModal({
            deadCount: items.length,
            dupCount: allDuplicates ? allDuplicates.length : 0
          });
        }, 800);
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
            await safetyManager.recordJournal(actionType, moves, createdFolderIds);

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
            <span>${escapeHtml(subDisplayName)}</span>
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
      const isCustom = !!meta.isCustomRule;
      if (ecoId === "uncategorized" && !reorgConfig.includeUncategorized) {
        return "";
      }

      const subtitleName = isCustom
        ? (typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.customRuleBadge") : "✨ Custom Rule")
        : (isEn ? (meta.name !== meta.enName ? meta.name : "") : (meta.enName || ""));
      const effectiveFooter = isCustom
        ? (typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.customRuleCardFooter") : "Personal custom rule · Direct Bookmarks Bar folder")
        : cardFooter;

      return `
        <div class="bg-slate-900 border ${isCustom ? "border-emerald-500/40" : "border-slate-800"} rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">${escapeHtml(meta.icon || "📁")}</span>
                <div>
                  <h4 class="text-xs font-bold text-white">${escapeHtml(titleName)}</h4>
                  ${subtitleName ? `<div class="text-[10px] ${isCustom ? "text-emerald-400" : "text-slate-400"}">${escapeHtml(subtitleName)}</div>` : ""}
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
                    <span class="text-[9px] text-slate-500 font-mono">${escapeHtml(bm.classification.matchedDomain || bm.classification.mainDomain || "")}</span>
                  </div>
                `).join("")}
                ${sampleList.length > 3 ? `<div class="text-[10px] text-slate-500 text-right">${andMoreLabel}</div>` : ""}
              </div>
            ` : ""}
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-400">
            <span>${escapeHtml(effectiveFooter)}</span>
            <span class="text-emerald-400 font-medium">${nativeTag}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // 一键在 Chrome 中按当前范围/保护锁/自定义规则执行重组
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
      openPaywallModal({
        clusterCount: classifiedData ? (classifiedData.totalEcosystemCount || 0) : 50
      });
      return;
    }

    const targetData = reorgClassifiedData || classifiedData;
    const ecoCount = targetData ? (targetData.totalEcosystemCount || 0) : 0;
    const nonEcoCount = (reorgConfig.includeUncategorized && targetData)
      ? (targetData.totalUncategorizedCount || (targetData.nonEcosystemItems ? targetData.nonEcosystemItems.length : 0))
      : 0;
    const totalEligible = ecoCount + nonEcoCount;

    if (!targetData || totalEligible === 0) {
      const noReorgMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.noReorganizeItems") : "No bookmarks detected for reorganization.";
      showToast(noReorgMsg, "info");
      return;
    }

    const uncatFolder = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("folder.uncat") : "📁 Uncategorized (By Domain)";
    const scopeKeyMap = {
      loose_only: "dashboard.scopeLooseOnly",
      titans_only: "dashboard.scopeTitansOnly",
      full_library: "dashboard.scopeFullLibrary"
    };
    const scopeLabel = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t(scopeKeyMap[reorgConfig.scope] || "dashboard.scopeLooseOnly")
      : reorgConfig.scope;
    const uncatAction = reorgConfig.includeUncategorized
      ? (typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.uncatActionMove", { uncatFolder }) : `Bucket into "${uncatFolder}"`)
      : (typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.uncatActionKeep") : "Keep in original folders");
    const uncatKept = reorgConfig.includeUncategorized ? 0 : (targetData.totalUncategorizedCount || 0);

    const confirmMsg = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("dialog.confirmReorganizeScoped", {
        scopeLabel,
        eligible: totalEligible,
        protected: lastProtectedCount + uncatKept,
        uncatAction
      })
      : `Reorganize ${totalEligible} bookmarks under "${scopeLabel}" (${lastProtectedCount + uncatKept} protected)?`;

    const confirmed = confirm(confirmMsg);
    if (!confirmed) return;

    // 1. 创建备份快照 (P1-7: 快照标题使用 i18n)
    await refreshFullTree();
    const reorgSnapLabel = typeof BHM_I18N !== "undefined"
      ? BHM_I18N.t("snapshot.beforeReorganize")
      : "Full bookmark ecosystem and domain reorganization snapshot";
    await safetyManager.createSnapshot(fullTree, reorgSnapLabel);

    // 2. 执行 Chrome 原生书签重组并接住真实统计 (P0-C + v2.2.0 includeUncategorized)
    const reorgRes = await reorganizeInChrome(targetData, {
      includeUncategorized: !!reorgConfig.includeUncategorized
    });
    if (!reorgRes || reorgRes.aborted) return;

    // 3. 刷新书签并重绘
    cachedSysFolders = await getSystemFolders();
    allBookmarks = await loadBookmarks();
    statTotalBm.textContent = allBookmarks.length.toLocaleString();
    recomputeDuplicatesAndEcosystems();
    await renderSnapshots();

    if (reorgRes.failedCount > 0) {
      showToast(
        typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("toast.reorganizePartial", { moved: reorgRes.movedCount, failed: reorgRes.failedCount })
          : `Ecosystem reorganization moved ${reorgRes.movedCount} bookmarks, ${reorgRes.failedCount} failed.`,
        "warning"
      );
    } else if (reorgRes.movedCount === 0) {
      showToast(
        typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("toast.reorganizeAlreadySorted")
          : "All matching bookmarks are already in their target folders.",
        "info"
      );
    } else {
      showToast(
        typeof BHM_I18N !== "undefined"
          ? BHM_I18N.t("toast.reorganizeSuccess", { count: reorgRes.movedCount })
          : `🎉 Successfully reorganized ${reorgRes.movedCount} bookmarks!`,
        "success"
      );
    }
  });

  async function reorganizeInChrome(data, extraOptions = {}) {
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
      throttleMs: 50,
      includeUncategorized: extraOptions.includeUncategorized !== undefined ? extraOptions.includeUncategorized : true
    });
  }

  // ==========================================================================
  // TAB 3: 时光机快照与增量位移事务原位回滚
  // ==========================================================================

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
          QUARANTINE_DUPLICATES: typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.journalDuplicates") : "Duplicate Bookmarks Cleanup Transaction",
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
                // EXT-08 & P1-10: 若回滚的操作为死链或去重隔离且实际恢复条数 > 0，自动返还已扣减配额
                const jType = targetJ && (targetJ.actionType || targetJ.action);
                if ((jType === "QUARANTINE_DEAD" || jType === "QUARANTINE_DUPLICATES") && res.count > 0 && typeof LicenseManager !== "undefined" && LicenseManager.refundQuota) {
                  await LicenseManager.refundQuota(res.count);
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
              recomputeDuplicatesAndEcosystems();
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
            recomputeDuplicatesAndEcosystems();
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

  // 抽离异步许可证激活逻辑，供主 Tab 与 Paywall 弹窗共同 await (P1-13)
  async function activateLicenseKey(rawKey) {
    const key = String(rawKey || "").trim();
    if (!key) {
      const emptyMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.enterLicenseKey") : "Please enter your license key (e.g. BHM1...)";
      showToast(emptyMsg, "warning");
      return false;
    }

    let verification;
    if (typeof LicenseManager !== "undefined" && LicenseManager.verifyLicense) {
      verification = await LicenseManager.verifyLicense(key);
    } else {
      verification = { valid: false, reason: "LicenseManager module not ready" };
    }

    if (!verification || !verification.valid || !verification.tier || verification.tier === "FREE") {
      const reason = verification ? (verification.reason || verification.error || "License tier is not commercial Pro") : "Invalid license key format or verification failed";
      const failMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.activateFailed", { msg: reason }) : `Activation failed: ${reason}`;
      showToast(failMsg, "error");
      return false;
    }

    const tier = verification.tier;
    const isEn = typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() === "en" : true;
    const tierDisplay = isEn ? (verification.tierEnName || verification.tierName) : (verification.tierName || verification.tierEnName);

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await new Promise((resolve) => {
        chrome.storage.local.set({
          bhm_pro_activated: true,
          bhm_license_key: key,
          bhm_license_tier: tier,
          bhm_license_tier_name: verification.tierName,
          bhm_last_valid_time: Math.floor(Date.now() / 1000)
        }, resolve);
      });
      if (chrome.storage.sync) {
        try { chrome.storage.sync.set({ bhm_license_key: key }); } catch (_) {}
      }
      // 同步初始化单卡独立配额账本与 UI 状态
      await checkProStatus();
    } else {
      localStorage.setItem("bhm_pro_activated", "true");
      localStorage.setItem("bhm_license_key", key);
      localStorage.setItem("bhm_license_tier", tier);
      localStorage.setItem("bhm_license_tier_name", verification.tierName);
      isPro = true;
      proTier = tier;
      currentLicenseKey = key;
      updateProUI(true, key, tier, tierDisplay);
    }

    const succMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.activateSuccess", { tier: tierDisplay }) : `Congratulations! ${tierDisplay} activated successfully!`;
    showToast(succMsg, "success");
    return true;
  }

  activateLicenseBtn.addEventListener("click", async () => {
    if (isPro) {
      const confirmDeact = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("dialog.confirmDeactivate")
        : "Are you sure you want to deactivate the current commercial license?";

      if (confirm(confirmDeact)) {
        const deactMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("toast.deactivated") : "Commercial license deactivated successfully.";
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          await new Promise((resolve) => {
            chrome.storage.local.remove(["bhm_pro_activated", "bhm_license_key", "bhm_license_tier", "bhm_license_tier_name"], resolve);
          });
          if (chrome.storage.sync) {
            try { chrome.storage.sync.remove(["bhm_license_key"]); } catch (_) {}
          }
        } else {
          localStorage.removeItem("bhm_pro_activated");
          localStorage.removeItem("bhm_license_key");
          localStorage.removeItem("bhm_license_tier");
          localStorage.removeItem("bhm_license_tier_name");
        }
        isPro = false;
        proTier = "FREE";
        currentLicenseKey = null;
        updateProUI(false, null, "FREE");
        showToast(deactMsg, "info");
      }
      return;
    }

    await activateLicenseKey(licenseKeyInput.value);
  });

  // ==========================================================================
  // P0-1 & P1-1: 转化漏斗 Paywall Modal 与 资产诊断战报海报逻辑
  // ==========================================================================

  function openPaywallModal(data = {}) {
    if (isPro) return;
    if (!paywallModal) return;

    const deadCount = typeof data.deadCount === "number" ? data.deadCount : (probeResults ? probeResults.filter((r) => r.status === "DEAD").length : 0);
    const dupCount = typeof data.dupCount === "number" ? data.dupCount : allDuplicates.length;
    const clusterCount = typeof data.clusterCount === "number" ? data.clusterCount : (classifiedData ? (classifiedData.totalEcosystemCount || 0) : 0);
    const totalCount = allBookmarks ? allBookmarks.length : (deadCount + dupCount + clusterCount);
    const folderCount = Math.max(1, new Set((allBookmarks || []).map((b) => b.parentId).filter(Boolean)).size);

    // 动态计算预计节省分钟数
    const savedMins = Math.max(15, Math.ceil((deadCount * 12 + dupCount * 8 + clusterCount * 15) / 60));

    if (paywallHeadline && typeof BHM_I18N !== "undefined") {
      paywallHeadline.textContent = BHM_I18N.t("paywall.headlineDynamic", { deadCount, dupCount, folderCount });
    } else {
      if (pwDeadCount) pwDeadCount.textContent = deadCount.toString();
      if (pwDupCount) pwDupCount.textContent = dupCount.toString();
    }

    if (paywallSubheadline && typeof BHM_I18N !== "undefined") {
      paywallSubheadline.textContent = BHM_I18N.t("paywall.subheadlinePain", { totalCount, savedMinutes: savedMins });
    } else if (pwSavedMinutes) {
      pwSavedMinutes.textContent = savedMins.toString();
    }

    // 动态更新 CTA 按钮文案
    const buyLtdBtn = document.getElementById("paywallBuyLtdBtn");
    if (buyLtdBtn && typeof BHM_I18N !== "undefined") {
      buyLtdBtn.textContent = BHM_I18N.t("paywall.ctaLifetime", { savedMinutes: savedMins });
    }

    paywallModal.classList.remove("hidden");
  }

  function closePaywallModal() {
    if (paywallModal) paywallModal.classList.add("hidden");
  }

  if (closePaywallBtn) {
    closePaywallBtn.addEventListener("click", closePaywallModal);
  }

  if (paywallViralUnlockBtn) {
    paywallViralUnlockBtn.addEventListener("click", () => {
      closePaywallModal();
      if (generateHealthCardBtn) generateHealthCardBtn.click();
    });
  }

  if (paywallActivateBtn && paywallLicenseInput) {
    paywallActivateBtn.addEventListener("click", async () => {
      const key = paywallLicenseInput.value.trim();
      if (licenseKeyInput) licenseKeyInput.value = key;
      const ok = await activateLicenseKey(key);
      if (ok && isPro) {
        closePaywallModal();
      }
    });
  }

  if (generateHealthCardBtn) {
    generateHealthCardBtn.addEventListener("click", async () => {
      try {
        generateHealthCardBtn.disabled = true;
        const genText = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("viral.generating") : "Rendering report...";
        generateHealthCardBtn.textContent = `⏳ ${genText}`;

        const deadCount = probeResults ? probeResults.filter((r) => r.status === "DEAD").length : 0;
        const dupCount = allDuplicates.length;
        const ecoCount = classifiedData ? (classifiedData.totalEcosystemCount || 0) : 0;
        const collabDocsCount = classifiedData?.ecosystemGroups?.ugc_docs?.totalCount || 0;
        const totalBookmarks = allBookmarks ? allBookmarks.length : 0;
        const healthScore = parseInt(statHealthScore.textContent, 10) || 100;
        const techRatio = totalBookmarks > 0 ? (ecoCount / totalBookmarks) : 0;

        if (typeof HealthCardGenerator !== "undefined") {
          await HealthCardGenerator.exportAndUnlockTrial({
            totalBookmarks,
            deadCount,
            dupCount,
            ecoCount,
            collabDocsCount,
            healthScore,
            techRatio
          });
          const succMsg = typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("viral.downloadSuccessToast")
            : "🎉 Health Report downloaded! 50 dead-link batch cleanup quota unlocked locally!";
          showToast(succMsg, "success");

          // 刷新本地配额与状态
          await checkProStatus();
        }
      } catch (err) {
        showToast("Export error: " + err.message, "error");
      } finally {
        generateHealthCardBtn.disabled = false;
        generateHealthCardBtn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("viral.btnGenerate") : "📊 导出资产诊断战报";
      }
    });
  }

  // 工具函数：HTML 转义防注入
  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // P0-1: 全部 DOM 引用与事件监听器就绪后再执行初始化渲染，彻底杜绝 TDZ 与未绑定竞争
  await initDashboard();
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
    getReorgPreferences,
    saveReorgPreferences,
    getTopLevelRootIds,
    extractUserFoldersFromTree,
    collectProtectedSubtreeIds,
    filterBookmarksForReorganize,
    loadActiveBookmarksFromChrome,
    reorganizeBookmarksInChrome
  };
}
