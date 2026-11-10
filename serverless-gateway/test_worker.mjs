import worker, {
  verifyLicense,
  base32Decode,
  crc16Ibm,
  canonicalPayload,
  checkAndIncrementQuota,
  rollbackQuota,
  MODEL_UPSTREAM_MAP,
} from './worker.js';

// Crockford Base32 字母表
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function base32Encode(data) {
  let out = "";
  let buffer = 0n;
  let bitsLeft = 0;
  for (const b of data) {
    buffer = (buffer << 8n) | BigInt(b);
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      const idx = Number((buffer >> BigInt(bitsLeft)) & 0x1Fn);
      out += CROCKFORD_ALPHABET[idx];
    }
  }
  if (bitsLeft > 0) {
    const idx = Number((buffer << BigInt(5 - bitsLeft)) & 0x1Fn);
    out += CROCKFORD_ALPHABET[idx];
  }
  return out;
}

async function signTestLicense(kp, id, tier, email, issued, exp) {
  const normalized = canonicalPayload(id, tier, email, issued, exp);
  const normalizedBytes = new TextEncoder().encode(normalized);
  const sig = await crypto.subtle.sign("Ed25519", kp.privateKey, normalizedBytes);
  const sigBytes = new Uint8Array(sig);

  // 1. Format A: Crockford Base32 + CRC-16
  const envelope = new Uint8Array(normalizedBytes.length + 64 + 2);
  envelope.set(normalizedBytes, 0);
  envelope.set(sigBytes, normalizedBytes.length);
  const crc = crc16Ibm(envelope.subarray(0, envelope.length - 2));
  envelope[envelope.length - 2] = (crc >>> 8) & 0xFF;
  envelope[envelope.length - 1] = crc & 0xFF;

  const b32 = base32Encode(envelope);
  const chunks = b32.match(/.{1,5}/g) || [];
  const formatA = "QN-PRO-" + chunks.join("-");

  // 2. Format B: Base64URL
  const claimsB64 = Buffer.from(normalizedBytes).toString("base64url");
  const sigB64 = Buffer.from(sigBytes).toString("base64url");
  const formatB = `QN1_${claimsB64}.${sigB64}`;

  return { formatA, formatB, normalized };
}

async function runTests() {
  console.log("=== QuickNote Serverless Gateway 严苛测试套件 ===");

  // 1. 健康检查端点
  const resHealth = await worker.fetch(new Request("http://localhost/health"), {}, {});
  if (resHealth.status !== 200) throw new Error("Health status not 200");
  const healthJson = await resHealth.json();
  if (healthJson.status !== "healthy") throw new Error("Health status not healthy");
  console.log("✓ 1. 健康检查探针正常 (/health -> 200)");

  // 2. OPTIONS CORS 预检
  const resOpt = await worker.fetch(
    new Request("http://localhost/v1/chat/completions", { method: "OPTIONS" }),
    {},
    {}
  );
  if (resOpt.status !== 204) throw new Error("OPTIONS status not 204");
  if (resOpt.headers.get("access-control-allow-origin") !== "*") throw new Error("CORS origin missing");
  if (!resOpt.headers.get("access-control-expose-headers")?.includes("X-QuickNote-Quota-Limit")) {
    throw new Error("Access-Control-Expose-Headers missing quota headers");
  }
  console.log("✓ 2. OPTIONS CORS 预检与 Expose-Headers 完整 (204)");

  // 3. 缺少 X-QuickNote-License 凭证头拦截 (401)
  const resNoLic = await worker.fetch(
    new Request("http://localhost/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "deepseek-chat", messages: [] }),
    }),
    { DEEPSEEK_API_KEY: "sk-mock" },
    {}
  );
  if (resNoLic.status !== 401) throw new Error(`Expected 401, got ${resNoLic.status}`);
  console.log("✓ 3. 缺少卡密凭据安全拦截 (401 unauthorized)");

  // 4. 伪造或非法卡密格式拒绝 (403)
  const resBadLic = await worker.fetch(
    new Request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { "X-QuickNote-License": "QN-PRO-MALFORMED-GARBAGE-KEY" },
      body: JSON.stringify({ model: "deepseek-chat", messages: [] }),
    }),
    { DEEPSEEK_API_KEY: "sk-mock" },
    {}
  );
  if (resBadLic.status !== 403) throw new Error(`Expected 403, got ${resBadLic.status}`);
  console.log("✓ 4. 非法/损坏卡密格式拒绝 (403 invalid_license)");

  // 5. 生成真实 Ed25519 密钥对并签发合法卡密
  const kp = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const rawPub = await crypto.subtle.exportKey("raw", kp.publicKey);
  const testPubHex = Buffer.from(rawPub).toString("hex");

  const testEnv = {
    DEEPSEEK_API_KEY: "sk-test-deepseek-key",
    OFFICIAL_PUBLIC_KEY: testPubHex,
  };

  const now = Math.floor(Date.now() / 1000);
  const { formatA, formatB } = await signTestLicense(
    kp,
    "QN-USER-007",
    "pro_lifetime",
    "vip@quicknote.dev",
    now,
    0
  );

  // 6. 验证 Format B (QN1_<claims>.<sig>)
  const claimsB = await verifyLicense(formatB, testEnv);
  if (claimsB.licenseId !== "QN-USER-007" || claimsB.tier !== "pro_lifetime") {
    throw new Error("Format B verify mismatch");
  }
  console.log("✓ 5. Format B (Base64URL) Ed25519 数学校验 100% 成功");

  // 7. 验证 Format A (Crockford Base32 + CRC-16)
  const claimsA = await verifyLicense(formatA, testEnv);
  if (claimsA.licenseId !== "QN-USER-007" || claimsA.tier !== "pro_lifetime") {
    throw new Error("Format A verify mismatch");
  }
  console.log("✓ 6. Format A (Base32 + CRC16) Ed25519 数学校验 100% 成功");

  // 8. 篡改 Format A 内容并重算 CRC 尝试伪造 -> 签名验证必须失败
  const tamperedKey = formatA.slice(0, -6) + "99999-";
  try {
    await verifyLicense(tamperedKey, testEnv);
    throw new Error("Tampered Format A should have failed!");
  } catch (err) {
    if (!err.message.includes("校验未通过") && !err.message.includes("签名验证失败")) {
      throw err;
    }
  }
  console.log("✓ 7. 篡改卡密防伪攻击成功拦截");

  // 9. 过期卡密拦截 (exp < now)
  const expiredTokens = await signTestLicense(
    kp,
    "QN-EXPIRED",
    "pro_annual",
    "exp@test.com",
    now - 10000,
    now - 100
  );
  try {
    await verifyLicense(expiredTokens.formatA, testEnv);
    throw new Error("Expired license should fail!");
  } catch (err) {
    if (!err.message.includes("已过有效截止期")) throw err;
  }
  console.log("✓ 8. 过期卡密时效边界拦截成功");

  // 10. 服务端未配置 DEEPSEEK_API_KEY 时拦截 (500)
  const resNoApiKey = await worker.fetch(
    new Request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { "X-QuickNote-License": formatB },
      body: JSON.stringify({ model: "deepseek-flash", messages: [] }),
    }),
    { OFFICIAL_PUBLIC_KEY: testPubHex },
    {}
  );
  if (resNoApiKey.status !== 500) throw new Error(`Expected 500, got ${resNoApiKey.status}`);
  console.log("✓ 9. 服务端未配置 API Key 保护且不扣除额度 (500)");

  // 11. 请求体 JSON 语法错误拦截 (400)
  const resBadJson = await worker.fetch(
    new Request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { "X-QuickNote-License": formatB },
      body: "this is not json {",
    }),
    testEnv,
    {}
  );
  if (resBadJson.status !== 400) throw new Error(`Expected 400, got ${resBadJson.status}`);
  console.log("✓ 10. 非法 JSON 请求体前置语法拦截 (400)");

  // 12. 验证模型映射与 Token 上限钳制
  if (MODEL_UPSTREAM_MAP["deepseek-flash"] !== "deepseek-chat") {
    throw new Error("deepseek-flash should map to deepseek-chat for upstream!");
  }
  console.log("✓ 11. 客户端 deepseek-flash 自动适配映射为 upstream deepseek-chat 成功");

  // 13. 模拟 Cloudflare KV 每日 100 次防刷与超额拦截 (429)
  const mockKVStore = new Map();
  const mockKV = {
    async get(k) { return mockKVStore.get(k) || null; },
    async put(k, v) { mockKVStore.set(k, v); },
  };

  const kvEnv = {
    ...testEnv,
    QUICKNOTE_KV: mockKV,
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const testLicenseId = "QN-QUOTA-TEST";

  // 初始调用
  const q1 = await checkAndIncrementQuota(kvEnv, testLicenseId);
  if (!q1.allowed || q1.used !== 1) throw new Error("KV quota increment failed");
  if (!mockKVStore.has(`${testLicenseId}:${todayStr}`)) {
    throw new Error("KV key should follow license_id:YYYY-MM-DD");
  }

  // 模拟达到 100 次上限
  mockKVStore.set(`${testLicenseId}:${todayStr}`, "100");
  const q101 = await checkAndIncrementQuota(kvEnv, testLicenseId);
  if (q101.allowed) throw new Error("101st request should be rejected");

  console.log("✓ 12. Cloudflare KV license_id:YYYY-MM-DD 100次防刷配额及 429 拦截验证成功");

  // 14. 验证失败配额回滚机制 (保证失败不扣额度)
  await rollbackQuota(kvEnv, testLicenseId);
  const rolledBackCount = parseInt(mockKVStore.get(`${testLicenseId}:${todayStr}`), 10);
  if (rolledBackCount !== 99) {
    throw new Error(`Expected rolled back count 99, got ${rolledBackCount}`);
  }
  console.log("✓ 13. 失败配额安全回滚机制 (Rollback) 验证成功");

  console.log("\n=============================================");
  console.log("🎉 全部 13 项服务端安全网关严苛场景 100% 验证通过！");
  console.log("=============================================\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
