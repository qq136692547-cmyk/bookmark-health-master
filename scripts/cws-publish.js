// scripts/cws-publish.js - Chrome Web Store Automated Publish CLI
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
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    envVars[parts[0]] = parts.slice(1).join('=');
  }
});

const {
  CWS_CLIENT_ID,
  CWS_CLIENT_SECRET,
  CWS_REFRESH_TOKEN,
  CWS_EXTENSION_ID = 'nomieaphhhhhikklfhmhhjcdgicaikgn'
} = envVars;

if (!CWS_CLIENT_ID || !CWS_CLIENT_SECRET || !CWS_REFRESH_TOKEN) {
  console.error('Error: Missing required CWS credentials in .env.cws');
  process.exit(1);
}

const ZIP_PATH = path.resolve(__dirname, '../bhm-pro-extension.zip');
if (!fs.existsSync(ZIP_PATH)) {
  console.log('📦 Zip package not found, automatically triggering packaging pipeline...');
  require('./package-extension.js');
}

console.log('\n======================================================');
console.log('   🚀 BHM-PRO Chrome Web Store 全自动发布流水线');
console.log('======================================================');
console.log(`- 扩展程序 ID: ${CWS_EXTENSION_ID}`);
console.log(`- 打包文件路径: ${ZIP_PATH} (${(fs.statSync(ZIP_PATH).size / 1024).toFixed(1)} KB)`);

async function publish() {
  // Step 1: Refresh Access Token
  console.log('\n▶ [Step 1/3] 正在向 Google 获取临时 Access Token...');
  const tokenCurl = execFileSync('curl.exe', [
    '-s', '-X', 'POST', 'https://oauth2.googleapis.com/token',
    '-d', `client_id=${CWS_CLIENT_ID}`,
    '-d', `client_secret=${CWS_CLIENT_SECRET}`,
    '-d', `refresh_token=${CWS_REFRESH_TOKEN}`,
    '-d', 'grant_type=refresh_token'
  ], { encoding: 'utf8' });

  const tokenData = JSON.parse(tokenCurl);
  if (tokenData.error) {
    throw new Error('Google OAuth 错误: ' + (tokenData.error_description || tokenData.error));
  }
  const accessToken = tokenData.access_token;
  console.log('  ✓ Access Token 获取成功！');

  // Step 2: Upload Zip Package
  console.log('\n▶ [Step 2/3] 正在调用 Google API 上传安装包到 Chrome Web Store...');
  const uploadCurl = execFileSync('curl.exe', [
    '-s', '-X', 'PUT',
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${CWS_EXTENSION_ID}`,
    '-H', `Authorization: Bearer ${accessToken}`,
    '-H', 'x-goog-api-version: 2',
    '-T', ZIP_PATH
  ], { encoding: 'utf8' });

  let uploadData = {};
  try {
    uploadData = JSON.parse(uploadCurl);
  } catch (e) {
    throw new Error('上传返回异常: ' + uploadCurl);
  }

  if (uploadData.uploadState !== 'SUCCESS') {
    console.error('上传响应:', JSON.stringify(uploadData, null, 2));
    throw new Error('上传程序包失败: ' + (uploadData.itemError?.[0]?.error_detail || JSON.stringify(uploadData)));
  }
  console.log('  ✓ 程序包上传成功！(Upload State: SUCCESS)');

  // Step 3: Publish to Web Store (Submit for Review)
  console.log('\n▶ [Step 3/3] 正在提交审核与全球发布...');
  const publishCurl = execFileSync('curl.exe', [
    '-s', '-X', 'POST',
    `https://www.googleapis.com/chromewebstore/v1.1/items/${CWS_EXTENSION_ID}/publish`,
    '-H', `Authorization: Bearer ${accessToken}`,
    '-H', 'x-goog-api-version: 2',
    '-H', 'Content-Length: 0'
  ], { encoding: 'utf8' });

  let publishData = {};
  try {
    publishData = JSON.parse(publishCurl);
  } catch (e) {
    throw new Error('发布响应异常: ' + publishCurl);
  }

  console.log('\n======================================================');
  console.log('🎉 发布结果回报:');
  console.log(JSON.stringify(publishData, null, 2));
  console.log('======================================================');

  if (publishData.status && publishData.status.includes('OK')) {
    console.log('\n✅ 恭喜！最新版本已成功提交 Chrome 官方审核通道！');
  }
}

publish().catch(err => {
  console.error('\n❌ 全自动发布失败:', err.message);
  process.exit(1);
});
