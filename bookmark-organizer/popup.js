document.addEventListener("DOMContentLoaded", async () => {
  const totalCountEl = document.getElementById("totalCount");
  const ecoCountEl = document.getElementById("ecoCount");
  const proBadge = document.getElementById("proBadge");
  const langToggleBtn = document.getElementById("langToggleBtn");
  const openSidePanelBtn = document.getElementById("openSidePanelBtn");
  const openDashboardBtn = document.getElementById("openDashboardBtn");

  // 初始化双语引擎
  if (typeof BHM_I18N !== "undefined") {
    await BHM_I18N.init();
  }

  let currentTotal = null;
  let currentTier = "FREE";

  // 绑定语言切换按钮
  if (langToggleBtn && typeof BHM_I18N !== "undefined") {
    langToggleBtn.addEventListener("click", async () => {
      await BHM_I18N.toggleLang();
    });
  }

  // 渲染动态文本与徽章
  function refreshDynamicTexts() {
    if (typeof BHM_I18N === "undefined") return;

    // 书签总数
    if (currentTotal !== null) {
      totalCountEl.textContent = BHM_I18N.t("popup.countUnit", { count: currentTotal });
    } else {
      totalCountEl.textContent = BHM_I18N.t("popup.localMode");
    }

    // 生态矩阵状态
    ecoCountEl.textContent = BHM_I18N.t("popup.ecoCountVal");

    // 授权等级标签
    if (proBadge) {
      if (currentTier === "LTD" || currentTier === "PRO") {
        proBadge.textContent = BHM_I18N.t("popup.ltdEdition");
        proBadge.className = "tag-pro ltd";
      } else if (currentTier === "SINGLE_WASH") {
        proBadge.textContent = BHM_I18N.t("popup.washEdition");
        proBadge.className = "tag-pro";
      } else {
        proBadge.textContent = BHM_I18N.t("popup.freeEdition");
        proBadge.className = "tag-pro free";
      }
    }
  }

  // 监听语言切换事件
  window.addEventListener("bhm:langchange", () => {
    refreshDynamicTexts();
  });

  // 读取授权状态
  if (typeof LicenseManager !== "undefined" && LicenseManager.checkProStatus) {
    try {
      const status = await LicenseManager.checkProStatus();
      currentTier = status.tier || (status.isPro ? "LTD" : "FREE");
    } catch (e) {
      currentTier = "FREE";
    }
  }

  // 读取原生书签树
  if (typeof chrome !== "undefined" && chrome.bookmarks && chrome.bookmarks.getTree) {
    chrome.bookmarks.getTree((tree) => {
      let total = 0;
      function count(nodes) {
        for (const n of nodes) {
          if (n.url) total++;
          if (n.children) count(n.children);
        }
      }
      count(tree);
      currentTotal = total;
      refreshDynamicTexts();
    });
  } else {
    currentTotal = null;
    refreshDynamicTexts();
  }

  // 打开原生侧边栏 (Side Panel)
  if (openSidePanelBtn) {
    openSidePanelBtn.addEventListener("click", async () => {
      if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.open) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
          window.close();
        }
      } else if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
        window.close();
      }
    });
  }

  // 打开全景大盘 (Dashboard)
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
      }
      window.close();
    });
  }
});
