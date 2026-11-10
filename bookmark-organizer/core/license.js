// ============================================================================
// 商业化授权与双阶梯定价系统 (License Manager & Pricing Architecture v2.2)
// 支持: $9.90 单次大扫除卡 (30天/500条)、$24.90 终身买断卡 (LTD)
//       Ed25519 离线非对称签名验证 (Web Crypto API)
//       配额落盘与时效动态校验机制
// ============================================================================

class LicenseManager {
  static TIERS = {
    FREE: "FREE",
    SINGLE_WASH: "SINGLE_WASH",
    LTD: "LTD",
    PRO: "PRO"
  };

  static PRICING = {
    FREE: {
      price: 0,
      currency: "USD",
      name: "免费基础版 (Free Tier)",
      enName: "Free Tier",
      maxBookmarks: 10,
      validDays: Infinity
    },
    SINGLE_WASH: {
      price: 9.90,
      currency: "USD",
      name: "30天全量大扫除卡 (Single Wash Pass)",
      enName: "30-Day Single Wash Pass",
      maxBookmarks: 500,
      validDays: 30
    },
    LTD: {
      price: 24.90,
      currency: "USD",
      name: "Pro 终身买断授权 (Lifetime Buyout)",
      enName: "Pro Lifetime Buyout",
      maxBookmarks: Infinity,
      validDays: Infinity
    },
    PRO: {
      price: 24.90,
      currency: "USD",
      name: "Pro 终身买断授权 (Lifetime Buyout)",
      enName: "Pro Lifetime Buyout",
      maxBookmarks: Infinity,
      validDays: Infinity
    }
  };

  /**
   * 官方支付结算链接配置
   */
  static CHECKOUT_URLS = {
    SINGLE_WASH: "https://bhm-pro-ern.pages.dev/#pricing",
    LTD: "https://bhm-pro-ern.pages.dev/#pricing"
  };

  /**
   * 官方内置 Ed25519 签名验证公钥 (SPKI DER Base64 格式, 44 字节)
   * 仅内嵌公钥，私钥严格保存在发卡授权服务器，源码绝不含私钥与发卡逻辑
   */
  static PUBLIC_KEY_SPKI = "MCowBQYDK2VwAyEAkRXIO7wy+Js9GQ3+orKFGNBJFFs937STMNOAxuGNpZE=";

  static _cachedPublicKey = null;

  /**
   * 内置组织场景预设 (16大巨头矩阵 + 扩展工作流)
   */
  static BUILTIN_SCENARIOS = [
    {
      id: "titans_16",
      name: "16 大全球与中国科技巨头官方生态矩阵 (默认生产级场景)",
      enName: "16 Global & Chinese Tech Giants Official Ecosystem Matrix",
      description: "覆盖谷歌、华为、微软、苹果、腾讯、阿里、字节、亚马逊、Meta、OpenAI、英伟达、百度、小米、Anthropic、Cloudflare、京东",
      enDescription: "Covers Google, Huawei, Microsoft, Apple, Tencent, Alibaba, ByteDance, Amazon, Meta, OpenAI, NVIDIA, Baidu, Xiaomi, Anthropic, Cloudflare, and JD.com",
      isDefault: true
    },
    {
      id: "developer_cloud",
      name: "全栈开发者与云原生基础设施矩阵",
      enName: "Full-Stack Developer & Cloud-Native Infrastructure Matrix",
      description: "针对开发工程师定制：GitHub、GitLab、Vercel、Supabase、Docker、K8s 快速归拢",
      enDescription: "Tailored for software engineers: rapid clustering of GitHub, GitLab, Vercel, Supabase, Docker, and Kubernetes",
      isDefault: false
    },
    {
      id: "designer_creative",
      name: "UI/UX 设计师与创意工作流矩阵",
      enName: "UI/UX Designer & Creative Workflow Matrix",
      description: "Figma、Dribbble、Behance、Pinterest、Midjourney、ArtStation 智能分类",
      enDescription: "Intelligent classification for Figma, Dribbble, Behance, Pinterest, Midjourney, and ArtStation",
      isDefault: false
    },
    {
      id: "academic_research",
      name: "学术科研与论文文献知识库矩阵",
      enName: "Academic Research & Literature Repository Matrix",
      description: "arXiv、Google Scholar、IEEE Xplore、Nature、Science、PubMed 文献归类",
      enDescription: "Categorizes arXiv, Google Scholar, IEEE Xplore, Nature, Science, and PubMed literature",
      isDefault: false
    }
  ];

  /**
   * 获取或导入 Ed25519 CryptoKey 公钥实例
   */
  static async getPublicKey() {
    if (LicenseManager._cachedPublicKey) {
      return LicenseManager._cachedPublicKey;
    }
    const cryptoObj = (typeof globalThis !== "undefined" && globalThis.crypto) || (typeof crypto !== "undefined" ? crypto : null);
    if (!cryptoObj || !cryptoObj.subtle) {
      throw new Error("Web Crypto API (crypto.subtle) is not available");
    }

    const spkiBytes = LicenseManager._base64ToUint8Array(LicenseManager.PUBLIC_KEY_SPKI);
    LicenseManager._cachedPublicKey = await cryptoObj.subtle.importKey(
      "spki",
      spkiBytes,
      { name: "Ed25519" },
      true,
      ["verify"]
    );
    return LicenseManager._cachedPublicKey;
  }

  /**
   * 离线 Ed25519 签名验证引擎
   * 密钥格式: BHM1.<base64url(payload)>.<base64url(signature)>
   * Payload: { sub: string, exp: number, tier: "LTD"|"PRO"|"SINGLE_WASH", maxCleanQuota: number, iat: number }
   *
   * @param {string} licenseKey
   * @param {Object} [storageData=null]
   * @returns {Promise<{ valid: boolean, tier: string, tierName?: string, sub?: string, exp?: number, iat?: number, maxCleanQuota?: number, isExpired?: boolean, error?: string, reason?: string, features?: string[] }>}
   */
  static async verifyLicense(licenseKey, storageData = null) {
    if (!licenseKey || typeof licenseKey !== "string") {
      return {
        valid: false,
        tier: LicenseManager.TIERS.FREE,
        tierEnName: "Free Tier",
        error: "密钥为空或格式错误",
        reason: "密钥为空或格式错误"
      };
    }

    const trimmed = licenseKey.trim();

    // 格式检查: 必须为 BHM1.<payload>.<signature>
    const parts = trimmed.split(".");
    if (parts.length !== 3 || parts[0] !== "BHM1") {
      return {
        valid: false,
        tier: LicenseManager.TIERS.FREE,
        tierEnName: "Free Tier",
        error: "无效的激活码格式或缺少协议头",
        reason: "无效的激活码格式或缺少协议头"
      };
    }

    const payloadB64Url = parts[1];
    const sigB64Url = parts[2];

    if (!payloadB64Url || !sigB64Url) {
      return {
        valid: false,
        tier: LicenseManager.TIERS.FREE,
        tierEnName: "Free Tier",
        error: "激活码段缺失",
        reason: "激活码段缺失"
      };
    }

    // 解析 JSON Payload
    let payload;
    try {
      const payloadText = LicenseManager._base64UrlDecodeText(payloadB64Url);
      payload = JSON.parse(payloadText);
    } catch (e) {
      return {
        valid: false,
        tier: LicenseManager.TIERS.FREE,
        tierEnName: "Free Tier",
        error: "Payload 解析失败: " + e.message,
        reason: "Payload 解析失败"
      };
    }

    if (!payload || typeof payload !== "object") {
      return {
        valid: false,
        tier: LicenseManager.TIERS.FREE,
        tierEnName: "Free Tier",
        error: "Payload 结构无效",
        reason: "Payload 结构无效"
      };
    }

    // 检查有效期 exp (秒级时间戳)
    const nowSec = Math.floor(Date.now() / 1000);

    // EXT-07: 1. 签名签发时间 (iat) 合法性校验：当前系统时间早于签发时间 5 分钟以上判定为时钟异常
    if (typeof payload.iat === "number" && nowSec < payload.iat - 300) {
      return {
        valid: false,
        tier: LicenseManager.TIERS.FREE,
        tierEnName: "Free Tier",
        error: "System clock tampered (Current time is earlier than license issuance time)",
        reason: "System clock tampered"
      };
    }

    // EXT-07: 2. 检查单调历史时间高水位 (防回拨)
    let effectiveStorage = storageData;
    if (!effectiveStorage && typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      try {
        effectiveStorage = await new Promise((resolve) => {
          chrome.storage.local.get(["bhm_last_valid_time"], (items) => resolve(items || null));
        });
      } catch (_) {
        effectiveStorage = null;
      }
    }

    if (effectiveStorage && typeof effectiveStorage.bhm_last_valid_time === "number") {
      // 允许 60 秒时钟抖动偏差 (nowSec < highWatermark - 60)
      if (nowSec < effectiveStorage.bhm_last_valid_time - 60) {
        return {
          valid: false,
          tier: LicenseManager.TIERS.FREE,
          tierEnName: "Free Tier",
          error: "System clock tampered (Current time is earlier than last recorded valid time)",
          reason: "System clock tampered"
        };
      }
    }

    const rawTierUpper = String(payload.tier || "FREE").toUpperCase();
    const expSec = (typeof payload.exp === "number" && Number.isFinite(payload.exp))
      ? (payload.exp > 1e11 ? Math.floor(payload.exp / 1000) : payload.exp)
      : null;

    // P1-4: 30天大扫除卡 (SINGLE_WASH) 必须携带合法的有限过期时间 exp，严禁无 exp 变永久卡
    if (rawTierUpper === "SINGLE_WASH" && expSec === null) {
      return {
        valid: false,
        tier: LicenseManager.TIERS.FREE,
        tierEnName: "Free Tier",
        error: "Single Wash license requires a valid expiration timestamp (exp)",
        reason: "Single Wash license requires a valid expiration timestamp (exp)"
      };
    }

    if (expSec !== null && expSec <= nowSec) {
      return {
        valid: false,
        tier: LicenseManager.TIERS.FREE,
        tierEnName: "Free Tier",
        isExpired: true,
        error: "License has expired",
        reason: "License has expired"
      };
    }

    // 非对称数字签名校验 (Web Crypto API Ed25519)
    try {
      const cryptoObj = (typeof globalThis !== "undefined" && globalThis.crypto) || (typeof crypto !== "undefined" ? crypto : null);
      if (!cryptoObj || !cryptoObj.subtle) {
        return {
          valid: false,
          tier: LicenseManager.TIERS.FREE,
          tierEnName: "Free Tier",
          error: "Web Crypto API 不可用",
          reason: "Web Crypto API 不可用"
        };
      }

      const pubKey = await LicenseManager.getPublicKey();
      const sigBytes = LicenseManager._base64UrlToUint8Array(sigB64Url);

      // 支持验证 "BHM1." + payloadB64Url 以及 payloadB64Url
      const dataToVerify1 = new TextEncoder().encode(parts[0] + "." + parts[1]);
      let isVerified = await cryptoObj.subtle.verify(
        { name: "Ed25519" },
        pubKey,
        sigBytes,
        dataToVerify1
      );

      if (!isVerified) {
        const dataToVerify2 = new TextEncoder().encode(parts[1]);
        isVerified = await cryptoObj.subtle.verify(
          { name: "Ed25519" },
          pubKey,
          sigBytes,
          dataToVerify2
        );
      }

      if (!isVerified) {
        return {
          valid: false,
          tier: LicenseManager.TIERS.FREE,
          tierEnName: "Free Tier",
          error: "签名校验失败",
          reason: "签名校验失败"
        };
      }
    } catch (e) {
      return {
        valid: false,
        tier: LicenseManager.TIERS.FREE,
        tierEnName: "Free Tier",
        error: "签名验证异常: " + e.message,
        reason: "签名验证异常"
      };
    }

    // 验签通过，根据 Payload 映射授权阶梯与权益
    const rawTier = (payload.tier || "FREE").toUpperCase();
    let tier = LicenseManager.TIERS.FREE;
    let tierName = "免费基础版";
    let tierEnName = "Free Tier";
    let maxBookmarks = 10;
    let remainingWashes = 0;
    let features = [];

    if (rawTier === "LTD" || rawTier === "PRO") {
      tier = rawTier;
      tierName = "Pro 终身买断授权";
      tierEnName = "Pro Lifetime Buyout";
      maxBookmarks = (typeof payload.maxCleanQuota === "number") ? payload.maxCleanQuota : Infinity;
      remainingWashes = Infinity;
      features = ["UNLIMITED_CLEAN", "16_TITANS_REORGANIZE", "UGC_DOCS_ISOLATION", "CUSTOM_WORKFLOWS", "ATOMIC_ROLLBACK"];
    } else if (rawTier === "SINGLE_WASH") {
      tier = LicenseManager.TIERS.SINGLE_WASH;
      tierName = "30天全量大扫除卡";
      tierEnName = "30-Day Single Wash Pass";
      maxBookmarks = (typeof payload.maxCleanQuota === "number") ? payload.maxCleanQuota : 500;
      remainingWashes = 1;
      features = ["DEEP_CLEAN", "ATOMIC_ROLLBACK", "DO_H_PRIORITY"];
    }

    const expiryDate = (expSec !== null && expSec !== Infinity) ? expSec * 1000 : Infinity;

    // EXT-07: 验签通过后，若当前时间推进，异步更新本地单调高水位记录
    if (nowSec > (effectiveStorage?.bhm_last_valid_time || 0)) {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.set({ bhm_last_valid_time: nowSec });
        } catch (_) {}
      }
      if (effectiveStorage && typeof effectiveStorage === "object") {
        effectiveStorage.bhm_last_valid_time = nowSec;
      }
    }

    return {
      valid: true,
      tier,
      tierName,
      tierEnName,
      sub: payload.sub || payload.email,
      exp: payload.exp,
      iat: payload.iat,
      maxCleanQuota: payload.maxCleanQuota || maxBookmarks,
      maxBookmarks,
      expiryDate,
      remainingWashes,
      features,
      payload
    };
  }

  /**
   * 动态复核存储中的授权状态
   * 从 chrome.storage.local 读取 bhm_license_key 重新执行验签与过期校验
   * 若无效或过期，重置 bhm_pro_activated 为 false 并降级为 FREE
   */
  static async checkProStatus(storage = null) {
    const store = storage || (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null);
    if (!store) {
      return { isPro: false, tier: LicenseManager.TIERS.FREE };
    }

    const storedData = await new Promise((resolve) => {
      store.get([
        "bhm_license_key",
        "bhm_pro_activated",
        "bhm_quota_used",
        "bhm_free_quota_used",
        "bhm_wash_used_by_sig",
        "bhm_last_valid_time"
      ], (items) => {
        resolve(items || {});
      });
    });

    const key = storedData.bhm_license_key;
    const freeUsed = (typeof storedData.bhm_free_quota_used === "number")
      ? storedData.bhm_free_quota_used
      : ((typeof storedData.bhm_quota_used === "number") ? storedData.bhm_quota_used : 0);

    if (!key) {
      await new Promise((resolve) => {
        store.set({
          bhm_pro_activated: false,
          bhm_license_tier: LicenseManager.TIERS.FREE,
          bhm_quota_used: freeUsed
        }, resolve);
      });
      return { isPro: false, tier: LicenseManager.TIERS.FREE };
    }

    const verification = await LicenseManager.verifyLicense(key, storedData);
    // P1-3: 必须同时满足签名有效且授权等级高于 FREE，杜绝 tier="FREE" 签名卡被判定为 isPro=true
    const isPaidPro = Boolean(verification.valid && verification.tier && verification.tier !== LicenseManager.TIERS.FREE);

    if (!isPaidPro) {
      await new Promise((resolve) => {
        store.set({
          bhm_pro_activated: false,
          bhm_license_tier: LicenseManager.TIERS.FREE,
          bhm_quota_used: freeUsed,
          bhm_license_error: verification.error || verification.reason || "Free tier key is not a Pro license"
        }, resolve);
      });
      return {
        isPro: false,
        tier: LicenseManager.TIERS.FREE,
        error: verification.error || (verification.valid ? "Free tier key does not unlock Pro" : undefined)
      };
    }

    const nowSec = Math.floor(Date.now() / 1000);

    // P1-8: 按单张 $9.90 卡签名独立计量配额，购买新卡自动享全新 500 额度，重复粘贴旧卡不可重置额度
    const updatePayload = {
      bhm_pro_activated: true,
      bhm_license_tier: verification.tier,
      bhm_license_tier_name: verification.tierName,
      bhm_free_quota_used: freeUsed
    };

    updatePayload.bhm_last_valid_time = Math.max(nowSec, storedData.bhm_last_valid_time || 0);

    if (verification.tier === LicenseManager.TIERS.SINGLE_WASH) {
      const sigPart = String(key).trim().split(".")[2] || String(key).trim();
      const washMap = (storedData.bhm_wash_used_by_sig && typeof storedData.bhm_wash_used_by_sig === "object")
        ? { ...storedData.bhm_wash_used_by_sig }
        : {};
      if (typeof washMap[sigPart] !== "number") {
        washMap[sigPart] = 0;
      }
      updatePayload.bhm_wash_used_by_sig = washMap;
      updatePayload.bhm_quota_used = washMap[sigPart];
    }

    await new Promise((resolve) => {
      store.set(updatePayload, resolve);
    });

    return {
      isPro: true,
      tier: verification.tier,
      tierName: verification.tierName,
      tierEnName: verification.tierEnName,
      sub: verification.sub,
      exp: verification.exp,
      maxCleanQuota: verification.maxCleanQuota
    };
  }

  /**
   * 读取剩余配额 (根据阶梯上限与已消耗量计算)
   */
  static async getRemainingQuota(tier = "FREE", storage = null) {
    let maxQuota = 10;
    if (tier === "LTD" || tier === "PRO") {
      return Infinity;
    } else if (tier === "SINGLE_WASH") {
      maxQuota = 500;
    } else if (typeof tier === "number") {
      maxQuota = tier;
    } else if (typeof tier === "object" && tier !== null) {
      maxQuota = tier.maxCleanQuota || tier.maxBookmarks || 10;
    }

    if (maxQuota === Infinity) return Infinity;

    const store = storage || (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null);
    if (!store) return maxQuota;

    const data = await new Promise((resolve) => {
      store.get([
        "bhm_quota_used",
        "bhm_free_quota_used",
        "bhm_license_key",
        "bhm_license_tier",
        "bhm_wash_used_by_sig"
      ], (items) => resolve(items || {}));
    });

    let used = (data && typeof data.bhm_quota_used === "number") ? data.bhm_quota_used : 0;
    if (tier === "SINGLE_WASH" && data.bhm_license_key && data.bhm_wash_used_by_sig) {
      const sigPart = String(data.bhm_license_key).trim().split(".")[2] || String(data.bhm_license_key).trim();
      if (typeof data.bhm_wash_used_by_sig[sigPart] === "number") {
        used = data.bhm_wash_used_by_sig[sigPart];
      }
    } else if (tier === "FREE" && typeof data.bhm_free_quota_used === "number") {
      used = data.bhm_free_quota_used;
    }

    return Math.max(0, maxQuota - used);
  }

  /**
   * 扣减清理配额，持久化更新到 chrome.storage.local (同步维护 FREE 与单卡独立账本)
   */
  static async consumeQuota(count = 1, storage = null) {
    const store = storage || (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null);
    if (!store) return { success: false, used: 0 };

    const data = await new Promise((resolve) => {
      store.get([
        "bhm_quota_used",
        "bhm_free_quota_used",
        "bhm_license_key",
        "bhm_license_tier",
        "bhm_wash_used_by_sig"
      ], (items) => resolve(items || {}));
    });

    const currentUsed = (data && typeof data.bhm_quota_used === "number") ? data.bhm_quota_used : 0;
    const newUsed = currentUsed + count;
    const toSave = { bhm_quota_used: newUsed };

    if (data.bhm_license_tier === "SINGLE_WASH" && data.bhm_license_key) {
      const sigPart = String(data.bhm_license_key).trim().split(".")[2] || String(data.bhm_license_key).trim();
      const washMap = (data.bhm_wash_used_by_sig && typeof data.bhm_wash_used_by_sig === "object")
        ? { ...data.bhm_wash_used_by_sig }
        : {};
      washMap[sigPart] = ((typeof washMap[sigPart] === "number") ? washMap[sigPart] : currentUsed) + count;
      toSave.bhm_wash_used_by_sig = washMap;
      toSave.bhm_quota_used = washMap[sigPart];
    } else if (!data.bhm_license_tier || data.bhm_license_tier === "FREE") {
      const baseFree = (typeof data.bhm_free_quota_used === "number") ? data.bhm_free_quota_used : currentUsed;
      toSave.bhm_free_quota_used = baseFree + count;
    }

    await new Promise((resolve) => {
      store.set(toSave, resolve);
    });

    return { success: true, used: toSave.bhm_quota_used };
  }

  /**
   * EXT-08: 事务回滚时恢复/返还配额
   */
  static async refundQuota(count = 1, storage = null) {
    const store = storage || (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null);
    if (!store) return { success: false };

    const data = await new Promise((resolve) => {
      store.get([
        "bhm_quota_used",
        "bhm_free_quota_used",
        "bhm_license_key",
        "bhm_license_tier",
        "bhm_wash_used_by_sig"
      ], (items) => resolve(items || {}));
    });

    const toSave = {};
    if (typeof data.bhm_quota_used === "number") {
      toSave.bhm_quota_used = Math.max(0, data.bhm_quota_used - count);
    }
    if (data.bhm_license_tier === "SINGLE_WASH" && data.bhm_license_key && data.bhm_wash_used_by_sig) {
      const sigPart = String(data.bhm_license_key).trim().split(".")[2] || String(data.bhm_license_key).trim();
      const washMap = { ...data.bhm_wash_used_by_sig };
      if (typeof washMap[sigPart] === "number") {
        washMap[sigPart] = Math.max(0, washMap[sigPart] - count);
        toSave.bhm_wash_used_by_sig = washMap;
      }
    } else if (!data.bhm_license_tier || data.bhm_license_tier === "FREE") {
      if (typeof data.bhm_free_quota_used === "number") {
        toSave.bhm_free_quota_used = Math.max(0, data.bhm_free_quota_used - count);
      }
    }
    await new Promise((resolve) => {
      store.set(toSave, resolve);
    });
    return { success: true };
  }

  /**
   * 功能栅栏判定 (Feature Gating)
   */
  static canExecuteAction(action, tier = "FREE") {
    switch (action) {
      case "SCAN":
      case "EXPORT":
        return true;
      case "BATCH_MOVE":
        return tier === LicenseManager.TIERS.SINGLE_WASH || tier === LicenseManager.TIERS.LTD || tier === "PRO";
      case "CUSTOM_RULES":
      case "ECOSYSTEM_REORGANIZE":
        return tier === LicenseManager.TIERS.LTD || tier === "PRO";
      default:
        return false;
    }
  }

  // ---- 编解码辅助函数 ----
  static _base64ToUint8Array(base64) {
    let clean = base64.replace(/\s/g, "");
    if (typeof atob === "function") {
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } else if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(clean, "base64"));
    }
    throw new Error("No base64 decoder available in environment");
  }

  static _base64UrlToUint8Array(base64Url) {
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    return LicenseManager._base64ToUint8Array(base64);
  }

  static _base64UrlDecodeText(base64Url) {
    const bytes = LicenseManager._base64UrlToUint8Array(base64Url);
    return new TextDecoder().decode(bytes);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { LicenseManager };
} else {
  (typeof window !== "undefined" ? window : global).LicenseManager = LicenseManager;
}
