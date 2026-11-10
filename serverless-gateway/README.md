# QuickNote Cloudflare Worker 安全中转网关

> **安全第一**：为随身记（QuickNote）官方通道提供高安全性的大模型 API 中转。彻底杜绝在客户端反编译泄露官方 API Key 的风险，同时支持非对称密码学（Ed25519）授权认证与每日配额防刷。

---

## 架构优势

1. **零密钥泄露风险**：DeepSeek 官方 API Key 仅存放在 Cloudflare 服务端环境变量中，客户端完全接触不到 Key。
2. **Ed25519 签名数学校验**：基于 Web Crypto API 原生实现，校验客户端携带的 `X-QuickNote-License` 头。未经合法签发的卡密无法调用网关。
3. **每日配额防刷**：每个合法卡密每日限额 100 次（次日 00:00 UTC 自动重置）。支持 Cloudflare KV 分布式计数与内存滑动保底。
4. **参数净化拦截**：严格限制合法模型白名单（`deepseek-chat` / `deepseek-flash` 等），强行钳制 `max_tokens` 上限，防止越权滥用。
5. **极简部署与零服务器成本**：享受 Cloudflare Workers 每日 100,000 次免费请求配额，零运维、高可用。

---

## 部署方案 A：5 分钟零代码 Cloudflare 网页后台部署（推荐）

适合没有安装 Node.js/CLI 工具的用户，完全在浏览器内操作：

### 第一步：创建 Worker
1. 打开并登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)；
2. 在左侧导航栏点击 **Compute (Workers) -> Workers & Pages**；
3. 点击 **Create application** -> 选择 **Workers** -> 点击 **Create Worker**；
4. 输入 Worker 名称（如 `quicknote-gateway`），点击 **Deploy**。

### 第二步：粘贴代码
1. 部署完成后，点击 **Edit code** 进入在线编辑器；
2. 将左侧编辑器中原有的代码清空，把本目录下的 `worker.js` 全部内容完整复制并粘贴进去；
3. 点击右上角 **Deploy** 保存并部署。

### 第三步：配置 DeepSeek API Key 环境变量
1. 返回该 Worker 的管理页面，点击 **Settings (设置)** -> **Variables (变量)**；
2. 在 **Environment Variables (环境变量)** 区域点击 **Add variable**；
   - Variable name: `DEEPSEEK_API_KEY`
   - Value: 填入您的 DeepSeek 官方 API 密钥（例如 `sk-xxxxxxxxxxxxxxxx`）
   - 勾选 **Encrypt (加密/密钥)**，确保安全；
3. （可选）添加变量 `DEEPSEEK_BASE_URL`，默认值为 `https://api.deepseek.com/v1`；
4. 点击 **Save and deploy (保存并部署)**。

### 第四步：（可选但推荐）绑定 KV 命名空间实现持久化防刷
1. 在 Cloudflare 控制台左侧点击 **Workers & Pages -> KV**；
2. 点击 **Create a namespace**，名称输入 `QUICKNOTE_KV`，点击 **Add**；
3. 返回您刚才创建的 Worker，进入 **Settings -> Variables -> KV Namespace Bindings**；
4. 点击 **Add binding**：
   - Variable name: `QUICKNOTE_KV`
   - KV namespace: 选择刚才创建的 `QUICKNOTE_KV`
5. 点击 **Save and deploy** 即可。

---

## 部署方案 B：使用 Wrangler CLI 一键发布

适合开发者或 CI/CD 自动化流水线：

```bash
# 1. 全局安装 wrangler (若尚未安装)
npm install -g wrangler

# 2. 登录 Cloudflare 账号
wrangler login

# 3. 创建 KV 命名空间（按需）
wrangler kv:namespace create QUICKNOTE_KV
# 复制输出的 id，并填入 wrangler.toml 的 kv_namespaces 配置中

# 4. 安全配置 DeepSeek API 密钥
wrangler secret put DEEPSEEK_API_KEY
# 按提示粘贴您的 sk-xxxxxxxx 密钥

# 5. 一键发布部署
wrangler deploy
```

发布完成后，控制台将输出分配的 Worker 访问域名，例如：
`https://quicknote-gateway.<your-subdomain>.workers.dev`

---

## 随身记客户端对接说明

随身记客户端默认已预置官方标准网关路由。如需使用自建或私有化的安全网关，只需在启动客户端前配置环境变量：

### Windows PowerShell
```powershell
$env:QUICKNOTE_OFFICIAL_GATEWAY_URL = "https://quicknote-gateway.<your-subdomain>.workers.dev/v1"
```

### Windows 系统全局环境变量设置
1. 按 `Win + R` 输入 `sysdm.cpl` 打开系统属性；
2. 点击「高级」->「环境变量」；
3. 在用户变量或系统变量中新建：
   - 变量名：`QUICKNOTE_OFFICIAL_GATEWAY_URL`
   - 变量值：`https://quicknote-gateway.<your-subdomain>.workers.dev/v1`
4. 重新启动随身记客户端即可自动连接您的安全网关。

---

## 健康检查与接口测试

您可以通过 `curl` 快速测试网关的连通性：

```bash
# 1. 健康探针测试
curl https://quicknote-gateway.<your-subdomain>.workers.dev/health

# 预期返回：
# {"status":"healthy","gateway":"QuickNote Cloudflare Security Gateway",...}

# 2. 未携带 License 时的鉴权拦截测试
curl -X POST https://quicknote-gateway.<your-subdomain>.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hi"}]}'

# 预期返回 401:
# {"error":{"message":"请求缺少 X-QuickNote-License 凭证头...","type":"unauthorized"}}
```
