const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const testHtml = path.resolve(__dirname, 'test.html');
const testPng = path.resolve(__dirname, 'test.png');

fs.writeFileSync(testHtml, `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1280px; height: 800px; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-family: sans-serif; }
  h1 { font-size: 48px; color: #38bdf8; }
</style>
</head>
<body>
  <h1>Chrome Screenshot Test</h1>
</body>
</html>`);

const cmd = `"${chromePath}" --headless=new --screenshot="${testPng}" --window-size=1280,800 --hide-scrollbars "${testHtml}"`;
console.log('Running cmd:', cmd);
execSync(cmd);

const buf = fs.readFileSync(testPng);
console.log('PNG size:', buf.length);
console.log('IHDR width:', buf.readUInt32BE(16));
console.log('IHDR height:', buf.readUInt32BE(20));
console.log('IHDR bit depth:', buf.readUInt8(24));
console.log('IHDR color type:', buf.readUInt8(25));
