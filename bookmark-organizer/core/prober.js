// ============================================================================
// 生产级坚固型双阶段健康探测引擎 (Hardened Enterprise Bookmark Prober v2.1)
// 包含: credentials: 'omit' 防注销锁、RFC1918 内网豁免、危险动作词过滤、
//       Per-Host 域名防封队列、Cloudflare DoH 域名注销交叉二次验证
// ============================================================================

class BookmarkProber {
  constructor(options = {}) {
    this.concurrency = typeof options.concurrency === "number" ? options.concurrency : 6;
    this.timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 5000;
    this.onProgress = options.onProgress || null;
    this.isAborted = false;
    this.hostLastHit = new Map(); // Per-host 请求时间戳记录
    this.hostTail = new Map(); // Per-host 互斥 Promise 链尾指针
    this._activeControllers = new Set(); // 在飞请求 AbortController 集合
    this.minHostIntervalMs = typeof options.minHostIntervalMs === "number" ? options.minHostIntervalMs : 400; // 同域名防 429 最小间隔
  }

  abort() {
    this.isAborted = true;
    for (const controller of this._activeControllers) {
      try {
        controller.abort();
      } catch (e) {}
    }
    this._activeControllers.clear();
  }

  /**
   * 原子化 Per-Host 互斥槽位获取（基于 Promise 链，保证串行节流无竞态）
   * @param {string} host
   */
  async _acquireHostSlot(host) {
    const prev = this.hostTail.get(host) || Promise.resolve();
    let release;
    const next = new Promise(r => { release = r; });
    this.hostTail.set(host, prev.then(() => next));
    await prev;
    try {
      const last = this.hostLastHit.get(host) || 0;
      const wait = Math.max(0, last + this.minHostIntervalMs - Date.now());
      if (wait > 0 && !this.isAborted) {
        await new Promise(r => setTimeout(r, wait));
      }
      this.hostLastHit.set(host, Date.now());
    } finally {
      release();
    }
  }

  /**
   * RFC1918 与内网私有地址判定
   */
  static isIntranetUrl(urlStr) {
    if (!urlStr || typeof urlStr !== "string") return false;
    try {
      const u = new URL(urlStr);
      const host = u.hostname.toLowerCase();

      // P0-8: 剥离 IPv6 外围方括号 (例如 [::1] -> ::1, [2606:4700::1] -> 2606:4700::1)
      const rawHost = host.replace(/^\[|\]$/g, "");

      // 本地与虚拟回环 (127.0.0.0/8, 0.0.0.0, localhost)
      if (rawHost === "localhost" || rawHost === "0.0.0.0" || rawHost === "::1") return true;
      if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(rawHost)) return true;
      if (/^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(rawHost)) return true;

      // RFC1918 私有 IP 段 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
      if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(rawHost)) return true;
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(rawHost)) return true;
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(rawHost)) return true;

      // 169.254.0.0/16 (链路本地 / 关键云服务元数据地址 169.254.169.254)
      if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(rawHost)) return true;

      // 100.64.0.0/10 (CGNAT / Tailscale 虚拟网段 100.64.0.0 - 100.127.255.255)
      if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(rawHost)) return true;

      // 198.18.0.0/15 (基准测试与网络互联保留网段 198.18.0.0 - 198.19.255.255)
      if (/^198\.(18|19)\.\d{1,3}\.\d{1,3}$/.test(rawHost)) return true;

      // IPv6 地址精确判定 (含冒号)
      if (rawHost.includes(":")) {
        // IPv6 回环地址
        if (rawHost === "::1" || /^0*(:0*)*:1$/.test(rawHost)) return true;
        // IPv6 唯一本地地址 ULA (fc00::/7，即 fc00::/8 与 fd00::/8)
        if (/^(fc|fd)[0-9a-f]{0,2}:/i.test(rawHost)) return true;
        // IPv6 链路本地地址 Link-Local (fe80::/10，即 fe80:: 到 febf::)
        if (/^fe[89ab][0-9a-f]{0,2}:/i.test(rawHost)) return true;
        // RFC 3849 文档保留地址 (2001:db8::/32)
        if (/^2001:0?db8:/i.test(rawHost)) return true;
        // IPv4 映射 IPv6 (::ffff:192.168.x.x 或 WHATWG 规范化后的 ::ffff:c0a8:101)
        if (rawHost.startsWith("::ffff:") || rawHost.startsWith("0:0:0:0:0:ffff:")) {
          const tail = rawHost.replace(/^(::ffff:|0:0:0:0:0:ffff:)/, "");
          if (tail.includes(".")) {
            return BookmarkProber.isIntranetUrl(`http://${tail}`);
          }
          const parts = tail.split(":");
          if (parts.length === 2) {
            const p1 = parseInt(parts[0], 16);
            const p2 = parseInt(parts[1], 16);
            if (!isNaN(p1) && !isNaN(p2)) {
              const ipv4 = [
                (p1 >> 8) & 0xff,
                p1 & 0xff,
                (p2 >> 8) & 0xff,
                p2 & 0xff
              ].join(".");
              return BookmarkProber.isIntranetUrl(`http://${ipv4}`);
            }
          }
        }
        // 公网 IPv6 地址 (如 2606:4700:4700::1111) 放行探测，严禁判定为内网
        return false;
      }

      // 常见企业内网顶级域、本地局域网域与 RFC 6761 保留域名
      if (/\.(local|internal|corp|lan|home|intra|office|priv|test|example|invalid|localhost)$/i.test(rawHost)) return true;

      // 不含点号的短主机名 (如 http://gitlab/ 或 http://wiki/)
      if (!rawHost.includes(".")) return true;

      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * 危险带副作用操作链接判定（如 logout, delete, unsubscribe）
   */
  static isDangerousActionUrl(urlStr) {
    try {
      const u = new URL(urlStr);
      const combined = (u.pathname + u.search + u.hash).toLowerCase();
      const dangerousPatterns = [
        /(logout|signout|sign_out|log_out)/,
        /(unsubscribe|optout|opt_out)/,
        /(delete|destroy|remove_account)/,
        /(reset_password|reset-pwd)/,
        /(magic_link|magic-link|autologin)/,
        /(webhook|trigger|callback)/
      ];
      return dangerousPatterns.some(p => p.test(combined));
    } catch (e) {
      return false;
    }
  }

  /**
   * Cloudflare DoH (DNS-over-HTTPS) 二次交叉验证
   * 专用于网络超时/连接重置时判断域名是否彻底注销 (NXDOMAIN)
   */
  static async verifyDomainDns(domain) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
        method: "GET",
        headers: { "Accept": "application/dns-json" },
        signal: controller.signal,
        credentials: "omit"
      });
      clearTimeout(timer);
      if (!res.ok) return { isNxDomain: false, error: "DoH HTTP " + res.status };
      const data = await res.json();
      // Status 3: NXDOMAIN (Non-Existent Domain，域名彻底注销或不存在)
      if (data && data.Status === 3) {
        return { isNxDomain: true };
      }
      return { isNxDomain: false, hasAnswer: !!(data.Answer && data.Answer.length > 0) };
    } catch (e) {
      return { isNxDomain: false, error: e.message };
    }
  }

  /**
   * 契约方法：Cloudflare DoH 域名状态交叉确诊
   * @param {string} hostname
   * @returns {Promise<'NXDOMAIN' | 'RESOLVED' | 'ERROR'>}
   */
  static async verifyWithDoH(hostname) {
    try {
      const res = await BookmarkProber.verifyDomainDns(hostname);
      if (res.isNxDomain) return "NXDOMAIN";
      if (res.error) return "ERROR";
      return "RESOLVED";
    } catch (e) {
      return "ERROR";
    }
  }

  async verifyWithDoH(hostname) {
    return BookmarkProber.verifyWithDoH(hostname);
  }

  /**
   * 单个书签探测（带安全豁免与智能降级）
   * @param {string | { url: string, [key: string]: any }} item
   * @param {{ timeoutMs?: number, dohVerify?: boolean }} [options]
   */
  async probeUrl(item, options = {}) {
    if (typeof item === "string") {
      item = { url: item };
    }
    const timeoutMs = options.timeoutMs || this.timeoutMs;
    const url = item.url;
    if (!url || typeof url !== "string") {
      return { ...item, status: "SKIPPED", httpCode: 0, reason: "无效 URL 格式" };
    }

    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return { ...item, status: "SKIPPED", httpCode: 0, reason: "无效 URL 格式" };
    }

    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      return { ...item, status: "SKIPPED", httpCode: 0, reason: "非 HTTP/HTTPS 协议书签" };
    }

    // 1. [安全锁] 预先拦截内网/本地书签
    if (BookmarkProber.isIntranetUrl(url)) {
      return {
        ...item,
        status: "SKIPPED_INTERNAL",
        intranetProtected: true,
        httpCode: 0,
        reason: "🛡️ 内网/本地环境书签（自动免测保护）"
      };
    }

    // 2. [安全锁] 预先拦截可能具有副作用的敏感链接 (如注销、退订)
    if (BookmarkProber.isDangerousActionUrl(url)) {
      return {
        ...item,
        status: "SKIPPED_DANGEROUS",
        httpCode: 0,
        reason: "🛡️ 检测到注销/退订等敏感动作参数（自动免测保护）"
      };
    }

    // 3. [防限流] Per-Host 域名原子化平滑节流调度
    const host = urlObj.hostname.toLowerCase();
    await this._acquireHostSlot(host);

    const startTime = Date.now();
    let stage1Res = null;

    // --- STAGE 1: HEAD 探针 (强制 credentials: 'omit') ---
    try {
      stage1Res = await this._fetchWithTimeout(url, {
        method: "HEAD",
        credentials: "omit", // 绝对禁止附带用户登录态 Cookie，防止意外触发会话操作
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      }, timeoutMs);

      // 2xx 或 3xx 直接健康通过
      if (stage1Res.status >= 200 && stage1Res.status < 400) {
        return {
          ...item,
          status: "HEALTHY",
          httpCode: stage1Res.status,
          latencyMs: Date.now() - startTime,
          redirectedUrl: stage1Res.redirectedUrl || null,
          streamCancelled: !!stage1Res.streamCancelled
        };
      }

      // EXT-01 修复: HEAD 返回 404/410 时严禁直接定性死链，许多静态与 SPA 服务不响应 HEAD，必须落入 Stage 2 Range GET 二次复验
      if (stage1Res.status === 404 || stage1Res.status === 410) {
        console.warn(`[Prober] HEAD returned ${stage1Res.status} for ${url}, falling back to Stage 2 Range GET`);
      }
    } catch (e) {
      // HEAD 失败进入 Stage 2
    }

    // --- STAGE 2: Range GET 深度降级探针 (防防爬策略与防误杀) ---
    try {
      const stage2Res = await this._fetchWithTimeout(url, {
        method: "GET",
        credentials: "omit",
        headers: {
          "Range": "bytes=0-100", // 最小切片，带宽消耗微乎其微
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      }, timeoutMs);

      if (stage2Res.status >= 200 && stage2Res.status < 400) {
        return {
          ...item,
          status: "HEALTHY",
          httpCode: stage2Res.status,
          latencyMs: Date.now() - startTime,
          redirectedUrl: stage2Res.redirectedUrl || null,
          streamCancelled: !!(stage2Res.streamCancelled || stage1Res?.streamCancelled)
        };
      }

      // 遇到 401 认证要求或 403 / 429：多数属于内部网关、需要登录或启用了 WAF 人机盾
      if (stage2Res.status === 401 || stage2Res.status === 403 || stage2Res.status === 429) {
        if (stage2Res.status === 429) {
          this.hostLastHit.set(host, Date.now() + 3000);
        }
        return {
          ...item,
          status: "UNREACHABLE_OR_PROTECTED",
          httpCode: stage2Res.status,
          latencyMs: Date.now() - startTime,
          reason: `受安全网关/防爬挑战拦截 (HTTP ${stage2Res.status})，实际网站存活，严禁误删`,
          streamCancelled: !!(stage2Res.streamCancelled || stage1Res?.streamCancelled)
        };
      }

      if (stage2Res.status === 404 || stage2Res.status === 410) {
        return {
          ...item,
          status: "DEAD",
          httpCode: stage2Res.status,
          latencyMs: Date.now() - startTime,
          reason: stage2Res.status === 404 ? "页面未找到 (404 Not Found)" : "资源已永久下线 (410 Gone)",
          streamCancelled: !!(stage2Res.streamCancelled || stage1Res?.streamCancelled)
        };
      }

      if (stage2Res.status >= 500) {
        return {
          ...item,
          status: "SERVER_ERROR",
          httpCode: stage2Res.status,
          latencyMs: Date.now() - startTime,
          reason: `服务端故障响应 (HTTP ${stage2Res.status})`,
          streamCancelled: !!(stage2Res.streamCancelled || stage1Res?.streamCancelled)
        };
      }
    } catch (netErr) {
      // --- STAGE 3: DNS DoH 二次交叉验证 (终极防误杀) ---
      const dnsResult = await BookmarkProber.verifyDomainDns(host);
      if (dnsResult.isNxDomain) {
        return {
          ...item,
          status: "DEAD",
          httpCode: 0,
          latencyMs: Date.now() - startTime,
          reason: "域名已彻底注销停用 (DNS NXDOMAIN 验证确诊)"
        };
      }

      // 域名能够正常解析，仅 HTTP 探测超时或受阻：严禁直接误杀，放入人工复核区！
      return {
        ...item,
        status: "UNREACHABLE_OR_PROTECTED",
        httpCode: 0,
        latencyMs: Date.now() - startTime,
        reason: "网络超时或可能需特定网络环境，DNS解析正常，已放入安全复核区"
      };
    }

    return {
      ...item,
      status: "UNREACHABLE_OR_PROTECTED",
      httpCode: 0,
      latencyMs: Date.now() - startTime,
      reason: "状态未知，已纳入安全保护"
    };
  }

  /**
   * 并发调度器（确定性结果顺序与可取消）
   */
  async probeAll(items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const results = new Array(items.length);
    const total = items.length;
    let nextIdx = 0;
    let completed = 0;

    const worker = async () => {
      while (nextIdx < total && !this.isAborted) {
        const idx = nextIdx++;
        const item = items[idx];
        const res = await this.probeUrl(item);
        results[idx] = res;
        completed++;
        if (this.onProgress) {
          this.onProgress(completed, total, item);
        }
      }
    };

    const workers = [];
    const poolSize = Math.min(this.concurrency, items.length);
    for (let i = 0; i < poolSize; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);
    return this.isAborted ? results.filter(Boolean) : results;
  }

  /**
   * 修复数学缺陷的综合健康评分算法 (0 - 100 分)
   * 杜绝负数溢出，且不惩罚正常的 HTTPS 升级重定向
   */
  static calculateHealthScore(results) {
    if (!results || results.length === 0) return 100;
    
    // 过滤出真正参与评分的有效书签（排除内网豁免与动作词豁免项）
    const effective = results.filter(r => r.status !== "SKIPPED_INTERNAL" && r.status !== "SKIPPED_DANGEROUS" && r.status !== "INTRANET_PROTECTED" && r.status !== "SKIPPED");
    if (effective.length === 0) return 100;

    const total = effective.length;
    const deadCount = effective.filter(r => r.status === "DEAD").length;
    const serverErrCount = effective.filter(r => r.status === "SERVER_ERROR").length;
    
    // 死链惩罚最高 (每项占权 2.5)，服务器错误占权 1.0
    const penaltyRate = ((deadCount * 2.5 + serverErrCount * 1.0) / total);
    const score = Math.max(0, Math.min(100, Math.round(100 - penaltyRate * 100)));
    return score;
  }

  async _fetchWithTimeout(url, init, timeout) {
    const controller = new AbortController();
    this._activeControllers.add(controller);
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });

      // P0-9: 针对每个包含响应体的 response，通过 getReader 读取首块数据 (<= 1024 字节)
      // 并在 finally 块中显式执行 await reader.cancel() 立即关闭释放底层的 TCP Socket
      const reader = (res && res.body && typeof res.body.getReader === "function")
        ? res.body.getReader()
        : null;

      if (reader) {
        try {
          let totalBytes = 0;
          const maxBytes = 1024;
          while (totalBytes < maxBytes) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value ? (value.byteLength || value.length || 0) : 0;
          }
        } catch (e) {
          // 响应流读取异常不掩盖已获取的 HTTP 状态
        } finally {
          try {
            await reader.cancel();
          } catch (e) {
            // 忽略取消异常
          }
        }
      }

      return {
        status: res.status,
        redirectedUrl: res.redirected ? res.url : null,
        headers: res.headers,
        streamCancelled: !!res.streamCancelled
      };
    } finally {
      clearTimeout(timer);
      this._activeControllers.delete(controller);
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { BookmarkProber };
} else {
  (typeof window !== "undefined" ? window : global).BookmarkProber = BookmarkProber;
}
