/**
 * QuickNote Cloudflare Worker 官方安全中转网关
 *
 * 核心安全特性：
 * 1. 凭据隔离：DeepSeek 官方 API Key 仅保存在 Cloudflare Worker 服务端环境变量中，客户端零感知；
 * 2. 身份验签：基于 Ed25519 非对称公钥，纯数学验证客户端 X-QuickNote-License 请求头，拒绝未激活或伪造调用；
 * 3. 配额防刷：基于 Cloudflare KV (QUICKNOTE_KV) 实行每日 100 次/卡密精准防刷与滑动计数；
 * 4. 参数净化：严格白名单校验模型名称，钳制 max_tokens 范围，防御越权注入；
 * 5. 全面支持：全跨域 (CORS) 预检、SSE 流式打字机透传与标准 JSON 响应。
 */

// 随身记官方 Ed25519 验签公钥 (与客户端 licensing.rs 严格一致)
const OFFICIAL_PUBLIC_KEY_HEX = "0b3bebdef395da644a39a1b1f92bf3b5801517196e11d53e7878eeb3f0ea8169";

// 每日配额上限
const DAILY_QUOTA_LIMIT = 100;

// 允许的模型白名单
const ALLOWED_MODELS = new Set([
  "deepseek-chat",
  "deepseek-flash",
  "deepseek-coder",
  "deepseek-reasoner",
]);

// 上游实际支持的模型映射（针对将 deepseek-flash 自动映射为 deepseek-chat）
const MODEL_UPSTREAM_MAP = {
  "deepseek-flash": "deepseek-chat",
  "deepseek-chat": "deepseek-chat",
  "deepseek-reasoner": "deepseek-reasoner",
  "deepseek-coder": "deepseek-chat",
};

// 默认模型
const DEFAULT_MODEL = "deepseek-chat";

// 单次请求 tokens 安全上限
const MAX_ALLOWED_TOKENS = 4096;

// CORS 标头
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-QuickNote-License",
  "Access-Control-Expose-Headers": "X-QuickNote-Quota-Limit, X-QuickNote-Quota-Remaining, X-QuickNote-License-Id",
  "Access-Control-Max-Age": "86400",
};

// 内存本地滑动防刷计数器（当未配置 KV 时的保底防御）
const memoryQuotaCache = new Map();

/**
 * 十六进制字符串转 Uint8Array
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

let cachedCryptoKey = null;

/**
 * 导入 Ed25519 验签公钥 (Web Crypto API)
 */
async function getVerifyingKey(env) {
  const hex = (env && env.OFFICIAL_PUBLIC_KEY) || OFFICIAL_PUBLIC_KEY_HEX;
  if (!env || !env.OFFICIAL_PUBLIC_KEY) {
    if (cachedCryptoKey) {
      return cachedCryptoKey;
    }
    const keyBytes = hexToBytes(hex);
    cachedCryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return cachedCryptoKey;
  }
  const keyBytes = hexToBytes(hex);
  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "Ed25519" },
    false,
    ["verify"]
  );
}

/**
 * CRC-16-IBM 校验和算法（多项式 0xA001，初值 0x0000）
 */
function crc16Ibm(data) {
  let crc = 0x0000;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) {
        crc = (crc >>> 1) ^ 0xA001;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return crc & 0xFFFF;
}

/**
 * Crockford Base32 解码
 */
function base32Decode(s) {
  let buffer = 0n;
  let bitsLeft = 0;
  const out = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "-" || ch === " " || ch === "\r" || ch === "\n" || ch === "\t") {
      continue;
    }
    const up = ch.toUpperCase();
    let val = -1;
    if (up === "0" || up === "O") val = 0;
    else if (up === "1" || up === "I" || up === "L") val = 1;
    else if (up >= "2" && up <= "9") val = up.charCodeAt(0) - 48;
    else if (up === "A") val = 10;
    else if (up === "B") val = 11;
    else if (up === "C") val = 12;
    else if (up === "D") val = 13;
    else if (up === "E") val = 14;
    else if (up === "F") val = 15;
    else if (up === "G") val = 16;
    else if (up === "H") val = 17;
    else if (up === "J") val = 18;
    else if (up === "K") val = 19;
    else if (up === "M") val = 20;
    else if (up === "N") val = 21;
    else if (up === "P") val = 22;
    else if (up === "Q") val = 23;
    else if (up === "R") val = 24;
    else if (up === "S") val = 25;
    else if (up === "T") val = 26;
    else if (up === "V") val = 27;
    else if (up === "W") val = 28;
    else if (up === "X") val = 29;
    else if (up === "Y") val = 30;
    else if (up === "Z") val = 31;
    else {
      throw new Error(`Base32 含有非法字符: ${ch}`);
    }

    buffer = (buffer << 5n) | BigInt(val);
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      out.push(Number((buffer >> BigInt(bitsLeft)) & 0xFFn));
    }
  }
  return new Uint8Array(out);
}

/**
 * Base64URL 字符串解码为 Uint8Array
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 解析载荷 Claims 结构
 */
function parseClaimsFromBytes(payloadBytes) {
  const text = new TextDecoder().decode(payloadBytes).trim();
  if (text.startsWith("QNLIC:")) {
    const parts = text.split(":");
    let id = "";
    let tier = "pro_lifetime";
    let email = "";
    let issued = 0;
    let exp = 0;

    let i = 0;
    while (i < parts.length) {
      if (parts[i] === "id" && i + 1 < parts.length) {
        id = parts[i + 1];
        i += 1;
      } else if (parts[i] === "tier" && i + 1 < parts.length) {
        tier = parts[i + 1];
        i += 1;
      } else if (parts[i] === "email" && i + 1 < parts.length) {
        email = parts[i + 1];
        i += 1;
      } else if (parts[i] === "issued" && i + 1 < parts.length) {
        issued = parseInt(parts[i + 1], 10) || 0;
        i += 1;
      } else if (parts[i] === "exp" && i + 1 < parts.length) {
        exp = parseInt(parts[i + 1], 10) || 0;
        i += 1;
      }
      i += 1;
    }
    if (id) {
      return { id, tier, email, issued, exp };
    }
  }

  if (text.startsWith("{")) {
    try {
      const c = JSON.parse(text);
      const id = c.id || "QN-PRO";
      const tier = c.tier || "pro_lifetime";
      const email = c.email || "";
      const issued = c.issued ?? c.issued_at ?? 0;
      const exp = c.exp ?? c.expires_at ?? 0;
      return { id, tier, email, issued, exp };
    } catch {}
  }

  throw new Error("无法解析许可证载荷 Claims");
}

/**
 * 规范化待验签明文
 */
function canonicalPayload(id, tier, email, issued, exp) {
  return `QNLIC:v1:id:${id.trim()}:tier:${tier.trim()}:email:${email.trim()}:issued:${issued}:exp:${exp}`;
}

/**
 * 纯数学离线 Ed25519 验签
 */
async function verifyLicense(keyStr, env) {
  const clean = (keyStr || "").trim();
  if (!clean) {
    throw new Error("许可证凭据不能为空");
  }

  const verifyingKey = await getVerifyingKey(env);

  // 格式 B: QN1_<claims>.<sig>
  if (clean.startsWith("QN1_") || clean.startsWith("qn1_")) {
    const token = clean.slice(4);
    const dotIdx = token.indexOf(".");
    if (dotIdx === -1) {
      throw new Error("Base64URL Token 格式无效 (缺失分隔点)");
    }
    const claimsB64 = token.slice(0, dotIdx);
    const sigB64 = token.slice(dotIdx + 1);

    const claimsBytes = base64UrlDecode(claimsB64.trim());
    const sigBytes = base64UrlDecode(sigB64.trim());

    if (sigBytes.length !== 64) {
      throw new Error("数字签名长度无效 (需 64 字节)");
    }

    const claims = parseClaimsFromBytes(claimsBytes);
    const normalized = canonicalPayload(claims.id, claims.tier, claims.email, claims.issued, claims.exp);
    const isValid = await crypto.subtle.verify(
      "Ed25519",
      verifyingKey,
      sigBytes,
      new TextEncoder().encode(normalized)
    );

    if (!isValid) {
      throw new Error("Ed25519 签名验证失败，许可证无效或已被篡改");
    }

    if (claims.exp > 0) {
      const now = Math.floor(Date.now() / 1000);
      if (now > claims.exp) {
        throw new Error("许可证已过有效截止期");
      }
    }

    return {
      isValid: true,
      licenseId: claims.id,
      tier: claims.tier,
      email: claims.email,
      issuedAt: claims.issued,
      expiresAt: claims.exp,
    };
  }

  // 格式 A: Crockford Base32 + CRC16
  let b32Str = clean;
  if (clean.toUpperCase().startsWith("QN-PRO-")) {
    b32Str = clean.slice(7);
  } else if (clean.toUpperCase().startsWith("QN-")) {
    b32Str = clean.slice(3);
  }

  const raw = base32Decode(b32Str);
  if (raw.length < 67) {
    throw new Error("许可证数据长度不足 (至少需 67 字节)");
  }

  const n = raw.length;
  const expectedCrc = (raw[n - 2] << 8) | raw[n - 1];
  const actualCrc = crc16Ibm(raw.subarray(0, n - 2));
  if (expectedCrc !== actualCrc) {
    throw new Error("CRC-16 完整性校验未通过");
  }

  const envelope = raw.subarray(0, n - 2);
  const sigBytes = envelope.subarray(envelope.length - 64);
  const payloadBytes = envelope.subarray(0, envelope.length - 64);

  const claims = parseClaimsFromBytes(payloadBytes);
  const normalized = canonicalPayload(claims.id, claims.tier, claims.email, claims.issued, claims.exp);
  const isValid = await crypto.subtle.verify(
    "Ed25519",
    verifyingKey,
    sigBytes,
    new TextEncoder().encode(normalized)
  );

  if (!isValid) {
    throw new Error("Ed25519 签名验证失败，许可证无效或已被篡改");
  }

  if (claims.exp > 0) {
    const now = Math.floor(Date.now() / 1000);
    if (now > claims.exp) {
      throw new Error("许可证已过有效截止期");
    }
  }

  return {
    isValid: true,
    licenseId: claims.id,
    tier: claims.tier,
    email: claims.email,
    issuedAt: claims.issued,
    expiresAt: claims.exp,
  };
}

/**
 * 每日配额检查与递增
 */
async function checkAndIncrementQuota(env, licenseId) {
  const today = new Date().toISOString().slice(0, 10);
  const quotaKey = `${licenseId}:${today}`;

  // 1. 若配置了 Cloudflare KV 命名空间
  if (env.QUICKNOTE_KV) {
    const countStr = (await env.QUICKNOTE_KV.get(quotaKey)) || (await env.QUICKNOTE_KV.get(`quota:${licenseId}:${today}`));
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count >= DAILY_QUOTA_LIMIT) {
      return { allowed: false, used: count, limit: DAILY_QUOTA_LIMIT };
    }
    // 写入新计数，过期时间设为 48 小时后自动释放
    await env.QUICKNOTE_KV.put(quotaKey, (count + 1).toString(), { expirationTtl: 172800 });
    return { allowed: true, used: count + 1, limit: DAILY_QUOTA_LIMIT };
  }

  // 2. 备用：基于内存实例的滑动计数
  const memCount = memoryQuotaCache.get(quotaKey) || memoryQuotaCache.get(`quota:${licenseId}:${today}`) || 0;
  if (memCount >= DAILY_QUOTA_LIMIT) {
    return { allowed: false, used: memCount, limit: DAILY_QUOTA_LIMIT };
  }
  memoryQuotaCache.set(quotaKey, memCount + 1);
  return { allowed: true, used: memCount + 1, limit: DAILY_QUOTA_LIMIT };
}

/**
 * 上游调用失败时的配额回滚（保证失败不扣用户额度）
 */
async function rollbackQuota(env, licenseId) {
  const today = new Date().toISOString().slice(0, 10);
  const quotaKey = `${licenseId}:${today}`;
  try {
    if (env.QUICKNOTE_KV) {
      const countStr = (await env.QUICKNOTE_KV.get(quotaKey)) || (await env.QUICKNOTE_KV.get(`quota:${licenseId}:${today}`));
      const count = countStr ? parseInt(countStr, 10) : 0;
      if (count > 0) {
        await env.QUICKNOTE_KV.put(quotaKey, (count - 1).toString(), { expirationTtl: 172800 });
      }
    } else {
      const memCount = memoryQuotaCache.get(quotaKey) || memoryQuotaCache.get(`quota:${licenseId}:${today}`) || 0;
      if (memCount > 0) {
        memoryQuotaCache.set(quotaKey, memCount - 1);
      }
    }
  } catch {
    // 忽略回滚异常
  }
}

/**
 * 构造统一 JSON 错误响应
 */
function errorResponse(message, type = "invalid_request_error", status = 400) {
  return new Response(
    JSON.stringify({
      error: {
        message,
        type,
        param: null,
        code: status,
      },
    }),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}

export default {
  async fetch(request, env, ctx) {
    // 1. 响应 CORS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    // 2. 根路径或 /health 健康探针
    if (pathname === "/" || pathname === "/health" || pathname === "/v1") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          gateway: "QuickNote Cloudflare Security Gateway",
          version: "1.0.0",
          server_time: new Date().toISOString(),
          upstream: env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
        }),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    // 3. 仅接管 /chat/completions 与 /v1/chat/completions 路由
    if (!pathname.endsWith("/chat/completions")) {
      return errorResponse(`未找到对应的路由端点: ${url.pathname}`, "not_found", 404);
    }

    if (request.method !== "POST") {
      return errorResponse("仅支持 POST 方法请求", "method_not_allowed", 405);
    }

    // 4. 校验服务端 DEEPSEEK_API_KEY 配置就绪（前置检查，避免消耗用户额度）
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return errorResponse(
        "服务端安全网关尚未配置 DEEPSEEK_API_KEY 环境变量，请联系管理员在 Cloudflare 控制台添加 Secret。",
        "server_configuration_error",
        500
      );
    }

    // 5. 提取并校验客户端 License 头
    const licenseHeader =
      request.headers.get("X-QuickNote-License") ||
      request.headers.get("x-quicknote-license");

    if (!licenseHeader) {
      return errorResponse(
        "请求缺少 X-QuickNote-License 凭证头。官方 AI 通道仅面向激活 Pro 许可证用户开放。请在随身记客户端中完成激活。",
        "unauthorized",
        401
      );
    }

    let licenseInfo;
    try {
      licenseInfo = await verifyLicense(licenseHeader, env);
    } catch (err) {
      return errorResponse(
        `随身记许可证验签未通过: ${err.message}`,
        "invalid_license",
        403
      );
    }

    // 6. 解析并净化请求参数（前置语法校验，避免格式错误消耗配额）
    let reqJson;
    try {
      reqJson = await request.json();
    } catch {
      return errorResponse("请求体必须为合法 JSON 格式", "invalid_json", 400);
    }

    // 模型白名单锁死与上游映射清洗（如将 deepseek-flash 映射为 deepseek-chat）
    if (!reqJson.model || !ALLOWED_MODELS.has(reqJson.model)) {
      reqJson.model = DEFAULT_MODEL;
    }
    if (MODEL_UPSTREAM_MAP[reqJson.model]) {
      reqJson.model = MODEL_UPSTREAM_MAP[reqJson.model];
    }

    // 单次 Tokens 数量限制
    if (typeof reqJson.max_tokens === "number" && reqJson.max_tokens > MAX_ALLOWED_TOKENS) {
      reqJson.max_tokens = MAX_ALLOWED_TOKENS;
    }
    if (typeof reqJson.max_completion_tokens === "number" && reqJson.max_completion_tokens > MAX_ALLOWED_TOKENS) {
      reqJson.max_completion_tokens = MAX_ALLOWED_TOKENS;
    }

    // 7. 每日调用配额检查 (100 次/天)
    const quota = await checkAndIncrementQuota(env, licenseInfo.licenseId);
    if (!quota.allowed) {
      return errorResponse(
        `今日官方 AI 通道免费配额已耗尽 (${quota.used}/${quota.limit})，次日 00:00 UTC 自动重置。您可在客户端「设置 -> AI 设置」中配置自填 API Key (BYOK) 终身无限制使用。`,
        "quota_exceeded",
        429
      );
    }

    // 8. 安全转发至 DeepSeek 官方后端
    const baseUrl = (env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1").replace(/\/+$/, "");
    const targetUrl = `${baseUrl}/chat/completions`;

    let upstreamResp;
    try {
      upstreamResp = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(reqJson),
      });
    } catch (err) {
      // 遇到网络异常或上游故障时回滚额度
      await rollbackQuota(env, licenseInfo.licenseId);
      return errorResponse(
        `转发请求至上游大模型服务失败: ${err.message}`,
        "bad_gateway",
        502
      );
    }

    // 9. 透传上游响应（支持流式 SSE 和标准 JSON），附加 CORS 与配额响应头
    const respHeaders = new Headers(upstreamResp.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      respHeaders.set(k, v);
    }
    respHeaders.set("X-QuickNote-Quota-Limit", quota.limit.toString());
    respHeaders.set("X-QuickNote-Quota-Remaining", Math.max(0, quota.limit - quota.used).toString());
    respHeaders.set("X-QuickNote-License-Id", licenseInfo.licenseId);

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      statusText: upstreamResp.statusText,
      headers: respHeaders,
    });
  },
};

export {
  verifyLicense,
  base32Decode,
  crc16Ibm,
  canonicalPayload,
  checkAndIncrementQuota,
  rollbackQuota,
  ALLOWED_MODELS,
  MODEL_UPSTREAM_MAP,
};
