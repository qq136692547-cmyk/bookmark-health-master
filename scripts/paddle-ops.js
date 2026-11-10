// scripts/paddle-ops.js - Paddle Live Ops Helper
const fs = require('fs');
const path = require('path');

function getPaddleApiKey() {
  if (process.env.PADDLE_API_KEY) return process.env.PADDLE_API_KEY;
  const envPath = path.resolve(__dirname, '../.env.paddle');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('PADDLE_API_KEY=')) {
        return trimmed.slice('PADDLE_API_KEY='.length).trim();
      }
    }
  }
  return null;
}

const PADDLE_API_KEY = getPaddleApiKey();
if (!PADDLE_API_KEY) {
  console.error('Error: Missing required environment variable PADDLE_API_KEY. Please provide it via env or .env.paddle.');
  process.exit(1);
}
const MCP_URL = 'https://mcp.paddle.com/mcp';

async function callMcpExecute(code) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PADDLE_API_KEY}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'execute',
        arguments: { code }
      }
    })
  });
  const text = await res.text();
  const match = text.match(/data:\s*(\{.*\})/);
  if (!match) throw new Error('Invalid MCP response: ' + text);
  const data = JSON.parse(match[1]);
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return JSON.parse(data.result.content[0].text);
}

async function main() {
  const cmd = process.argv[2] || 'status';

  if (cmd === 'status') {
    console.log('📡 Fetching Paddle Live status via MCP...');
    const result = await callMcpExecute(`async (client) => {
      const products = await client.products.list();
      const prices = await client.prices.list();
      let domains = [];
      try { domains = await client.checkoutDomains.list(); } catch (e) { domains = { error: e.message }; }
      return { products, prices, domains };
    }`);
    console.log('\n--- 🛒 PRODUCTS ---');
    (result.products.products || []).forEach(p => {
      console.log(`- [${p.status.toUpperCase()}] ${p.name} (ID: ${p.id})`);
    });
    console.log('\n--- 🏷️ PRICES ---');
    (result.prices.prices || []).forEach(pr => {
      const amount = (parseInt(pr.unit_price.amount) / 100).toFixed(2);
      console.log(`- ${pr.description || pr.id}: \$${amount} ${pr.unit_price.currency_code} (ID: ${pr.id})`);
    });
    console.log('\n--- 🌐 CHECKOUT DOMAINS ---');
    console.log(JSON.stringify(result.domains, null, 2));
  } else if (cmd === 'orders') {
    console.log('📡 Fetching Paddle Live transactions via MCP...');
    const result = await callMcpExecute(`async (client) => {
      return await client.transactions.list();
    }`);
    const txns = result.transactions || [];
    console.log(`Found ${txns.length} transactions.`);
    txns.forEach(t => {
      console.log(`- ${t.id}: ${t.status} | Customer: ${t.customer_id} | Total: ${t.details?.totals?.total} ${t.currency_code}`);
    });
  } else if (cmd === 'customers') {
    console.log('📡 Fetching Paddle Live customers via MCP...');
    const result = await callMcpExecute(`async (client) => {
      return await client.customers.list();
    }`);
    const custs = result.customers || [];
    console.log(`Found ${custs.length} customers.`);
    custs.forEach(c => {
      console.log(`- ${c.id}: ${c.email} (Status: ${c.status})`);
    });
  } else {
    console.log('Usage: node scripts/paddle-ops.js [status|orders|customers]');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
