// scripts/cws-publish.js - Chrome Web Store Automated Publish CLI (CWS API v2)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// 1. Read .env.cws
const envPath = path.resolve(__dirname, '../.env.cws');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.cws not found. Please run cws-auth first.');
  process.exit(1);
}

const envVars = {};
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx > 0) {
    envVars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
});

const CWS_CLIENT_ID = process.env.CWS_CLIENT_ID || envVars.CWS_CLIENT_ID;
const CWS_CLIENT_SECRET = process.env.CWS_CLIENT_SECRET || envVars.CWS_CLIENT_SECRET;
const CWS_REFRESH_TOKEN = process.env.CWS_REFRESH_TOKEN || envVars.CWS_REFRESH_TOKEN;
const CWS_EXTENSION_ID = process.env.CWS_EXTENSION_ID || envVars.CWS_EXTENSION_ID || 'nomieaphhhhhikklfhmhhjcdgicaikgn';
const CWS_PUBLISHER_ID = process.env.CWS_PUBLISHER_ID || envVars.CWS_PUBLISHER_ID || '8b651744-f4cd-4d7e-8674-845c4ee2f5aa';

if (!CWS_CLIENT_ID || !CWS_CLIENT_SECRET || !CWS_REFRESH_TOKEN) {
  console.error('Error: Missing required CWS credentials in .env.cws');
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const STATUS_ONLY = args.has('--status');
const UPLOAD_ONLY = args.has('--upload-only');
const ZIP_PATH = path.resolve(__dirname, '../bhm-pro-extension.zip');

/**
 * Detect active proxy from env vars or Windows system registry (WinINET)
 */
function detectProxyUrl() {
  const envProxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (envProxy) return envProxy;
  if (process.platform === 'win32') {
    try {
      const regOut = execFileSync('reg.exe', [
        'query',
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const enableMatch = regOut.match(/ProxyEnable\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
      const serverMatch = regOut.match(/ProxyServer\s+REG_SZ\s+([^\r\n]+)/);
      if (enableMatch && parseInt(enableMatch[1], 16) === 1 && serverMatch) {
        let srv = serverMatch[1].trim();
        // Handle per-protocol proxy strings like "http=127.0.0.1:7897;https=127.0.0.1:7897"
        const httpsPart = srv.split(';').find(p => p.startsWith('https='));
        if (httpsPart) srv = httpsPart.slice('https='.length);
        else if (srv.includes('=')) srv = srv.split(';')[0].split('=')[1];
        return /^https?:\/\//i.test(srv) ? srv : `http://${srv}`;
      }
    } catch (_) {
      // Ignore registry read failure; fall back to direct curl
    }
  }
  return null;
}

const PROXY_URL = detectProxyUrl();

function runCurl(curlArgs) {
  const finalArgs = ['-sS'];
  if (PROXY_URL) {
    finalArgs.push('-x', PROXY_URL);
  }
  finalArgs.push(...curlArgs);
  return execFileSync('curl.exe', finalArgs, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function parseJsonStrict(raw, stageName) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${stageName} 返回非 JSON 响应: ${raw}`);
  }
  if (data.error) {
    const msg = typeof data.error === 'string'
      ? (data.error_description || data.error)
      : `${data.error.code || ''} ${data.error.message || JSON.stringify(data.error)}`.trim();
    throw new Error(`${stageName} 接口报错: ${msg}`);
  }
  return data;
}

async function fetchAccessToken() {
  console.log('\n▶ [Auth] 正在向 Google OAuth2 获取 Access Token...');
  const raw = runCurl([
    '-X', 'POST', 'https://oauth2.googleapis.com/token',
    '--data-urlencode', `client_id=${CWS_CLIENT_ID}`,
    '--data-urlencode', `client_secret=${CWS_CLIENT_SECRET}`,
    '--data-urlencode', `refresh_token=${CWS_REFRESH_TOKEN}`,
    '--data-urlencode', 'grant_type=refresh_token',
    '--data-urlencode', 'scope=https://www.googleapis.com/auth/chromewebstore'
  ]);
  const data = parseJsonStrict(raw, 'Google OAuth2');
  if (!data.access_token) {
    throw new Error('Google OAuth2 未返回 access_token');
  }
  console.log('  ✓ Access Token 获取成功！');
  return data.access_token;
}

function fetchStatus(accessToken) {
  const url = `https://chromewebstore.googleapis.com/v2/publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}:fetchStatus`;
  const raw = runCurl([
    '-X', 'GET', url,
    '-H', `Authorization: Bearer ${accessToken}`
  ]);
  return parseJsonStrict(raw, 'CWS v2 fetchStatus');
}

async function main() {
  console.log('\n======================================================');
  console.log('   🚀 BHM-PRO Chrome Web Store 发布流水线 (API v2)');
  console.log('======================================================');
  console.log(`- Publisher ID : ${CWS_PUBLISHER_ID}`);
  console.log(`- 扩展程序 ID  : ${CWS_EXTENSION_ID}`);
  console.log(`- 网络代理     : ${PROXY_URL || '直连 (未检测到系统代理)'}`);

  const accessToken = await fetchAccessToken();

  if (STATUS_ONLY) {
    console.log('\n▶ [Status] 正在通过 CWS API v2 查询实时审核与发布状态...');
    const statusData = fetchStatus(accessToken);
    console.log(JSON.stringify(statusData, null, 2));
    return;
  }

  if (!fs.existsSync(ZIP_PATH)) {
    console.log('📦 Zip package not found, automatically triggering packaging pipeline...');
    require('./package-extension.js');
  }
  console.log(`- 打包文件路径 : ${ZIP_PATH} (${(fs.statSync(ZIP_PATH).size / 1024).toFixed(1)} KB)`);

  // Upload Zip Package (v2 media upload endpoint)
  console.log('\n▶ [Upload] 正在调用 CWS API v2 上传安装包...');
  const uploadUrl = `https://chromewebstore.googleapis.com/upload/v2/publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}:upload`;
  const uploadRaw = runCurl([
    '-X', 'POST', uploadUrl,
    '-H', `Authorization: Bearer ${accessToken}`,
    '-H', 'Content-Type: application/zip',
    '--data-binary', `@${ZIP_PATH}`
  ]);
  const uploadData = parseJsonStrict(uploadRaw, 'CWS v2 Upload');

  if (uploadData.uploadState !== 'SUCCEEDED') {
    console.error('上传响应:', JSON.stringify(uploadData, null, 2));
    throw new Error(`上传程序包失败: uploadState=${uploadData.uploadState}`);
  }
  console.log(`  ✓ 程序包上传成功！(crxVersion: ${uploadData.crxVersion}, uploadState: ${uploadData.uploadState})`);

  if (UPLOAD_ONLY) {
    console.log('\nℹ️ 已指定 --upload-only，草稿上传完成，跳过提交审核。');
    return;
  }

  // Publish / Submit for Review (v2 publish endpoint)
  console.log('\n▶ [Publish] 正在调用 CWS API v2 提交审核与发布...');
  const publishUrl = `https://chromewebstore.googleapis.com/v2/publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}:publish`;
  const publishRaw = runCurl([
    '-X', 'POST', publishUrl,
    '-H', `Authorization: Bearer ${accessToken}`,
    '-H', 'Content-Type: application/json',
    '-d', '{"publishType":"DEFAULT_PUBLISH"}'
  ]);
  const publishData = parseJsonStrict(publishRaw, 'CWS v2 Publish');

  console.log('\n======================================================');
  console.log('🎉 发布结果回报:');
  console.log(JSON.stringify(publishData, null, 2));
  console.log('======================================================');

  if (publishData.state === 'PENDING_REVIEW' || publishData.state === 'PUBLISHED') {
    console.log(`\n✅ 最新版本已成功进入 Chrome 官方通道 (state: ${publishData.state})！`);
  }
}

main().catch(err => {
  console.error('\n❌ 全自动发布失败:', err.message);
  process.exit(1);
});
