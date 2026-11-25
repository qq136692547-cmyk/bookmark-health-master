/**
 * BHM-PRO Official Landing Page Logic & Paddle.js v2 Integration
 */

// Active Payment Gateway Configuration
const PRIMARY_PAYMENT = 'gumroad'; // 'gumroad' (Instant live) or 'paddle'

// Gumroad Direct & Overlay Links
const GUMROAD_URLS = {
  SINGLE_WASH: 'https://dengli.gumroad.com/l/bhm-pro-30day',
  LIFETIME: 'https://dengli.gumroad.com/l/bhm-pro-lifetime',
  TEAM: 'https://dengli.gumroad.com/l/bhm-pro-team'
};

// Paddle Production Client Token & Price IDs
const PADDLE_CLIENT_TOKEN = 'live_5b5b8dd066fd28efac60f909dcc';
const PRICE_IDS = {
  SINGLE_WASH: 'pri_01m708ecngjxf937bz9zcs9m6f', // $4.90 USD (Special Offer)
  LIFETIME: 'pri_01m708eevn06vvarffpabpyprd'     // $14.90 USD (Early Bird)
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
  const isZh = window.BHM_CURRENT_LANG === 'zh';
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
  btn.innerHTML = isZh ? '✅ 已复制！' : '✅ Copied!';
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
  const isZh = window.BHM_CURRENT_LANG === 'zh';
  const existing = document.querySelector('.checkout-fallback-modal');
  if (existing) existing.remove();

  const safeReason = escapeHtml(reason || (isZh ? '支付结算组件未能正常初始化浮层模式。' : 'The payment checkout library could not initialize overlay mode.'));
  const title = isZh ? '支付网关安全提醒' : 'Payment Gateway Notice';
  const stepsTitle = isZh ? '推荐排查与解决步骤：' : 'Recommended Next Steps:';
  const step1 = isZh
    ? '如果您开启了广告拦截插件 (如 uBlock Origin, Brave Shields, AdGuard)，请对本站暂时放行后刷新页面。'
    : 'If you use an ad-blocker (uBlock Origin, Brave Shields, AdGuard), please pause it for this page and refresh.';
  const step2 = isZh
    ? '请确保浏览器未禁用第三方 Cookie 或跨域结算安全框架。'
    : 'Ensure cookies and cross-origin frames are allowed for payment checkout.';
  const step3 = isZh
    ? '或者直接发送邮件至 <a href="mailto:bhm@geoscore.help?subject=BHM-PRO%20购买协助" style="color: #60a5fa; text-decoration: underline;">bhm@geoscore.help</a> 获取人工优先结算协助。'
    : 'Or directly email us at <a href="mailto:bhm@geoscore.help?subject=BHM-PRO%20Purchase%20Assistance" style="color: #60a5fa; text-decoration: underline;">bhm@geoscore.help</a> for immediate priority checkout assistance.';
  const closeBtn = isZh ? '关闭' : 'Close';
  const refreshBtn = isZh ? '刷新页面' : 'Refresh Page';

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
          <h3 style="font-size: 20px; font-weight: 700; color: #60a5fa; margin: 0;">${title}</h3>
        </div>
        <button onclick="this.closest('.checkout-fallback-modal').remove()" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; padding: 4px;">&times;</button>
      </div>
      <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 16px; line-height: 1.6;">
        ${safeReason}
      </p>
      <div style="background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; margin-bottom: 8px;">${stepsTitle}</h4>
        <ul style="padding-left: 20px; margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.7;">
          <li>${step1}</li>
          <li>${step2}</li>
          <li>${step3}</li>
        </ul>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button onclick="this.closest('.checkout-fallback-modal').remove()" style="background: #334155; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">${closeBtn}</button>
        <button onclick="location.reload()" style="background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">${refreshBtn}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Global Checkout Opener
window.openCheckout = function(priceKeyOrId, event) {
  let gumroadUrl = GUMROAD_URLS.LIFETIME;
  if (priceKeyOrId === 'SINGLE_WASH' || priceKeyOrId === PRICE_IDS.SINGLE_WASH) {
    gumroadUrl = GUMROAD_URLS.SINGLE_WASH;
  } else if (priceKeyOrId === 'TEAM') {
    gumroadUrl = GUMROAD_URLS.TEAM;
  }

  // 1. If PRIMARY_PAYMENT is gumroad, route directly to Gumroad
  if (PRIMARY_PAYMENT === 'gumroad') {
    if (typeof GumroadOverlay !== 'undefined' && GumroadOverlay.open) {
      if (event && event.preventDefault) event.preventDefault();
      GumroadOverlay.open({ url: gumroadUrl });
      return;
    }
    // If event is present on an <a> tag, native link opens Gumroad
    if (event) {
      return;
    }
    window.open(gumroadUrl, '_blank');
    return;
  }

  // 2. Otherwise route to Paddle
  openPaddleCheckout(priceKeyOrId);
};

window.openPaddleCheckout = function(priceKeyOrId) {
  const priceId = PRICE_IDS[priceKeyOrId] || priceKeyOrId;
  activeCheckoutPriceId = priceId;
  const tier = (priceKeyOrId === 'SINGLE_WASH' || priceId === PRICE_IDS.SINGLE_WASH) ? 'SINGLE_WASH' : 'LTD';

  if (!paddleInitialized && typeof Paddle !== 'undefined') {
    initPaddle();
  }

  if (typeof Paddle !== 'undefined' && Paddle.Checkout) {
    try {
      if (checkoutOpenTimer) clearTimeout(checkoutOpenTimer);
      checkoutOpenTimer = setTimeout(() => {
        showCheckoutFallback(priceId, window.BHM_CURRENT_LANG === 'zh'
          ? '结算浮层加载时间超过预期，这可能是由于网络拦截插件阻断或支付通道临时维护。'
          : 'The checkout modal is taking longer than expected to load. This may be due to ad-blockers or temporary gateway maintenance.');
      }, 8000);

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
          locale: (window.BHM_CURRENT_LANG === 'zh' ? 'zh-CN' : 'en'),
          successUrl: window.location.origin + '/?checkout=success'
        }
      });
    } catch (e) {
      if (checkoutOpenTimer) clearTimeout(checkoutOpenTimer);
      console.error('Checkout error:', e);
      showCheckoutFallback(priceId, window.BHM_CURRENT_LANG === 'zh'
        ? '调起结算弹窗遇到异常，请联系开发者邮箱获取协助。'
        : 'Encountered an issue opening checkout overlay. Please reach out to support.');
    }
  } else {
    showCheckoutFallback(priceId, window.BHM_CURRENT_LANG === 'zh'
      ? '未能加载支付结算组件（可能被广告过滤扩展或隐私防护阻断）。'
      : 'Payment checkout library could not be loaded (likely blocked by an ad-blocker or privacy extension).');
  }
};

// Notification on checkout complete (LND-01: escaped HTML)
function showSuccessNotification(orderId, email) {
  const isZh = window.BHM_CURRENT_LANG === 'zh';
  const existing = document.querySelector('.payment-success-modal-overlay');
  if (existing) existing.remove();

  const safeOrderId = escapeHtml(orderId);
  const safeEmail = escapeHtml(email);

  const title = isZh ? '🎉 支付成功！' : '🎉 Payment Successful!';
  const desc = isZh
    ? `感谢您升级至 BHM-PRO！您的 Ed25519 数字授权密钥已经铸造完成，并已同步发送至 <strong>${safeEmail || '您的邮箱'}</strong>。`
    : `Thank you for upgrading to BHM-PRO! Your Ed25519 digital license key has been minted and will be sent to <strong>${safeEmail || 'your email'}</strong>.`;
  const orderLabel = isZh ? '订单编号: ' : 'Order ID: ';
  const lookupHint = isZh
    ? '您也可以在下方自助找回模块中直接提取密钥。'
    : 'You can also retrieve your license immediately below using your Order ID and Email.';
  const btnText = isZh ? '我知道了' : 'Got It';

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
      <h3 style="font-size: 22px; font-weight: 800; margin-bottom: 8px; color: #34d399;">${title}</h3>
      <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">${desc}</p>
      ${safeOrderId ? `<div style="background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; margin-bottom: 20px; word-break: break-all;">${orderLabel}${safeOrderId}</div>` : ''}
      <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 20px;">${lookupHint}</p>
      <button onclick="this.closest('.payment-success-modal-overlay').remove()" style="background: #2563eb; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">${btnText}</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// License Lookup Form Handler (LND-06: resilient lookup, 404 auto-retry, copy button)
let lookupRetryCount = 0;
const MAX_LOOKUP_RETRIES = 3;

async function handleLicenseLookup(e) {
  if (e && e.preventDefault) e.preventDefault();
  const isZh = window.BHM_CURRENT_LANG === 'zh';
  const orderInput = document.getElementById('lookup-order-id');
  const emailInput = document.getElementById('lookup-email');
  const resultBox = document.getElementById('lookup-result');

  if (!orderInput || !emailInput || !resultBox) return;

  const rawOrderId = orderInput.value.trim().replace(/^#/, '');
  const email = emailInput.value.trim().toLowerCase();

  if (!rawOrderId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    resultBox.className = 'lookup-result error';
    resultBox.textContent = isZh
      ? '请输入有效的 Gumroad 订单号/交易编号与购买时填写的邮箱地址。'
      : 'Please enter a valid Gumroad Order ID and purchase Email.';
    resultBox.style.display = 'block';
    return;
  }

  resultBox.className = 'lookup-result';
  resultBox.textContent = lookupRetryCount > 0
    ? (isZh
        ? `正在向边缘授权节点查询授权记录 (第 ${lookupRetryCount + 1}/${MAX_LOOKUP_RETRIES + 1} 次尝试)...`
        : `Querying licensing server (Attempt ${lookupRetryCount + 1}/${MAX_LOOKUP_RETRIES + 1})...`)
    : (isZh
        ? '正在向边缘授权节点查询授权记录...'
        : 'Querying licensing server...');
  resultBox.style.display = 'block';

  try {
    const workerUrl = `https://bhm-pro-license-worker.geo-score.workers.dev/license?order_id=${encodeURIComponent(rawOrderId)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(workerUrl);

    let data = {};
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    }

    if (res.ok && data.success && (data.licenseKey || (Array.isArray(data.licenseKeys) && data.licenseKeys.length > 0))) {
      lookupRetryCount = 0;
      const safeTier = escapeHtml(data.tier || 'PRO');
      resultBox.className = 'lookup-result success';

      if (Array.isArray(data.licenseKeys) && data.licenseKeys.length > 1) {
        const teamTitle = isZh
          ? `✅ 团队包授权密钥查询成功（共 ${data.licenseKeys.length} 枚独立席位）：`
          : `✅ Team Pack Licenses Retrieved (${data.licenseKeys.length} Independent Seats):`;
        const copySeatText = isZh ? '📋 复制' : '📋 Copy';
        const copyAllText = isZh
          ? `📋 一键复制全部 ${data.licenseKeys.length} 枚密钥`
          : `📋 Copy All ${data.licenseKeys.length} Keys`;
        const tierHint = isZh
          ? `授权版本: <strong>${safeTier}</strong> • 每位团队成员使用独立席位密钥粘贴至 BHM-PRO 即可激活。`
          : `Tier: <strong>${safeTier}</strong> • Assign one independent seat key per team member to activate BHM-PRO.`;

        const keysHtml = data.licenseKeys.map((rawKey, idx) => {
          const safeSeatKey = escapeHtml(rawKey);
          const seatLabel = isZh ? `席位 #${idx + 1}` : `Seat #${idx + 1}`;
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: rgba(0,0,0,0.5); padding: 8px 10px; border-radius: 6px; margin: 6px 0; border: 1px solid rgba(16,185,129,0.3);">
              <div style="min-width: 0; flex: 1;">
                <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #38bdf8; margin-bottom: 2px;">${escapeHtml(seatLabel)}</span>
                <div style="word-break: break-all; font-family: monospace; font-size: 12px; color: #6ee7b7;">${safeSeatKey}</div>
              </div>
              <button type="button" data-key="${safeSeatKey}" onclick="copyLicenseKeyToClipboard(this, this.getAttribute('data-key'))" style="flex-shrink: 0; background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px;">${copySeatText}</button>
            </div>
          `;
        }).join('');

        const safeAllKeys = escapeHtml(data.licenseKeys.join('\n'));
        resultBox.innerHTML = `
          <strong>${teamTitle}</strong><br>
          <div style="margin: 8px 0;">${keysHtml}</div>
          <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px; flex-wrap: wrap;">
            <button type="button" data-key="${safeAllKeys}" onclick="copyLicenseKeyToClipboard(this, this.getAttribute('data-key'))" style="background: #2563eb; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px;">${copyAllText}</button>
            <small style="color: #94a3b8;">${tierHint}</small>
          </div>
        `;
      } else {
        const primaryKey = data.licenseKey || data.licenseKeys[0];
        const safeKey = escapeHtml(primaryKey);
        const successTitle = isZh ? '✅ 授权密钥查询成功：' : '✅ License Retrieved Successfully:';
        const copyBtnText = isZh ? '📋 复制授权码' : '📋 Copy License Key';
        const tierHint = isZh
          ? `授权版本: <strong>${safeTier}</strong> • 复制后粘贴至 BHM-PRO 侧边栏或大盘即可直接激活。`
          : `Tier: <strong>${safeTier}</strong> • Paste into BHM-PRO SidePanel or Dashboard to activate.`;

        resultBox.innerHTML = `
          <strong>${successTitle}</strong><br>
          <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 6px; margin: 8px 0; word-break: break-all; font-family: monospace; font-size: 12px; color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3);">
            ${safeKey}
          </div>
          <div style="display: flex; gap: 10px; align-items: center; margin-top: 8px; flex-wrap: wrap;">
            <button type="button" data-key="${safeKey}" onclick="copyLicenseKeyToClipboard(this, this.getAttribute('data-key'))" style="background: #2563eb; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px;">${copyBtnText}</button>
            <small style="color: #94a3b8;">${tierHint}</small>
          </div>
        `;
      }
    } else if (res.status === 404 && lookupRetryCount < MAX_LOOKUP_RETRIES) {
      lookupRetryCount++;
      resultBox.className = 'lookup-result';
      const retryMsg = isZh
        ? `<span>⏳ 订单正在由 Gumroad Webhook 处理中，将在 5 秒后自动重试... (${lookupRetryCount}/${MAX_LOOKUP_RETRIES})</span>`
        : `<span>⏳ Order processing by Gumroad Webhook. Auto-retrying in 5 seconds... (${lookupRetryCount}/${MAX_LOOKUP_RETRIES})</span>`;
      resultBox.innerHTML = retryMsg;
      setTimeout(() => handleLicenseLookup({}), 5000);
    } else {
      lookupRetryCount = 0;
      resultBox.className = 'lookup-result error';
      resultBox.textContent = data.error || (isZh
        ? '未查询到该订单号与邮箱对应的有效授权。如果您刚刚完成支付，请稍候 1-2 分钟等待 Gumroad Webhook 处理完毕，或联系开发者邮箱 bhm@geoscore.help。'
        : 'No active license found for this Order ID and Email. If you just completed checkout, please wait 1-2 minutes for Gumroad webhook verification, or contact support at bhm@geoscore.help.');
    }
  } catch (err) {
    lookupRetryCount = 0;
    resultBox.className = 'lookup-result error';
    resultBox.innerHTML = isZh
      ? `无法连接至授权网关。只要您的订单扣款成功，授权记录已永久安全存档。请发送邮件至 <strong>bhm@geoscore.help</strong> 附上您的付款凭据。`
      : `Unable to reach verification gateway. If your order was processed, your license key is safely recorded. Please contact <strong>bhm@geoscore.help</strong> with your order receipt.`;
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

// Check URL parameters for return after checkout redirect (Gumroad & fallback gateways)
function checkCheckoutSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('checkout') === 'success' || urlParams.has('order_number') || urlParams.has('sale_id') || urlParams.has('_paddle_checkout') || urlParams.has('transaction_id')) {
    const orderId = urlParams.get('order_id') ||
                    urlParams.get('order_number') ||
                    urlParams.get('sale_id') ||
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

// ==========================================================================
// Hero Interactive Simulation Sandbox & GA4 Conversion Tracking (P0-3)
// ==========================================================================
function trackGA4Event(eventName, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, params);
    } catch (_) {}
  }
}

function setupHeroSimulation() {
  const runBtn = document.getElementById('runHeroDemoBtn');
  const ctaBox = document.getElementById('simCtaBox');
  const simDeadVal = document.getElementById('simDeadVal');
  const simEcoVal = document.getElementById('simEcoVal');
  const simShieldVal = document.getElementById('simShieldVal');

  const simTag2 = document.getElementById('simTag2');
  const simTag3 = document.getElementById('simTag3');
  const simTag4 = document.getElementById('simTag4');
  const simTag5 = document.getElementById('simTag5');

  if (!runBtn) return;

  runBtn.addEventListener('click', () => {
    trackGA4Event('run_hero_demo', { event_category: 'engagement' });

    runBtn.disabled = true;
    const isZh = window.BHM_CURRENT_LANG === 'zh';
    runBtn.textContent = isZh ? '⚡ 正在本地沙箱极速重构...' : '⚡ Simulating Local Sandbox Engine...';

    if (ctaBox) ctaBox.classList.add('hidden');

    // Step 1: Detect 404 dead link
    setTimeout(() => {
      if (simDeadVal) simDeadVal.textContent = '48';
      if (simTag2) {
        simTag2.className = 'sim-tag sim-tag-dead';
        simTag2.textContent = isZh ? '404 死链 (DoH 确诊)' : '404 Dead (DoH Confirmed)';
      }
    }, 600);

    // Step 2: Cluster GitHub ecosystem
    setTimeout(() => {
      if (simDeadVal) simDeadVal.textContent = '142';
      if (simEcoVal) simEcoVal.textContent = '210';
      if (simTag3) {
        simTag3.className = 'sim-tag sim-tag-eco';
        simTag3.textContent = isZh ? '已归拢: GitHub 生态' : 'Clustered: GitHub';
      }
    }, 1400);

    // Step 3: Shield collaborative Figma docs
    setTimeout(() => {
      if (simShieldVal) simShieldVal.textContent = '28';
      if (simTag4) {
        simTag4.className = 'sim-tag sim-tag-shield';
        simTag4.textContent = isZh ? '已保护: Figma 协作库' : 'Shielded: Figma';
      }
    }, 2000);

    // Step 4: Cluster AWS Cloud & finish simulation
    setTimeout(() => {
      if (simEcoVal) simEcoVal.textContent = '486';
      if (simTag5) {
        simTag5.className = 'sim-tag sim-tag-eco';
        simTag5.textContent = isZh ? '已归拢: AWS 云生态' : 'Clustered: AWS Cloud';
      }

      runBtn.disabled = false;
      runBtn.textContent = isZh ? '🔄 再次体验重构' : '🔄 Re-run Simulation';
      if (ctaBox) ctaBox.classList.remove('hidden');
    }, 2800);
  });
}

function setupSimPlaybookTabs() {
  const tabBtns = document.querySelectorAll('.sim-playbook-tab');
  const panels = document.querySelectorAll('.sim-playbook-panel');
  if (!tabBtns.length || !panels.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-sim-tab');
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
      trackGA4Event('click_sim_playbook_tab', { event_category: 'engagement', tab: targetId });
    });
  });
}

function renderFallbackBadgeSvg(svgEl, score, dead) {
  if (!svgEl || typeof document === 'undefined') return;
  const ns = 'http://www.w3.org/2000/svg';
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

  const labelText = 'Bookmark Health';
  const valueText = `${score}/100 · ${dead} dead`;
  const leftW = 112;
  const rightW = Math.max(96, valueText.length * 7 + 16);
  const totalW = leftW + rightW;
  const color = score >= 90 ? '#10b981' : (score >= 70 ? '#3b82f6' : (score >= 50 ? '#f59e0b' : '#ef4444'));

  svgEl.setAttribute('width', String(totalW));
  svgEl.setAttribute('height', '24');
  svgEl.setAttribute('viewBox', `0 0 ${totalW} 24`);

  const leftRect = document.createElementNS(ns, 'rect');
  leftRect.setAttribute('width', String(leftW));
  leftRect.setAttribute('height', '24');
  leftRect.setAttribute('rx', '4');
  leftRect.setAttribute('fill', '#1e293b');
  svgEl.appendChild(leftRect);

  const rightRect = document.createElementNS(ns, 'rect');
  rightRect.setAttribute('x', String(leftW));
  rightRect.setAttribute('width', String(rightW));
  rightRect.setAttribute('height', '24');
  rightRect.setAttribute('rx', '4');
  rightRect.setAttribute('fill', color);
  svgEl.appendChild(rightRect);

  const leftTxt = document.createElementNS(ns, 'text');
  leftTxt.setAttribute('x', String(leftW / 2));
  leftTxt.setAttribute('y', '16');
  leftTxt.setAttribute('fill', '#f8fafc');
  leftTxt.setAttribute('font-family', 'Verdana,DejaVu Sans,sans-serif');
  leftTxt.setAttribute('font-size', '11');
  leftTxt.setAttribute('font-weight', '600');
  leftTxt.setAttribute('text-anchor', 'middle');
  leftTxt.textContent = labelText;
  svgEl.appendChild(leftTxt);

  const rightTxt = document.createElementNS(ns, 'text');
  rightTxt.setAttribute('x', String(leftW + rightW / 2));
  rightTxt.setAttribute('y', '16');
  rightTxt.setAttribute('fill', '#ffffff');
  rightTxt.setAttribute('font-family', 'Verdana,DejaVu Sans,sans-serif');
  rightTxt.setAttribute('font-size', '11');
  rightTxt.setAttribute('font-weight', '700');
  rightTxt.setAttribute('text-anchor', 'middle');
  rightTxt.textContent = valueText;
  svgEl.appendChild(rightTxt);
}

function setupBadgeGenerator() {
  const scoreRange = document.getElementById('badgeScoreRange');
  const scoreInput = document.getElementById('badgeScoreInput');
  const deadRange = document.getElementById('badgeDeadRange');
  const deadInput = document.getElementById('badgeDeadInput');
  const previewImg = document.getElementById('badgePreviewImg');
  const fallbackSvg = document.getElementById('badgeFallbackSvg');
  const mdInput = document.getElementById('badgeMarkdownCode');
  const htmlInput = document.getElementById('badgeHtmlCode');
  const copyMdBtn = document.getElementById('copyBadgeMdBtn');
  const copyHtmlBtn = document.getElementById('copyBadgeHtmlBtn');

  if (!scoreRange || !scoreInput || !deadRange || !deadInput || !previewImg || !mdInput || !htmlInput) return;

  function clampInt(val, min, max, fallback) {
    const n = parseInt(val, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function updateBadge(scoreRaw, deadRaw) {
    const score = clampInt(scoreRaw, 0, 100, 98);
    const dead = clampInt(deadRaw, 0, 50, 0);

    scoreRange.value = String(score);
    scoreInput.value = String(score);
    deadRange.value = String(dead);
    deadInput.value = String(dead);

    const badgeUrl = `https://bhm-pro-license-worker.geo-score.workers.dev/badge.svg?score=${score}&dead=${dead}`;
    const homeUrl = 'https://bhm.geoscore.help/';

    previewImg.classList.remove('hidden');
    if (fallbackSvg) {
      fallbackSvg.classList.add('hidden');
      renderFallbackBadgeSvg(fallbackSvg, score, dead);
    }
    previewImg.src = badgeUrl;

    mdInput.value = `[![Bookmark Health](${badgeUrl})](${homeUrl})`;
    htmlInput.value = `<a href="${homeUrl}"><img src="${badgeUrl}" alt="Bookmark Health"></a>`;
  }

  previewImg.addEventListener('error', () => {
    previewImg.classList.add('hidden');
    if (fallbackSvg) {
      renderFallbackBadgeSvg(fallbackSvg, clampInt(scoreInput.value, 0, 100, 98), clampInt(deadInput.value, 0, 50, 0));
      fallbackSvg.classList.remove('hidden');
    }
  });

  previewImg.addEventListener('load', () => {
    previewImg.classList.remove('hidden');
    if (fallbackSvg) fallbackSvg.classList.add('hidden');
  });

  scoreRange.addEventListener('input', () => updateBadge(scoreRange.value, deadInput.value));
  scoreInput.addEventListener('input', () => updateBadge(scoreInput.value, deadInput.value));
  deadRange.addEventListener('input', () => updateBadge(scoreInput.value, deadRange.value));
  deadInput.addEventListener('input', () => updateBadge(scoreInput.value, deadInput.value));

  function copySnippet(btn, inputEl, eventName) {
    if (!btn || !inputEl) return;
    const text = inputEl.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    } else {
      inputEl.select();
      document.execCommand('copy');
    }
    const isZh = window.BHM_CURRENT_LANG === 'zh';
    const prevText = btn.textContent;
    btn.textContent = isZh ? '✅ 已复制！' : '✅ Copied!';
    setTimeout(() => {
      btn.textContent = prevText;
    }, 2000);
    trackGA4Event(eventName, { event_category: 'engagement' });
  }

  if (copyMdBtn) {
    copyMdBtn.addEventListener('click', () => copySnippet(copyMdBtn, mdInput, 'copy_badge_markdown'));
  }
  if (copyHtmlBtn) {
    copyHtmlBtn.addEventListener('click', () => copySnippet(copyHtmlBtn, htmlInput, 'copy_badge_html'));
  }

  updateBadge(scoreInput.value, deadInput.value);
}

function setupGA4Tracking() {
  // 监听所有 Chrome Web Store 点击
  document.querySelectorAll('a[href*="chromewebstore.google.com"]').forEach(link => {
    link.addEventListener('click', () => {
      trackGA4Event('click_cws_install', { event_category: 'conversion', link_url: link.href });
    });
  });

  // 监听所有 Gumroad Lifetime 购买点击
  document.querySelectorAll('a[href*="bhm-pro-lifetime"]').forEach(link => {
    link.addEventListener('click', () => {
      trackGA4Event('click_gumroad_lifetime', { event_category: 'conversion', value: 14.90, currency: 'USD' });
    });
  });

  // 监听所有 Gumroad 5-Seat Team 购买点击
  document.querySelectorAll('a[href*="bhm-pro-team"]').forEach(link => {
    link.addEventListener('click', () => {
      trackGA4Event('click_gumroad_team', { event_category: 'conversion', value: 39.00, currency: 'USD' });
    });
  });

  // 监听所有 Gumroad 30-Day 购买点击
  document.querySelectorAll('a[href*="bhm-pro-30day"]').forEach(link => {
    link.addEventListener('click', () => {
      trackGA4Event('click_gumroad_30d', { event_category: 'conversion', value: 4.90, currency: 'USD' });
    });
  });
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initPaddle();
  setupTabs();
  setupFAQ();
  setupMobileMenu();
  setupHeroSimulation();
  setupSimPlaybookTabs();
  setupBadgeGenerator();
  setupGA4Tracking();
  checkCheckoutSuccess();

  const lookupForm = document.getElementById('license-lookup-form');
  if (lookupForm) {
    lookupForm.addEventListener('submit', handleLicenseLookup);
  }
});
