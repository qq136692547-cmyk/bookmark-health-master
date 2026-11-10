/**
 * BHM-PRO Official Landing Page Logic & Paddle.js v2 Integration
 */

// Paddle Production Client Token & Price IDs
const PADDLE_CLIENT_TOKEN = 'live_5b5b8dd066fd28efac60f909dcc';
const PRICE_IDS = {
  SINGLE_WASH: 'pri_01m708ecngjxf937bz9zcs9m6f', // $9.90 USD
  LIFETIME: 'pri_01m708eevn06vvarffpabpyprd'     // $24.90 USD
};

// Helper: Escape HTML to prevent Reflected DOM XSS (LND-01, LND-08)
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global copy helper for license key (LND-06)
window.copyLicenseKeyToClipboard = function(btn, key) {
  if (!navigator.clipboard) {
    const input = document.createElement('textarea');
    input.value = key;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  } else {
    navigator.clipboard.writeText(key);
  }
  const origText = btn.innerHTML;
  btn.innerHTML = '✅ Copied!';
  btn.style.background = '#059669';
  setTimeout(() => {
    btn.innerHTML = origText;
    btn.style.background = '#2563eb';
  }, 2500);
};

// Initialize Paddle Billing
let paddleInitialized = false;
let activeCheckoutPriceId = null;
let checkoutOpenTimer = null;

function initPaddle() {
  if (typeof Paddle !== 'undefined') {
    try {
      Paddle.Environment.set('production');
      Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
        eventCallback: function(event) {
          console.log('[Paddle Event]', event.name, event.data);

          if (event.name === 'checkout.loaded') {
            if (checkoutOpenTimer) clearTimeout(checkoutOpenTimer);
          }

          if (event.name === 'checkout.completed') {
            if (checkoutOpenTimer) clearTimeout(checkoutOpenTimer);
            const customerEmail = event.data?.customer?.email || '';
            const orderId = event.data?.id || '';
            showSuccessNotification(orderId, customerEmail);
          }

          // LND-03: Catch error & warning events from Paddle and trigger fallback modal
          if (event.name === 'checkout.error' || event.name === 'checkout.failed' || event.name === 'checkout.warning') {
            if (checkoutOpenTimer) clearTimeout(checkoutOpenTimer);
            const errorMsg = event.data?.message || event.data?.detail || 'Paddle payment gateway encountered a temporary validation issue.';
            console.error('[Paddle Error Event]', event.name, event.data);
            showCheckoutFallback(activeCheckoutPriceId, errorMsg);
          }
        }
      });
      paddleInitialized = true;
      console.log('Paddle.js v2 initialized successfully with production token.');
    } catch (err) {
      console.error('Failed to initialize Paddle.js:', err);
    }
  } else {
    console.warn('Paddle.js script not loaded yet.');
  }
}

// Show friendly checkout fallback modal when Paddle.js is unavailable or blocked
function showCheckoutFallback(priceId, reason) {
  const existing = document.querySelector('.checkout-fallback-modal');
  if (existing) existing.remove();

  const safeReason = escapeHtml(reason || 'The Paddle.js checkout library could not initialize overlay mode.');

  const modal = document.createElement('div');
  modal.className = 'checkout-fallback-modal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(0,0,0,0.85)';
  modal.style.backdropFilter = 'blur(10px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '20px';

  modal.innerHTML = `
    <div style="background: #1e293b; border: 1px solid #3b82f6; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; text-align: left; color: #fff; box-shadow: 0 25px 60px rgba(0,0,0,0.7);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 28px;">🛡️</span>
          <h3 style="font-size: 20px; font-weight: 700; color: #60a5fa; margin: 0;">Payment Gateway Notice</h3>
        </div>
        <button onclick="this.closest('.checkout-fallback-modal').remove()" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; padding: 4px;">&times;</button>
      </div>
      <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 16px; line-height: 1.6;">
        ${safeReason}
      </p>
      <div style="background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; margin-bottom: 8px;">Recommended Next Steps:</h4>
        <ul style="padding-left: 20px; margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.7;">
          <li>If you use an ad-blocker (uBlock Origin, Brave Shields, AdGuard), please pause it for this page and refresh.</li>
          <li>Ensure cookies and cross-origin frames are allowed for Paddle Billing.</li>
          <li>Or directly email us at <a href="mailto:qq136692547@gmail.com?subject=BHM-PRO%20Purchase%20Assistance" style="color: #60a5fa; text-decoration: underline;">qq136692547@gmail.com</a> for immediate priority checkout assistance.</li>
        </ul>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button onclick="this.closest('.checkout-fallback-modal').remove()" style="background: #334155; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Close</button>
        <button onclick="location.reload()" style="background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Refresh Page</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Global Checkout Opener
window.openCheckout = function(priceKeyOrId) {
  const priceId = PRICE_IDS[priceKeyOrId] || priceKeyOrId;
  activeCheckoutPriceId = priceId;
  const tier = (priceKeyOrId === 'SINGLE_WASH' || priceId === PRICE_IDS.SINGLE_WASH) ? 'SINGLE_WASH' : 'LTD';

  if (!paddleInitialized && typeof Paddle !== 'undefined') {
    initPaddle();
  }

  if (typeof Paddle !== 'undefined' && Paddle.Checkout) {
    try {
      // LND-03: Set 8-second fallback timer in case checkout modal fails or hangs
      if (checkoutOpenTimer) clearTimeout(checkoutOpenTimer);
      checkoutOpenTimer = setTimeout(() => {
        showCheckoutFallback(priceId, 'The checkout modal is taking longer than expected to load. This may be due to ad-blockers or temporary gateway maintenance.');
      }, 8000);

      // LND-04: Explicitly pass customData with tier to prevent discount misclassification
      Paddle.Checkout.open({
        items: [
          {
            priceId: priceId,
            quantity: 1
          }
        ],
        customData: {
          tier: tier,
          source: 'bhm_official_landing'
        },
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: 'en',
          successUrl: window.location.origin + '/?checkout=success'
        }
      });
    } catch (e) {
      if (checkoutOpenTimer) clearTimeout(checkoutOpenTimer);
      console.error('Checkout error:', e);
      showCheckoutFallback(priceId, 'Encountered an issue opening Paddle checkout overlay. Please reach out to support.');
    }
  } else {
    showCheckoutFallback(priceId, 'Paddle payment checkout library could not be loaded (likely blocked by an ad-blocker or privacy extension).');
  }
};

// Notification on checkout complete (LND-01: escaped HTML)
function showSuccessNotification(orderId, email) {
  const existing = document.querySelector('.payment-success-modal-overlay');
  if (existing) existing.remove();

  const safeOrderId = escapeHtml(orderId);
  const safeEmail = escapeHtml(email);

  const modal = document.createElement('div');
  modal.className = 'payment-success-modal-overlay';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(0,0,0,0.85)';
  modal.style.backdropFilter = 'blur(10px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '20px';

  modal.innerHTML = `
    <div style="background: #1e293b; border: 1px solid #10b981; border-radius: 16px; padding: 32px; max-width: 500px; text-align: center; color: #fff; box-shadow: 0 25px 60px rgba(0,0,0,0.7);">
      <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
      <h3 style="font-size: 22px; font-weight: 800; margin-bottom: 8px; color: #34d399;">Payment Successful!</h3>
      <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">Thank you for upgrading to BHM-PRO! Your Ed25519 digital license key has been minted and will be sent to <strong>${safeEmail || 'your email'}</strong>.</p>
      ${safeOrderId ? `<div style="background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; margin-bottom: 20px; word-break: break-all;">Order ID: ${safeOrderId}</div>` : ''}
      <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 20px;">You can also retrieve your license immediately below using your Order ID and Email.</p>
      <button onclick="this.closest('.payment-success-modal-overlay').remove()" style="background: #2563eb; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">Got It</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// License Lookup Form Handler (LND-06: resilient lookup, 404 auto-retry, copy button)
let lookupRetryCount = 0;
const MAX_LOOKUP_RETRIES = 3;

async function handleLicenseLookup(e) {
  if (e && e.preventDefault) e.preventDefault();
  const orderInput = document.getElementById('lookup-order-id');
  const emailInput = document.getElementById('lookup-email');
  const resultBox = document.getElementById('lookup-result');

  if (!orderInput || !emailInput || !resultBox) return;

  const rawOrderId = orderInput.value.trim().replace(/^#/, '');
  const email = emailInput.value.trim().toLowerCase();

  if (!rawOrderId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    resultBox.className = 'lookup-result error';
    resultBox.textContent = 'Please enter a valid Paddle Order/Transaction ID and purchase Email.';
    resultBox.style.display = 'block';
    return;
  }

  resultBox.className = 'lookup-result';
  resultBox.textContent = lookupRetryCount > 0
    ? `Querying licensing server (Attempt ${lookupRetryCount + 1}/${MAX_LOOKUP_RETRIES + 1})...`
    : 'Querying licensing server...';
  resultBox.style.display = 'block';

  try {
    const workerUrl = `https://bhm-pro-license-worker.geo-score.workers.dev/license?order_id=${encodeURIComponent(rawOrderId)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(workerUrl);

    let data = {};
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    }

    if (res.ok && data.success && data.licenseKey) {
      lookupRetryCount = 0;
      const safeKey = escapeHtml(data.licenseKey);
      const safeTier = escapeHtml(data.tier || 'PRO');
      resultBox.className = 'lookup-result success';
      resultBox.innerHTML = `
        <strong>✅ License Retrieved Successfully:</strong><br>
        <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 6px; margin: 8px 0; word-break: break-all; font-family: monospace; font-size: 12px; color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3);">
          ${safeKey}
        </div>
        <div style="display: flex; gap: 10px; align-items: center; margin-top: 8px; flex-wrap: wrap;">
          <button type="button" data-key="${safeKey}" onclick="copyLicenseKeyToClipboard(this, this.getAttribute('data-key'))" style="background: #2563eb; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px;">📋 Copy License Key</button>
          <small style="color: #94a3b8;">Tier: <strong>${safeTier}</strong> • Paste into BHM-PRO SidePanel or Dashboard to activate.</small>
        </div>
      `;
    } else if (res.status === 404 && lookupRetryCount < MAX_LOOKUP_RETRIES) {
      lookupRetryCount++;
      resultBox.className = 'lookup-result';
      resultBox.innerHTML = `
        <span>⏳ Order processing by Paddle Webhook. Auto-retrying in 5 seconds... (${lookupRetryCount}/${MAX_LOOKUP_RETRIES})</span>
      `;
      setTimeout(() => handleLicenseLookup({}), 5000);
    } else {
      lookupRetryCount = 0;
      resultBox.className = 'lookup-result error';
      resultBox.textContent = data.error || 'No active license found for this Order ID and Email. If you just completed checkout, please wait 1-2 minutes for Paddle webhook verification, or contact support at qq136692547@gmail.com.';
    }
  } catch (err) {
    lookupRetryCount = 0;
    resultBox.className = 'lookup-result error';
    resultBox.innerHTML = `Unable to reach verification gateway. If your order was processed, your license key is safely recorded. Please contact <strong>qq136692547@gmail.com</strong> with your order receipt.`;
  }
}

// Interactive Feature Tabs
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// FAQ Accordion
function setupFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all other items
      faqItems.forEach(i => {
        i.classList.remove('open');
        const a = i.querySelector('.faq-answer');
        if (a) a.style.maxHeight = null;
      });

      // Toggle current
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

// Mobile Menu Toggle
function setupMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }
}

// Check URL parameters for return after Paddle redirect (LND-05: Paddle Billing v2 support)
function checkCheckoutSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('checkout') === 'success' || urlParams.has('_paddle_checkout') || urlParams.has('transaction_id')) {
    const orderId = urlParams.get('order_id') ||
                    urlParams.get('transaction_id') ||
                    urlParams.get('_paddle_checkout') ||
                    urlParams.get('paddle_transaction_id') ||
                    urlParams.get('p_order_id') || '';
    const email = urlParams.get('email') || urlParams.get('customer_email') || '';
    showSuccessNotification(orderId, email);

    if (orderId) {
      const orderInput = document.getElementById('lookup-order-id');
      if (orderInput) orderInput.value = orderId;
    }
    if (email) {
      const emailInput = document.getElementById('lookup-email');
      if (emailInput) emailInput.value = email;
    }

    const lookupSection = document.getElementById('license-lookup');
    if (lookupSection) {
      setTimeout(() => {
        lookupSection.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
  }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initPaddle();
  setupTabs();
  setupFAQ();
  setupMobileMenu();
  checkCheckoutSuccess();

  const lookupForm = document.getElementById('license-lookup-form');
  if (lookupForm) {
    lookupForm.addEventListener('submit', handleLicenseLookup);
  }
});
