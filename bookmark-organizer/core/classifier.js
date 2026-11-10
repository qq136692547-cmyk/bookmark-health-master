// ============================================================================
// 16 大科技巨头官方全生态智能聚类引擎 (Domain-Authoritative Classifier)
// ============================================================================

const rulesModule = (typeof require !== "undefined")
  ? require("./ecosystem_rules.js")
  : (typeof window !== "undefined" ? window : global);

const ECOSYSTEMS = rulesModule.ECOSYSTEM_RULES || [];

const UGC_NAMES = {
  zh: {
    ecoName: "协同文档与云端知识库",
    ecoFolderName: "📄 协同文档与云端知识库 (Docs & Knowledge Base)",
    google_docs: "Google Docs 在线文档",
    feishu_lark: "飞书/Lark 云文档与多维表格",
    yuque: "语雀知识库与数字花园",
    notion: "Notion 工作区与个人笔记",
    docs_portal: "在线文档与协同知识库"
  },
  en: {
    ecoName: "Docs & Knowledge Base",
    ecoFolderName: "📄 Docs & Knowledge Base",
    google_docs: "Google Docs & Drive",
    feishu_lark: "Feishu / Lark Docs & Base",
    yuque: "Yuque Knowledge Base",
    notion: "Notion Workspace & Notes",
    docs_portal: "Collaborative Docs & Wiki"
  }
};

class EcosystemClassifier {
  constructor(customRules = null, options = {}) {
    // 兼容首参传入 options 配置项
    if (customRules && !Array.isArray(customRules) && typeof customRules === "object" && customRules.lang) {
      options = customRules;
      customRules = null;
    }
    this.rules = (Array.isArray(customRules) && customRules.length > 0) ? customRules : ECOSYSTEMS;
    this.lang = (options && options.lang === "en") ? "en" : "zh";
  }

  /**
   * 规范化 URL（P0-7：保留 search 查询参数与 hash 锚点，小写协议与主机名，剥离 www，规整路径尾部斜杠，杜绝去重吞书签）
   */
  static normalizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    try {
      const u = new URL(rawUrl);
      const protocol = u.protocol.toLowerCase();
      const port = u.port ? `:${u.port}` : "";
      const host = u.hostname.replace(/^www\./i, "").toLowerCase() + port;
      let cleanPath = u.pathname.replace(/\/+$/, "");
      if (!cleanPath) {
        cleanPath = "/";
      }
      return `${protocol}//${host}${cleanPath}${u.search}${u.hash}`;
    } catch (e) {
      return rawUrl.trim();
    }
  }

  /**
   * 提取纯净主机名 (hostname)
   */
  static extractHostname(rawUrl) {
    try {
      const u = new URL(rawUrl);
      return u.hostname.toLowerCase().replace(/^www\./i, "");
    } catch (e) {
      return "";
    }
  }

  /**
   * 提取主域名 / 顶级注册域名 (eTLD+1) 或 Hostname (P0-5)
   */
  static extractMainDomain(rawUrl, fallback = "其它未知") {
    if (!rawUrl || typeof rawUrl !== "string") return fallback;
    try {
      const u = new URL(rawUrl);
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      if (!host) return fallback;
      // IP 地址或纯主机名 (如 localhost) 直接返回
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) || host.includes(":") || !host.includes(".")) {
        return host;
      }
      const parts = host.split(".");
      if (parts.length <= 2) {
        return host;
      }
      // 常见双后缀域名识别 (如 com.cn, net.cn, org.cn, co.uk 等)
      const secondTlds = [
        "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn",
        "co.uk", "org.uk", "me.uk", "ac.uk",
        "co.jp", "ne.jp", "com.tw", "org.tw", "idv.tw",
        "com.hk", "org.hk", "edu.hk",
        "com.au", "net.au", "org.au", "edu.au",
        "co.nz", "net.nz", "org.nz"
      ];
      const lastTwo = parts.slice(-2).join(".");
      if (secondTlds.includes(lastTwo) && parts.length >= 3) {
        return parts.slice(-3).join(".");
      }
      return parts.slice(-2).join(".");
    } catch (e) {
      return fallback;
    }
  }

  /**
   * 研判单个书签是否属于 16 大科技巨头官方生态或 UGC 协同文档
   */
  classify(bookmark) {
    const rawUrl = bookmark.url || "";
    const title = (bookmark.title || bookmark.name || "").trim();
    if (!rawUrl || !rawUrl.startsWith("http")) {
      return { isEcosystem: false };
    }

    let urlObj;
    try {
      urlObj = new URL(rawUrl);
    } catch (e) {
      return { isEcosystem: false };
    }

    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./i, "");
    const pathname = urlObj.pathname.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const isEn = this.lang === "en";
    const fallbackDomain = isEn ? "Other" : "其它未知";

    // 0. [UGC 防污染守卫]：多租户文档协同与个人知识库隔离
    let isUgcDocs = false;
    let ugcSubId = "docs_portal";

    if (
      hostname === "docs.google.com" ||
      hostname === "sheets.google.com" ||
      hostname === "slides.google.com" ||
      (hostname === "drive.google.com" && (pathname.includes("/drive/") || pathname.includes("/file/") || pathname.includes("/open") || pathname.includes("/folderview") || (urlObj.search && urlObj.search.includes("id="))))
    ) {
      isUgcDocs = true;
      ugcSubId = "google_docs";
    } else if (
      (hostname.includes("feishu.cn") || hostname.includes("larksuite.com")) &&
      (pathname.includes("/docx") || pathname.includes("/wiki") || pathname.includes("/file") || pathname.includes("/base") || pathname.includes("/sheets") || pathname.includes("/record") || pathname.includes("/minutes") || pathname.includes("/docs") || pathname.includes("/space") || pathname.includes("/drive"))
    ) {
      isUgcDocs = true;
      ugcSubId = "feishu_lark";
    } else if (hostname === "figma.com" || hostname.endsWith(".figma.com")) {
      // EXT-05: 隔离用户 Figma 协同设计画板与设计文档
      isUgcDocs = true;
      ugcSubId = "docs_portal";
    } else if (hostname === "yuque.com" || hostname.endsWith(".yuque.com")) {
      isUgcDocs = true;
      ugcSubId = "yuque";
    } else if (hostname === "notion.so" || hostname === "notion.site" || hostname.endsWith(".notion.so") || hostname.endsWith(".notion.site")) {
      isUgcDocs = true;
      ugcSubId = "notion";
    } else if (
      (hostname === "docs.qq.com" && (pathname.includes("/doc") || pathname.includes("/sheet") || pathname.includes("/slide") || pathname.includes("/d/"))) ||
      (hostname.includes("shimo.im") && pathname.length > 3) ||
      (hostname.includes("wolai.com") && pathname.length > 3) ||
      ((hostname.includes("sharepoint.com") || hostname.includes("onedrive.live.com")) && (pathname.includes("/:w:/") || pathname.includes("/:x:/") || pathname.includes("/:p:/") || pathname.includes("/doc")))
    ) {
      isUgcDocs = true;
      ugcSubId = "docs_portal";
    }

    if (isUgcDocs) {
      const ugcDict = isEn ? UGC_NAMES.en : UGC_NAMES.zh;
      return {
        isEcosystem: true,
        isUgcContainer: true,
        isUgcDoc: true,
        ecoId: "ugc_docs",
        ecoName: ugcDict.ecoName,
        ecoEnName: "Docs & Knowledge Base",
        ecoFolderName: ugcDict.ecoFolderName,
        icon: "📄",
        color: "#10B981",
        subcategoryId: ugcSubId,
        subcategoryName: ugcDict[ugcSubId] || ugcDict.docs_portal,
        matchedDomain: hostname,
        normalizedUrl: EcosystemClassifier.normalizeUrl(rawUrl)
      };
    }

    for (const eco of this.rules) {
      let isDomainMatch = false;

      // 1. 特殊守卫：GitHub 路径过滤（仅微软官方组织归入微软生态，放行普通第三方开源项目）
      if (eco.id === "microsoft" && (hostname === "github.com" || hostname.endsWith(".github.com"))) {
        const isOfficialMicrosoft = /^\/(microsoft|azure|dotnet|typescript-eslint|powershell|github)(\/|$)/i.test(pathname);
        const isGitHubRoot = pathname === "/" || pathname === "" || /^\/(features|pricing|explore|about|trending)(\/|$)/i.test(pathname);
        isDomainMatch = isOfficialMicrosoft || isGitHubRoot;
      } else {
        // 2. 权威官方域名匹配（必须是官方根域名或权威子域名）
        isDomainMatch = eco.officialDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));
      }

      if (isDomainMatch) {
        // 3. 细分路由到子分类
        let targetSub = null;

        // 优先依据子域名白名单匹配
        targetSub = eco.subcategories.find(sub =>
          sub.domainWhitelist.some(d => hostname === d || hostname.endsWith(`.${d}`))
        );

        // 其次依据标题正则细分
        if (!targetSub) {
          targetSub = eco.subcategories.find(sub =>
            sub.titleRegex && sub.titleRegex.test(lowerTitle)
          );
        }

        // 兜底至该生态默认分类
        if (!targetSub) {
          targetSub = eco.subcategories.find(sub => sub.isDefault) || eco.subcategories[0];
        }

        const ecoFolder = isEn ? `${eco.icon} ${eco.enName || eco.name}` : eco.folderName;
        const ecoDisplayName = isEn ? (eco.enName || eco.name) : eco.name;
        let subName = "综合官方服务";
        if (targetSub) {
          subName = isEn ? (targetSub.enName || targetSub.name) : targetSub.name;
        } else if (isEn) {
          subName = "Official Services";
        }

        return {
          isEcosystem: true,
          isUgcDoc: false,
          ecoId: eco.id,
          ecoName: ecoDisplayName,
          ecoEnName: eco.enName || eco.name,
          ecoFolderName: ecoFolder,
          icon: eco.icon,
          color: eco.color,
          subcategoryId: targetSub ? targetSub.id : "default",
          subcategoryName: subName,
          normalizedUrl: EcosystemClassifier.normalizeUrl(rawUrl)
        };
      }
    }

    return {
      isEcosystem: false,
      isUgcDoc: false,
      normalizedUrl: EcosystemClassifier.normalizeUrl(rawUrl),
      mainDomain: EcosystemClassifier.extractMainDomain(rawUrl, fallbackDomain)
    };
  }

  /**
   * 接口契约：单个书签分类别名
   */
  classifyBookmark(bookmark) {
    return this.classify(bookmark);
  }

  /**
   * 接口契约：批量书签分类 (P0-5 / P0-7)
   */
  classifyBookmarks(bookmarks) {
    return this.classifyAll(bookmarks);
  }

  /**
   * 批量聚类分析全量书签
   * P0-5: 为未命中 16 巨头与 UGC 的书签提供「📁 未分类 (按主域名建夹)」归拢出口，按主域名自动建夹
   * P0-7: 采用完整 URL 规范化键（保留 search 与 hash）精准去重，杜绝静默丢失有效书签
   */
  classifyAll(bookmarks) {
    const isEn = this.lang === "en";
    const ugcDict = isEn ? UGC_NAMES.en : UGC_NAMES.zh;
    const fallbackDomain = isEn ? "Other" : "其它未知";

    const ecosystemGroups = {};
    for (const eco of this.rules) {
      const ecoDisplayName = isEn ? (eco.enName || eco.name) : eco.name;
      const ecoFolder = isEn ? `${eco.icon} ${eco.enName || eco.name}` : eco.folderName;

      ecosystemGroups[eco.id] = {
        meta: {
          ...eco,
          name: ecoDisplayName,
          folderName: ecoFolder,
          zhFolderName: eco.folderName,
          enFolderName: `${eco.icon} ${eco.enName || eco.name}`
        },
        totalCount: 0,
        subcategories: {}
      };

      if (Array.isArray(eco.subcategories)) {
        for (const sub of eco.subcategories) {
          const subName = isEn ? (sub.enName || sub.name) : sub.name;
          ecosystemGroups[eco.id].subcategories[sub.id] = {
            meta: {
              ...sub,
              name: subName,
              zhName: sub.name,
              enName: sub.enName || sub.name
            },
            items: []
          };
        }
      }
    }

    // 防御性保障：无论 rules 传入如何，确保 ugc_docs 分组始终就绪且名称匹配语言
    if (!ecosystemGroups["ugc_docs"]) {
      ecosystemGroups["ugc_docs"] = {
        meta: {
          id: "ugc_docs",
          name: ugcDict.ecoName,
          enName: "Docs & Knowledge Base",
          folderName: ugcDict.ecoFolderName,
          icon: "📄",
          color: "#10B981",
          isUgcContainer: true
        },
        totalCount: 0,
        subcategories: {
          google_docs: { meta: { id: "google_docs", name: ugcDict.google_docs, zhName: UGC_NAMES.zh.google_docs, enName: UGC_NAMES.en.google_docs }, items: [] },
          feishu_lark: { meta: { id: "feishu_lark", name: ugcDict.feishu_lark, zhName: UGC_NAMES.zh.feishu_lark, enName: UGC_NAMES.en.feishu_lark }, items: [] },
          yuque: { meta: { id: "yuque", name: ugcDict.yuque, zhName: UGC_NAMES.zh.yuque, enName: UGC_NAMES.en.yuque }, items: [] },
          notion: { meta: { id: "notion", name: ugcDict.notion, zhName: UGC_NAMES.zh.notion, enName: UGC_NAMES.en.notion }, items: [] },
          docs_portal: { meta: { id: "docs_portal", name: ugcDict.docs_portal, zhName: UGC_NAMES.zh.docs_portal, enName: UGC_NAMES.en.docs_portal }, items: [] }
        }
      };
    } else {
      // 保持 ugc_docs 语言与当前实例完全一致
      ecosystemGroups["ugc_docs"].meta.name = ugcDict.ecoName;
      ecosystemGroups["ugc_docs"].meta.folderName = ugcDict.ecoFolderName;
      ecosystemGroups["ugc_docs"].meta.zhFolderName = UGC_NAMES.zh.ecoFolderName;
      ecosystemGroups["ugc_docs"].meta.enFolderName = UGC_NAMES.en.ecoFolderName;
      if (ecosystemGroups["ugc_docs"].subcategories) {
        for (const subId of Object.keys(ecosystemGroups["ugc_docs"].subcategories)) {
          if (ugcDict[subId]) {
            ecosystemGroups["ugc_docs"].subcategories[subId].meta.name = ugcDict[subId];
            ecosystemGroups["ugc_docs"].subcategories[subId].meta.zhName = UGC_NAMES.zh[subId] || ugcDict[subId];
            ecosystemGroups["ugc_docs"].subcategories[subId].meta.enName = UGC_NAMES.en[subId] || ugcDict[subId];
          }
        }
      }
    }

    // P0-5: 建立「📁 未分类 (按主域名建夹)」独立归拢出口
    const uncatFolderTitle = isEn ? "📁 Uncategorized (By Domain)" : "📁 未分类 (按主域名建夹)";
    const uncatName = isEn ? "Uncategorized (By Domain)" : "未分类 (按主域名建夹)";

    const uncategorizedGroup = {
      meta: {
        id: "uncategorized",
        name: uncatName,
        enName: "Uncategorized (By Domain)",
        folderName: uncatFolderTitle,
        icon: "📁",
        color: "#64748B",
        isUncategorizedContainer: true
      },
      name: uncatFolderTitle,
      folderName: uncatFolderTitle,
      totalCount: 0,
      subcategories: {}
    };

    const nonEcosystemItems = [];
    const dedupeSet = new Set();
    let totalEcosystemCount = 0;

    for (const bm of (bookmarks || [])) {
      const norm = EcosystemClassifier.normalizeUrl(bm.url);
      if (norm && dedupeSet.has(norm)) {
        // P0-7: 仅在完整规范化 URL 完全一致时方才去重，保留不同 query/hash 书签
        continue;
      }
      if (norm) {
        dedupeSet.add(norm);
      }

      const res = this.classify(bm);
      if (res.isEcosystem) {
        let group = ecosystemGroups[res.ecoId];
        if (!group) {
          group = ecosystemGroups[res.ecoId] = {
            meta: { id: res.ecoId, name: res.ecoName, icon: res.icon, color: res.color },
            totalCount: 0,
            subcategories: {}
          };
        }
        if (!group.subcategories[res.subcategoryId]) {
          group.subcategories[res.subcategoryId] = {
            meta: { id: res.subcategoryId, name: res.subcategoryName },
            items: []
          };
        }
        group.subcategories[res.subcategoryId].items.push({ ...bm, classification: res });
        group.totalCount++;
        totalEcosystemCount++;
      } else {
        // P0-5: 非 16 巨头生态书签按主域名自动建夹放入未分类
        const domain = res.mainDomain || EcosystemClassifier.extractMainDomain(bm.url, fallbackDomain) || fallbackDomain;
        if (!uncategorizedGroup.subcategories[domain]) {
          uncategorizedGroup.subcategories[domain] = {
            meta: { id: domain, name: domain, title: domain },
            id: domain,
            name: domain,
            items: []
          };
        }
        const nonEcoItem = {
          ...bm,
          classification: {
            ...res,
            ecoId: "uncategorized",
            ecoName: uncatName,
            ecoFolderName: uncatFolderTitle,
            subcategoryId: domain,
            subcategoryName: domain,
            mainDomain: domain
          }
        };
        uncategorizedGroup.subcategories[domain].items.push(nonEcoItem);
        uncategorizedGroup.totalCount++;
        nonEcosystemItems.push(nonEcoItem);
      }
    }

    // 挂载未分类分组到 ecosystemGroups 方便全景遍历
    ecosystemGroups["uncategorized"] = uncategorizedGroup;

    return {
      ecosystemGroups,
      uncategorizedGroup,
      nonEcosystemGroup: uncategorizedGroup,
      nonEcosystemItems,
      totalEcosystemCount,
      totalUncategorizedCount: uncategorizedGroup.totalCount,
      dedupedCount: dedupeSet.size
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { EcosystemClassifier };
} else {
  (typeof window !== "undefined" ? window : global).EcosystemClassifier = EcosystemClassifier;
}
