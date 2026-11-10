# Lemon Squeezy 收款与自动化发卡 Webhook 生产级配置与运维指南 (Runbook)

本文档为 **Bookmark Health Master (BHM-PRO v2.1.0)**（Chrome Web Store 官方扩展 ID: `nomieaphhhhhikklfhmhhjcdgicaikgn`）的商业化收款与自动化发卡系统的完整配置与上线指南。

---

## 1. 系统架构与交互流程全景

```
[ 买家在 BHM-PRO 扩展点击 Upgrade ]
                │
                ▼
 [ 打开 Lemon Squeezy 托管收银台 ]
 (https://bookmarkhealthmaster.lemonsqueezy.com/buy/...)
                │
                ▼
      [ 买家完成支付 (Stripe / PayPal / Apple Pay) ]
                │
       ┌────────┴────────┐
       ▼                 ▼
[ 屏幕展示支付成功 ]    [ Lemon Squeezy 异步推送 Webhook ]
                         (Header: X-Signature = HMAC-SHA256)
                                 │
                                 ▼
                   [ Webhook 接收网关 (CF Worker / Node.js) ]
                     ├── 1. 验证 HMAC-SHA256 签名 (防伪造)
                     ├── 2. 幂等性复核 (防重放、防超发)
                     ├── 3. 读取隔离区 Ed25519 私钥为订单签名
                     ├── 4. 持久化存储 (KV / SQLite)
                     └── 5. 触发 Resend API 发送双语发卡邮件
                                 │
                                 ▼
                     [ 买家邮箱收到 License Key ]
                                 │
                                 ▼
               [ 买家在 BHM-PRO 插件面板粘贴激活 ]
                                 │
                                 ▼
               [ core/license.js 纯离线 Ed25519 毫秒级验签 ]
                     └── 解锁 Pro LTD 无限清理 或 30天500条大扫除额度
```

---

## 2. Lemon Squeezy 商户后台产品配置

登录 [Lemon Squeezy 控制台](https://app.lemonsqueezy.com/)，在已审核通过的 Store（Store Slug: `bookmarkhealthmaster`）中创建以下两个官方产品：

### 方案 A：30天全量大扫除卡 (Single Wash Pass)
- **Product Name**: `BHM-PRO 30-Day Single Wash Pass (30天全量大扫除卡)`
- **Pricing Model**: Single payment (单次购买)
- **Price**: `$9.90 USD`
- **Variant Slug / Permalink**: `single-wash-pass`
  - 对应的官方结算 URL: `https://bookmarkhealthmaster.lemonsqueezy.com/buy/single-wash-pass`
- **Product Description**:
  - `EN`: 30-day full access with 500 dead link cleanups, deep DoH verification, and atomic rollback.
  - `ZH`: 30天全量权限，含 500 条死链清理额度、DoH 深度确诊与原子无损撤销。
- **Custom Checkout Data**: 在结算参数中携带 `tier=SINGLE_WASH`。

### 方案 B：Pro 终身买断授权 (Lifetime Buyout)
- **Product Name**: `BHM-PRO Lifetime Buyout (Pro 终身买断授权)`
- **Pricing Model**: Single payment (单次买断)
- **Price**: `$24.90 USD`
- **Variant Slug / Permalink**: `lifetime-buyout`
  - 对应的官方结算 URL: `https://bookmarkhealthmaster.lemonsqueezy.com/buy/lifetime-buyout`
- **Product Description**:
  - `EN`: Lifetime perpetual buyout with unlimited cleanups, 16 Tech Giants ecosystem reorganization, and UGC document isolation.
  - `ZH`: 终身买断永久授权，无限清理额度、16大全球科技巨头矩阵智能归类、协同文档隔离。
- **Custom Checkout Data**: 在结算参数中携带 `tier=LTD`。

---

## 3. Webhook 密钥与事件配置

在 Lemon Squeezy 控制台进入 **Settings -> Webhooks**，点击 **Add Webhook**：

1. **Callback URL**:
   - 生产环境 (Cloudflare Worker): `https://<YOUR_WORKER_SUBDOMAIN>.workers.dev/webhook` 或自定义域名 `https://license.bhm-pro.com/webhook`
   - 自建服务器 (Node.js): `https://api.bhm-pro.com/webhook`
2. **Signing Secret**:
   - 点击生成一个高强度的随机 Webhook Secret（例如通过 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成）。
   - **妥善保存此 Secret**，部署时配置为 `LEMON_SQUEEZY_WEBHOOK_SECRET`。
3. **Selected Events (勾选事件)**:
   - 必须勾选: `order_created`（订单创建付款成功，触发自动化发卡）
   - 必须勾选: `order_updated`（异步支付从 pending 确认到 paid 时自动发卡）
   - 建议勾选: `order_refunded`（订单退款，触发许可证吊销黑名单）

---

## 4. 方案一：Cloudflare Worker 无服务器边缘部署 (推荐)

代码目录位于 `webhook-worker/`，具备全球毫秒级冷启动、免服务器运维、零硬件故障风险。

### 步骤 4.1：创建 Cloudflare KV 命名空间
```bash
cd webhook-worker
npx wrangler kv:namespace create BHM_LICENSE_KV
```
将命令行输出的 `id` 填入 `webhook-worker/wrangler.toml` 中的 `[[kv_namespaces]] id = "..."`。

### 步骤 4.2：配置 Cloudflare 环境变量与私钥 Secret
私钥来源：`private-keys/bhm_prod_ed25519_private.json` 中的 `privateKeyPkcs8Base64`。

```bash
# 1. 设置 Lemon Squeezy Webhook 签名私钥
npx wrangler secret put LEMON_SQUEEZY_WEBHOOK_SECRET

# 2. 设置 Ed25519 生产级签名私钥 (PKCS#8 Base64)
# 从 private-keys/bhm_prod_ed25519_private.json 中读取并粘贴
npx wrangler secret put BHM_ED25519_PRIVATE_KEY_PKCS8

# 3. 设置 Resend API 密钥 (用于自动发送发卡邮件，从 resend.com 获取)
npx wrangler secret put RESEND_API_KEY
```

### 步骤 4.3：一键部署到生产边缘网络
```bash
npx wrangler deploy
```

部署完成后，控制台将输出类似：
`https://bhm-pro-lemon-squeezy-webhook.<subdomain>.workers.dev`

---

## 5. 方案二：独立 Node.js 服务器部署 (VPS / Docker / Railway)

代码目录位于 `server/`，基于 Node.js 原生标准库（`node:http`, `node:crypto`, `node:fs`），零第三方 npm 依赖，内置崩溃安全的原子文件存储。

### 步骤 5.1：配置环境变量
创建 `server/.env`（或在启动脚本中导出）：
```bash
PORT=3000
LEMON_SQUEEZY_WEBHOOK_SECRET="your_webhook_secret_here"
# 从 private-keys/bhm_prod_ed25519_private.json 中的 privateKeyPkcs8Base64 复制填入：
BHM_ED25519_PRIVATE_KEY_PKCS8="<PASTE_privateKeyPkcs8Base64_FROM_private-keys/bhm_prod_ed25519_private.json>"
RESEND_API_KEY="re_123456789"
FROM_EMAIL="BHM-PRO Licensing <licenses@bhm-pro.com>"
```

### 步骤 5.2：启动服务
```bash
# 本地直接运行
node server/webhook-server.js

# 或使用 PM2 守护进程生产运行
pm2 start server/webhook-server.js --name "bhm-license-server"
```

---

## 6. 自动化发卡邮件服务 (Resend 集成)

发卡邮件模板引擎位于 `shared/email-template.js`，具备以下特性：
1. **官方商店背书**：明确标注 Chrome Web Store 扩展 ID `nomieaphhhhhikklfhmhhjcdgicaikgn` 与直达安装链接。
2. **高可见激活码展示**：单行全选高亮格式，杜绝空格/乱码复制错误。
3. **中英双语 3 步教程**：指导买家在已安装的 BHM-PRO 仪表盘中激活。
4. **14天退款保障说明**：提供官方售后支持邮箱 `support@bhm-pro.com`。

### Resend 快速接入步骤：
1. 访问 [resend.com](https://resend.com/) 注册账号（免费版每月提供 3,000 封邮件，足敷起步阶段）。
2. **沙箱即刻测试**：测试阶段无需等待 DNS 解析，直接设置 `FROM_EMAIL="onboarding@resend.dev"` 即可立即向注册邮箱发信。
3. **正式上线生产**：在 Domains 中添加发件域名（如 `bhm-pro.com`），按提示配置 DNS TXT (SPF & DKIM) 记录后，将 `FROM_EMAIL` 设置为 `BHM-PRO Licensing <licenses@bhm-pro.com>`。
4. 创建 API Key 并配置到环境变量 `RESEND_API_KEY` 中即可全自动发信。

---

## 7. 买家自助查卡与查验端点 (Self-Service API)

服务内置买家自助查卡接口，买家若遗失激活码，无需人工客服介入：

- **买家查卡**: `GET /license?order_id=<ORDER_ID>&email=<BUYER_EMAIL>`
  - 支持传入收银台订单号（例如 `#12345` 或 `12345`）或 Lemon Squeezy 内部 ID。
  - 支持带 `+` 别名的邮箱（如 `user+bhm@gmail.com`）。
  - 成功返回:
    ```json
    {
      "orderId": "123456",
      "tier": "LTD",
      "status": "active",
      "licenseKey": "BHM1.eyJpZCI6...",
      "createdAt": "2026-11-09T12:00:00.000Z"
    }
    ```
- **在线验签与吊销检查**: `POST /v1/licenses/verify`
  - Body: `{ "licenseKey": "BHM1...." }`
  - 返回: `{ "valid": true, "revoked": false, "tier": "LTD" }`

---

## 8. 本地仿真与自动化测试验证命令

开发团队可在无需等待线上真实交易的情况下，通过内置 CLI 和自动化测试套件完成 100% 仿真校验：

```bash
# 1. 模拟 Lemon Squeezy LTD 终身买断订单 Webhook 触发
node scripts/keygen-license.js --simulate-webhook LTD

# 2. 模拟 Lemon Squeezy 30天大扫除订单 Webhook 触发
node scripts/keygen-license.js --simulate-webhook SINGLE_WASH

# 3. 模拟 Lemon Squeezy 退款订单 Webhook 触发
node scripts/keygen-license.js --simulate-webhook REFUND

# 4. 执行完整的 Webhook 端到端回归测试 (HTTP + Ed25519 + 存储 + 邮件 + 验签)
node tests/test_lemon_squeezy_webhook_e2e.js

# 5. 执行全项目 14 阶全量自动化测试
node tests/run_all_tests.js
```
