document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("searchInput");
  const ecoTabs = document.getElementById("ecoTabs");
  const contentList = document.getElementById("contentList");
  const statusText = document.getElementById("statusText");
  const fullDashboardBtn = document.getElementById("fullDashboardBtn");
  const bookmarkCurrentBtn = document.getElementById("bookmarkCurrentBtn");
  const refreshSideBtn = document.getElementById("refreshSideBtn");
  const langToggleBtn = document.getElementById("langToggleBtn");

  // 初始化双语引擎
  if (typeof BHM_I18N !== "undefined") {
    await BHM_I18N.init();
  }

  const rules = (window.ECOSYSTEM_RULES || (typeof ECOSYSTEM_RULES !== "undefined" ? ECOSYSTEM_RULES : []));
  let classifier = new (window.EcosystemClassifier || (typeof EcosystemClassifier !== "undefined" ? EcosystemClassifier : null))(
    rules,
    { lang: typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() : "en" }
  );

  let currentEcoFilter = "all";

  // 绑定语言切换按钮
  if (langToggleBtn && typeof BHM_I18N !== "undefined") {
    langToggleBtn.addEventListener("click", async () => {
      await BHM_I18N.toggleLang();
    });
  }

  // 动态渲染 16 大生态 Tab
  function renderEcoTabs() {
    if (!ecoTabs || rules.length === 0) return;
    const isEn = typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() === "en" : true;
    const allText = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("sidepanel.tabAll") : "🌟 All";

    let tabsHtml = `<div class="eco-tab ${currentEcoFilter === "all" ? "active" : ""}" data-eco="all">${allText}</div>`;
    for (const r of rules) {
      const activeClass = currentEcoFilter === r.id ? "active" : "";
      let displayName = r.name;
      if (isEn) {
        displayName = r.enName || r.name;
        // 缩短英文 Tab 展示
        displayName = displayName.replace(/\s*Ecosystem\s*/i, "").trim();
      } else {
        displayName = displayName.replace(/官方全生态|全生态/g, "");
      }
      tabsHtml += `<div class="eco-tab ${activeClass}" data-eco="${r.id}">${r.icon} ${displayName}</div>`;
    }
    ecoTabs.innerHTML = tabsHtml;
  }

  renderEcoTabs();

  let allBookmarks = [];
  let classifiedData = null;

  // 分批懒加载配置与状态
  const PAGE_SIZE = 100;
  let currentDisplayList = [];
  let renderedCount = 0;
  let highlightedIndex = -1;

  // 打开全景大盘
  if (fullDashboardBtn) {
    fullDashboardBtn.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open("dashboard.html", "_blank");
      }
    });
  }

  // 收藏当前正在浏览的标签页
  if (bookmarkCurrentBtn) {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
      bookmarkCurrentBtn.addEventListener("click", () => {
        const doBookmarkTab = () => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs && tabs[0];
            if (tab && tab.url) {
              if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
                const msg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("sidepanel.cantBookmarkSystem") : "Cannot bookmark internal browser system pages";
                alert(msg);
                return;
              }
              chrome.bookmarks.create({
                parentId: "1",
                title: tab.title || tab.url,
                url: tab.url
              }, () => {
                if (chrome.runtime && chrome.runtime.lastError) {
                  const failTpl = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("sidepanel.bookmarkFailed", { msg: chrome.runtime.lastError.message }) : ("Bookmark failed: " + chrome.runtime.lastError.message);
                  alert(failTpl);
                } else {
                  const orig = bookmarkCurrentBtn.textContent;
                  bookmarkCurrentBtn.textContent = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("sidepanel.bookmarked") : "✅ Saved";
                  setTimeout(() => { bookmarkCurrentBtn.textContent = orig; }, 1500);
                  scheduleReload();
                }
              });
            } else if (chrome.permissions && chrome.permissions.request) {
              chrome.permissions.request({ origins: ["*://*/*"] }, (granted) => {
                if (granted) doBookmarkTab();
              });
            }
          });
        };
        doBookmarkTab();
      });
    } else {
      bookmarkCurrentBtn.style.display = "none";
    }
  }

  // 手动刷新按钮
  if (refreshSideBtn) {
    refreshSideBtn.addEventListener("click", () => {
      scheduleReload();
    });
  }

  // 读取所有书签
  async function loadBookmarks() {
    if (typeof chrome !== "undefined" && chrome.bookmarks && chrome.bookmarks.getTree) {
      return new Promise((resolve) => {
        chrome.bookmarks.getTree((tree) => {
          const list = [];
          function traverse(nodes) {
            for (const n of nodes) {
              if (n.url) {
                list.push({ id: n.id, title: n.title, url: n.url, parentId: n.parentId });
              }
              if (n.children) traverse(n.children);
            }
          }
          traverse(tree);
          resolve(list);
        });
      });
    } else {
      // 离线/开发模式测试数据
      return [
        { id: "1", title: "Google Cloud 控制台", url: "https://cloud.google.com" },
        { id: "2", title: "华为 HarmonyOS 开发者官网", url: "https://developer.huawei.com/consumer/cn/harmonyos/" },
        { id: "3", title: "GitHub 官方主站", url: "https://github.com" },
        { id: "4", title: "腾讯混元大模型", url: "https://hunyuan.tencent.com/" },
        { id: "5", title: "阿里云百炼大模型平台", url: "https://bailian.console.aliyun.com" },
        { id: "6", title: "字节跳动剪映小云雀 AI", url: "https://xyq.jianying.com/" },
        { id: "7", title: "ChatGPT 官方消费级入口", url: "https://chatgpt.com" },
        { id: "8", title: "Anthropic Claude 助手", url: "https://claude.ai" },
        { id: "9", title: "Cloudflare 全球管理控制台", url: "https://dash.cloudflare.com" },
        { id: "10", title: "Apple Developer 中心", url: "https://developer.apple.com" }
      ];
    }
  }

  // 实时同步书签变更：监听 Chrome 书签事件并 150ms 防抖自动刷新
  let reloadTimer = null;
  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
      allBookmarks = await loadBookmarks();
      if (classifier) {
        classifiedData = classifier.classifyAll(allBookmarks);
      }
      renderList();
    }, 150);
  }

  if (typeof chrome !== "undefined" && chrome.bookmarks) {
    if (chrome.bookmarks.onCreated) chrome.bookmarks.onCreated.addListener(scheduleReload);
    if (chrome.bookmarks.onRemoved) chrome.bookmarks.onRemoved.addListener(scheduleReload);
    if (chrome.bookmarks.onChanged) chrome.bookmarks.onChanged.addListener(scheduleReload);
    if (chrome.bookmarks.onMoved) chrome.bookmarks.onMoved.addListener(scheduleReload);
  }

  // 监听多语言切换事件
  window.addEventListener("bhm:langchange", (e) => {
    const lang = (e && e.detail && e.detail.lang) || (typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() : "en");
    classifier = new (window.EcosystemClassifier || (typeof EcosystemClassifier !== "undefined" ? EcosystemClassifier : null))(rules, { lang });
    if (classifier && allBookmarks.length > 0) {
      classifiedData = classifier.classifyAll(allBookmarks);
    }
    renderEcoTabs();
    renderList();
  });

  // 初始加载
  allBookmarks = await loadBookmarks();
  if (classifier) {
    classifiedData = classifier.classifyAll(allBookmarks);
  }
  renderList();

  // 重新计算并初次渲染列表
  function renderList() {
    const query = searchInput.value.trim().toLowerCase();
    let displayList = [];

    // 根据生态筛选
    if (currentEcoFilter === "all") {
      displayList = allBookmarks;
    } else if (classifiedData && classifiedData.ecosystemGroups[currentEcoFilter]) {
      const group = classifiedData.ecosystemGroups[currentEcoFilter];
      for (const subId of Object.keys(group.subcategories)) {
        displayList.push(...group.subcategories[subId].items);
      }
    }

    // 根据搜索过滤
    if (query) {
      displayList = displayList.filter(item =>
        (item.title || "").toLowerCase().includes(query) ||
        (item.url || "").toLowerCase().includes(query)
      );
    }

    currentDisplayList = displayList;
    renderedCount = 0;
    highlightedIndex = -1;
    contentList.innerHTML = "";

    if (displayList.length === 0) {
      const noMatchesMsg = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("sidepanel.noMatches") : "No matching bookmarks found";
      const totalZero = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("sidepanel.totalCount", { count: 0 }) : "0 bookmarks in total";
      contentList.innerHTML = `
        <div style="text-align: center; color: var(--muted); padding: 40px 10px;">
          <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
          <div>${noMatchesMsg}</div>
        </div>
      `;
      statusText.textContent = totalZero;
      return;
    }

    appendNextBatch();
  }

  // 分批顺滑懒加载核心函数
  function appendNextBatch() {
    if (renderedCount >= currentDisplayList.length) return;

    // 移除已有的兜底加载更多按钮
    const oldLoadMore = contentList.querySelector(".load-more-container");
    if (oldLoadMore) oldLoadMore.remove();

    const batch = currentDisplayList.slice(renderedCount, renderedCount + PAGE_SIZE);
    const isEn = typeof BHM_I18N !== "undefined" ? BHM_I18N.getLang() === "en" : true;
    const copyTitle = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("sidepanel.copyTitle") : "Copy URL";
    const deleteTitle = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("sidepanel.deleteTitle") : "Delete Bookmark";

    const htmlParts = batch.map((item, idx) => {
      const absoluteIdx = renderedCount + idx;
      const cls = classifier ? classifier.classify(item) : { isEcosystem: false };
      const icon = cls.isEcosystem ? cls.icon : "🔗";
      const tagText = cls.isEcosystem ? (isEn ? (cls.ecoEnName || cls.ecoName) : cls.ecoName) : "";
      const tag = cls.isEcosystem
        ? `<span style="font-size: 10px; background: rgba(59,130,246,0.15); color: #60a5fa; padding: 1px 5px; border-radius: 4px; white-space: nowrap;">${tagText}</span>`
        : "";

      const isHttp = /^https?:\/\//i.test(item.url || "");
      const safeHref = isHttp ? escapeHtml(item.url) : "#";
      const targetAttr = isHttp ? `target="_blank" rel="noopener noreferrer"` : "";

      return `
        <a class="item-card" href="${safeHref}" ${targetAttr} data-index="${absoluteIdx}" data-id="${item.id}">
          <div style="font-size: 16px; flex-shrink: 0;">${icon}</div>
          <div class="item-info">
            <div class="item-title">${escapeHtml(item.title || item.url)}</div>
            <div class="item-url">${escapeHtml(item.url)}</div>
          </div>
          ${tag}
          <div class="card-actions">
            <button class="card-action-btn btn-copy" title="${copyTitle}" data-url="${escapeHtml(item.url)}">📋</button>
            <button class="card-action-btn btn-delete" title="${deleteTitle}" data-id="${item.id}" data-title="${escapeHtml(item.title || item.url)}">🗑️</button>
          </div>
        </a>
      `;
    }).join("");

    contentList.insertAdjacentHTML("beforeend", htmlParts);
    renderedCount += batch.length;

    // 状态栏与兜底加载更多按钮
    if (renderedCount >= currentDisplayList.length) {
      statusText.textContent = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("sidepanel.totalCount", { count: currentDisplayList.length })
        : `${currentDisplayList.length} bookmarks in total`;
    } else {
      statusText.textContent = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("sidepanel.loadedCount", { rendered: renderedCount, total: currentDisplayList.length })
        : `Loaded ${renderedCount} / ${currentDisplayList.length} bookmarks`;
      const remaining = currentDisplayList.length - renderedCount;
      const loadMoreLabel = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("sidepanel.loadMore", { remaining })
        : `Load More (${remaining} remaining)`;

      const loadMoreContainer = document.createElement("div");
      loadMoreContainer.className = "load-more-container";
      loadMoreContainer.innerHTML = `
        <button class="load-more-btn" id="loadMoreBtn">
          ${loadMoreLabel}
        </button>
      `;
      contentList.appendChild(loadMoreContainer);

      const loadMoreBtn = loadMoreContainer.querySelector("#loadMoreBtn");
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
          appendNextBatch();
        });
      }
    }
  }

  // 滚动触底自动加载下一批
  contentList.addEventListener("scroll", () => {
    if (contentList.scrollTop + contentList.clientHeight >= contentList.scrollHeight - 120) {
      appendNextBatch();
    }
  });

  // 卡片内快捷操作（复制与删除）事件委托
  contentList.addEventListener("click", async (e) => {
    // 复制按钮
    const copyBtn = e.target.closest(".btn-copy");
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const url = copyBtn.getAttribute("data-url");
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
          const orig = copyBtn.textContent;
          copyBtn.textContent = "✅";
          setTimeout(() => { copyBtn.textContent = orig; }, 1200);
        } catch (err) {
          console.error("复制失败:", err);
        }
      }
      return;
    }

    // 删除按钮 (P1-10: 免费版配额校验与授权判定)
    const delBtn = e.target.closest(".btn-delete");
    if (delBtn) {
      e.preventDefault();
      e.stopPropagation();

      // EXT-02: 统一调用 LicenseManager 强校验 Ed25519 签名与配额
      let proStatus = { isPro: false, tier: "FREE" };
      if (typeof LicenseManager !== "undefined" && LicenseManager.checkProStatus) {
        proStatus = await LicenseManager.checkProStatus();
      } else {
        let storageData = {};
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          storageData = await new Promise((r) => {
            chrome.storage.local.get(["bhm_pro_activated", "bhm_license_tier"], (res) => r(res || {}));
          });
        }
        proStatus = { isPro: storageData.bhm_pro_activated === true, tier: storageData.bhm_license_tier || "FREE" };
      }

      const isPaidTier = Boolean(proStatus.isPro && (proStatus.tier === "LTD" || proStatus.tier === "PRO" || proStatus.tier === "SINGLE_WASH"));

      // 单次清洗卡与免费版统一配额审查
      if (proStatus.tier === "SINGLE_WASH" || !isPaidTier) {
        let remaining = 10;
        if (typeof LicenseManager !== "undefined" && LicenseManager.getRemainingQuota) {
          remaining = await LicenseManager.getRemainingQuota(proStatus.tier);
        } else {
          let used = 0;
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            const data = await new Promise((r) => chrome.storage.local.get(["bhm_free_quota_used", "bhm_quota_used"], (res) => r(res || {})));
            used = Math.max(data.bhm_free_quota_used || 0, data.bhm_quota_used || 0);
          }
          remaining = Math.max(0, 10 - used);
        }

        if (remaining <= 0) {
          const quotaExceededMsg = typeof BHM_I18N !== "undefined"
            ? BHM_I18N.t("sidepanel.quotaExceeded")
            : "Quota limit reached. Please upgrade to Pro in Dashboard to continue.";
          alert(quotaExceededMsg);
          return;
        }
      }

      const id = delBtn.getAttribute("data-id");
      const fallbackTitle = typeof BHM_I18N !== "undefined" ? BHM_I18N.t("dashboard.untitledBookmark") : "Untitled";
      const title = delBtn.getAttribute("data-title") || fallbackTitle;
      const confirmMsg = typeof BHM_I18N !== "undefined"
        ? BHM_I18N.t("sidepanel.deleteConfirm", { title })
        : `Are you sure you want to permanently delete "${title}"?`;

      if (confirm(confirmMsg)) {
        if (typeof chrome !== "undefined" && chrome.bookmarks && chrome.bookmarks.remove) {
          chrome.bookmarks.remove(id, async () => {
            if (chrome.runtime && chrome.runtime.lastError) {
              const failMsg = typeof BHM_I18N !== "undefined"
                ? BHM_I18N.t("sidepanel.deleteFailed", { msg: chrome.runtime.lastError.message })
                : `Delete failed: ${chrome.runtime.lastError.message}`;
              alert(failMsg);
            } else {
              if (typeof LicenseManager !== "undefined" && LicenseManager.consumeQuota) {
                await LicenseManager.consumeQuota(1);
              }
              allBookmarks = allBookmarks.filter((b) => b.id !== id);
              if (classifier) classifiedData = classifier.classifyAll(allBookmarks);
              renderList();
            }
          });
        } else {
          if (typeof LicenseManager !== "undefined" && LicenseManager.consumeQuota) {
            await LicenseManager.consumeQuota(1);
          }
          allBookmarks = allBookmarks.filter((b) => b.id !== id);
          if (classifier) classifiedData = classifier.classifyAll(allBookmarks);
          renderList();
        }
      }
      return;
    }
  });

  // 键盘快捷键支持：按 / 或 Ctrl+K 聚焦搜索框；上下方向键导航卡片；Enter 打开
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    // 列表键盘上下键导航
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const cards = contentList.querySelectorAll(".item-card");
      if (cards.length === 0) return;

      e.preventDefault();
      if (e.key === "ArrowDown") {
        highlightedIndex = (highlightedIndex + 1) % cards.length;
      } else if (e.key === "ArrowUp") {
        highlightedIndex = highlightedIndex <= 0 ? cards.length - 1 : highlightedIndex - 1;
      }

      cards.forEach((card, idx) => {
        if (idx === highlightedIndex) {
          card.classList.add("keyboard-highlight");
          card.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } else {
          card.classList.remove("keyboard-highlight");
        }
      });
      return;
    }

    // Enter 打开高亮卡片
    if (e.key === "Enter" && highlightedIndex >= 0) {
      const cards = contentList.querySelectorAll(".item-card");
      const targetCard = cards[highlightedIndex];
      if (targetCard) {
        const url = targetCard.getAttribute("href");
        if (url && url !== "#") {
          e.preventDefault();
          window.open(url, "_blank");
        }
      }
    }
  });

  // 监听生态切换 Tab
  ecoTabs.addEventListener("click", (e) => {
    const tab = e.target.closest(".eco-tab");
    if (!tab) return;
    document.querySelectorAll(".eco-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentEcoFilter = tab.dataset.eco;
    renderList();
  });

  // 监听搜索输入 (EXT-09: 120ms 防抖防重排)
  let searchDebounceTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(renderList, 120);
  });

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
