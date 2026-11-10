// scripts/upload-worker-secrets.js - Safely upload Cloudflare Worker secrets
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getSecret(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.resolve(__dirname, '../.env.paddle');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${name}=`)) {
        return trimmed.slice(`${name}=`.length).trim();
      }
    }
  }
  return null;
}

const webhookSecret = getSecret('PADDLE_WEBHOOK_SECRET');
if (!webhookSecret) {
  console.error('Error: Missing required environment variable PADDLE_WEBHOOK_SECRET. Please provide it via process.env or .env.paddle.');
  process.exit(1);
}

let privateKeyB64 = getSecret('ED25519_PRIVATE_KEY_B64');
if (!privateKeyB64) {
  const privateKeyPath = path.resolve(__dirname, '../private-keys/bhm_prod_ed25519_private.json');
  if (fs.existsSync(privateKeyPath)) {
    try {
      const keyData = JSON.parse(fs.readFileSync(privateKeyPath, 'utf8'));
      privateKeyB64 = keyData.privateKeyPkcs8Base64;
    } catch (_) {}
  }
}

if (!privateKeyB64) {
  console.error('Error: Missing required environment variable ED25519_PRIVATE_KEY_B64. Please provide it via process.env, .env.paddle, or private-keys/bhm_prod_ed25519_private.json.');
  process.exit(1);
}

const workerDir = path.resolve(__dirname, '../webhook-worker');

console.log('Setting PADDLE_WEBHOOK_SECRET...');
execSync('npx wrangler secret put PADDLE_WEBHOOK_SECRET', {
  cwd: workerDir,
  input: webhookSecret + '\n',
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

console.log('Setting ED25519_PRIVATE_KEY_B64...');
execSync('npx wrangler secret put ED25519_PRIVATE_KEY_B64', {
  cwd: workerDir,
  input: privateKeyB64 + '\n',
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

console.log('Secrets uploaded successfully!');
