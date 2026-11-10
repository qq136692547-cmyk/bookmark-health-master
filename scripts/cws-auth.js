// scripts/cws-auth.js - Chrome Web Store OAuth Token Exchange Helper
const http = require('http');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read from .env.cws if exists or process.env
let CLIENT_ID = process.env.CWS_CLIENT_ID;
let CLIENT_SECRET = process.env.CWS_CLIENT_SECRET;

const envPath = path.resolve(__dirname, '../.env.cws');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts[0] === 'CWS_CLIENT_ID') CLIENT_ID = parts.slice(1).join('=');
    if (parts[0] === 'CWS_CLIENT_SECRET') CLIENT_SECRET = parts.slice(1).join('=');
  });
}

if (!CLIENT_ID || !CLIENT_SECRET) {
  CLIENT_ID = process.argv[2];
  CLIENT_SECRET = process.argv[3];
}

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Usage: node scripts/cws-auth.js <CLIENT_ID> <CLIENT_SECRET> or set them in .env.cws');
  process.exit(1);
}
const PORT = 8989;
const REDIRECT_URI = `http://localhost:${PORT}`;

const authUrl = `https://accounts.google.com/o/oauth2/auth?` + new URLSearchParams({
  client_id: CLIENT_ID,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/chromewebstore',
  redirect_uri: REDIRECT_URI,
  access_type: 'offline',
  prompt: 'consent'
}).toString();

console.log('\n======================================================');
console.log('   Chrome Web Store API 一键授权服务 (已配置代理穿透)');
console.log('======================================================');
console.log('\n👉 请在浏览器中点击或打开以下授权链接：\n');
console.log(authUrl);
console.log('\n⏳ 本地回调监听中 (http://localhost:8989) ...\n');

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  if (reqUrl.pathname === '/') {
    const code = reqUrl.searchParams.get('code');
    const error = reqUrl.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>❌ 授权失败: ${error}</h2><p>您可以关闭此窗口。</p>`);
      console.error('OAuth error from Google:', error);
      server.close();
      return;
    }

    if (code) {
      try {
        console.log('收到授权码 Code，正在通过安全通道向 Google 换取 Refresh Token...');
        const curlOut = execFileSync('curl.exe', [
          '-s', '-X', 'POST', 'https://oauth2.googleapis.com/token',
          '-d', `client_id=${CLIENT_ID}`,
          '-d', `client_secret=${CLIENT_SECRET}`,
          '-d', `code=${code}`,
          '-d', 'grant_type=authorization_code',
          '-d', `redirect_uri=${REDIRECT_URI}`
        ], { encoding: 'utf8' });

        const tokenData = JSON.parse(curlOut);
        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }

        console.log('🎉 成功获取 Refresh Token！');

        // Save to .env.cws
        const envContent = [
          `CWS_CLIENT_ID=${CLIENT_ID}`,
          `CWS_CLIENT_SECRET=${CLIENT_SECRET}`,
          `CWS_REFRESH_TOKEN=${tokenData.refresh_token}`,
          `CWS_EXTENSION_ID=nomieaphhhhhikklfhmhhjcdgicaikgn`
        ].join('\n') + '\n';
        fs.writeFileSync('.env.cws', envContent, 'utf8');
        console.log('✅ 凭据已安全保存至 .env.cws！');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 60px 20px;">
            <h1 style="color: #10b981; font-size: 28px;">🎉 恭喜！Chrome Web Store API 授权成功！</h1>
            <p style="color: #334155; font-size: 16px; margin: 20px 0;">已成功生成长效 Refresh Token 并完成安全配置。</p>
            <p style="color: #64748b; font-size: 14px;">现在您可以直接关闭此网页，返回 AI 会话了。</p>
          </div>
        `);

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1500);
      } catch (err) {
        console.error('换取 Token 出错:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>❌ 换取 Token 失败: ${err.message}</h2>`);
      }
    }
  }
});

server.listen(PORT, 'localhost');
