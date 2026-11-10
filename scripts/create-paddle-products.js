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

const API_KEY = getPaddleApiKey();
if (!API_KEY) {
  console.error('Error: Missing required environment variable PADDLE_API_KEY. Please provide it via env or .env.paddle.');
  process.exit(1);
}

async function paddleReq(endpoint, body) {
  const res = await fetch(`https://api.paddle.com${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Paddle API error [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data.data;
}

async function createProducts() {
  console.log('1. Creating Product 1: BHM-PRO 30-Day Single Wash Pass ($9.90)...');
  const prodSingle = await paddleReq('/products', {
    name: 'BHM-PRO 30-Day Single Wash Pass',
    description: '30-day access to batch quarantine up to 500 dead bookmark links with atomic rollback',
    tax_category: 'standard'
  });
  console.log('Product 1 created, ID:', prodSingle.id);

  console.log('2. Creating Price for Product 1 ($9.90 USD)...');
  const priceSingle = await paddleReq('/prices', {
    product_id: prodSingle.id,
    description: '30-Day Pass (500 dead links)',
    unit_price: {
      amount: '990', // $9.90 in cents
      currency_code: 'USD'
    }
  });
  console.log('Price 1 created, ID:', priceSingle.id);

  console.log('\n3. Creating Product 2: BHM-PRO Lifetime Buyout ($24.90)...');
  const prodLTD = await paddleReq('/products', {
    name: 'BHM-PRO Lifetime Buyout',
    description: 'Perpetual lifetime license for unlimited dead link cleaning and 16 tech ecosystems reorganization',
    tax_category: 'standard'
  });
  console.log('Product 2 created, ID:', prodLTD.id);

  console.log('4. Creating Price for Product 2 ($24.90 USD)...');
  const priceLTD = await paddleReq('/prices', {
    product_id: prodLTD.id,
    description: 'Lifetime Perpetual Buyout',
    unit_price: {
      amount: '2490', // $24.90 in cents
      currency_code: 'USD'
    }
  });
  console.log('Price 2 created, ID:', priceLTD.id);

  console.log('\n======================================================');
  console.log('ALL PRODUCTS CREATED SUCCESSFULLY ON PADDLE BILLING!');
  console.log('Product 1 (Single Wash $9.90):');
  console.log('  Product ID:', prodSingle.id);
  console.log('  Price ID:  ', priceSingle.id);
  console.log('Product 2 (Lifetime $24.90):');
  console.log('  Product ID:', prodLTD.id);
  console.log('  Price ID:  ', priceLTD.id);
  console.log('======================================================');

  return {
    singleWash: { productId: prodSingle.id, priceId: priceSingle.id },
    lifetime: { productId: prodLTD.id, priceId: priceLTD.id }
  };
}

createProducts().catch(err => {
  console.error('Failed to create products:', err);
  process.exit(1);
});
