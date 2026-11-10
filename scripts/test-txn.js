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

async function test() {
  const r = await fetch('https://mcp.paddle.com/mcp', {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + PADDLE_API_KEY
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'execute',
        arguments: {
          code: 'async (client) => { const txn = await client.transactions.create({ items: [{ price_id: "pri_01m708eevn06vvarffpabpyprd", quantity: 1 }] }); return txn; }'
        }
      }
    })
  });
  const t = await r.text();
  console.log(t);
}

test();
