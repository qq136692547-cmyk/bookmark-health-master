const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('▶ [Landing Page i18n E2E Test Suite (Zero External Dependencies)]');
console.log('================================================================');

const htmlContent = fs.readFileSync(path.join(__dirname, '../landing-page/index.html'), 'utf8');
const { BHM_I18N_DICT, detectPreferredLanguage, applyLanguage, BHM_LANDING_I18N } = require('../landing-page/i18n.js');

// Simple DOM Mock for unit testing without JSDOM
function createMockEnvironment({ search = '', lang = 'en-US', storedLang = null } = {}) {
  const store = {};
  if (storedLang) store['bhm_lang'] = storedLang;

  const elements = [];

  // Parse elements with data-i18n, data-i18n-html, data-i18n-placeholder from HTML
  const textMatches = [...htmlContent.matchAll(/<([a-zA-Z0-9]+)[^>]*data-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)];
  for (const m of textMatches) {
    elements.push({
      type: 'text',
      key: m[2],
      textContent: m[3].trim(),
      getAttribute: (attr) => attr === 'data-i18n' ? m[2] : null,
      setAttribute: function(attr, val) { this[attr] = val; }
    });
  }

  const htmlMatches = [...htmlContent.matchAll(/<([a-zA-Z0-9]+)[^>]*data-i18n-html="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)];
  for (const m of htmlMatches) {
    elements.push({
      type: 'html',
      key: m[2],
      innerHTML: m[3].trim(),
      getAttribute: (attr) => attr === 'data-i18n-html' ? m[2] : null,
      setAttribute: function(attr, val) { this[attr] = val; }
    });
  }

  const placeholderMatches = [...htmlContent.matchAll(/<input[^>]*data-i18n-placeholder="([^"]+)"[^>]*>/g)];
  for (const m of placeholderMatches) {
    elements.push({
      type: 'placeholder',
      key: m[1],
      placeholder: '',
      getAttribute: (attr) => attr === 'data-i18n-placeholder' ? m[1] : null,
      setAttribute: function(attr, val) { this[attr] = val; }
    });
  }

  const chipElements = [
    { lang: 'zh', classes: new Set(), getAttribute: (attr) => attr === 'data-lang' ? 'zh' : null, classList: { add(c) { this.classes.add(c); }, remove(c) { this.classes.delete(c); }, contains(c) { return this.classes.has(c); }, classes: new Set() }, setAttribute() {} },
    { lang: 'en', classes: new Set(['active']), getAttribute: (attr) => attr === 'data-lang' ? 'en' : null, classList: { add(c) { this.classes.add(c); }, remove(c) { this.classes.delete(c); }, contains(c) { return this.classes.has(c); }, classes: new Set(['active']) }, setAttribute() {} }
  ];

  chipElements[0].classList.classes = chipElements[0].classes;
  chipElements[1].classList.classes = chipElements[1].classes;

  const mockDoc = {
    title: 'Original Title',
    documentElement: { lang: 'en' },
    querySelector: (sel) => {
      if (sel === 'meta[name="description"]') {
        return { setAttribute: (k, v) => { mockDoc.metaDesc = v; } };
      }
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '[data-i18n]') return elements.filter(e => e.type === 'text');
      if (sel === '[data-i18n-html]') return elements.filter(e => e.type === 'html');
      if (sel === '[data-i18n-placeholder]') return elements.filter(e => e.type === 'placeholder');
      if (sel === '[data-i18n-title]') return [];
      if (sel === '.lang-chip') return chipElements;
      return [];
    }
  };

  const mockWindow = {
    location: { search },
    localStorage: {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = String(v); }
    },
    navigator: {
      language: lang
    },
    dispatchEvent: () => {}
  };

  return { mockDoc, mockWindow, elements, chipElements, store };
}

// Sub-test 1: Browser language zh-CN auto-detection
console.log('\n[Sub-test 1] Intelligent Default: Browser language zh-CN');
{
  const env = createMockEnvironment({ search: '', lang: 'zh-CN' });
  global.window = env.mockWindow;
  global.document = env.mockDoc;
  global.localStorage = env.mockWindow.localStorage;
  global.navigator = env.mockWindow.navigator;

  const detected = detectPreferredLanguage();
  assert.strictEqual(detected, 'zh', 'Detected language must be zh for zh-CN browser');

  applyLanguage(detected);
  assert.strictEqual(env.mockDoc.documentElement.lang, 'zh-CN', 'Document lang must be zh-CN');
  assert(env.mockDoc.title.includes('零死链'), `Title must be in Chinese: ${env.mockDoc.title}`);

  // Check translated elements
  const heroTitle = env.elements.find(e => e.key === 'hero.title');
  assert(heroTitle.innerHTML.includes('让沉睡的书签重获新生'), 'Hero title must be translated to Chinese');

  const washAmount = env.elements.find(e => e.key === 'price.washAmount');
  assert.strictEqual(washAmount.textContent, '35', 'Wash amount must be 35 (RMB, Option A)');

  const ltdAmount = env.elements.find(e => e.key === 'price.ltdAmount');
  assert.strictEqual(ltdAmount.textContent, '99', 'Lifetime amount must be 99 (RMB, Option A)');

  const washBtn = env.elements.find(e => e.key === 'price.washBtn');
  assert(washBtn.textContent.includes('30 天体验卡') && washBtn.textContent.includes('¥35'), 'Wash button text in Chinese with Option A price');

  const placeholder = env.elements.find(e => e.key === 'lookup.orderPlaceholder');
  assert(placeholder.placeholder.includes('订单号'), 'Order ID placeholder in Chinese');

  assert(env.chipElements[0].classList.contains('active'), 'Chinese chip must have active class');
  assert(!env.chipElements[1].classList.contains('active'), 'English chip must NOT have active class');

  console.log('  ✓ Browser zh-CN correctly rendered full Chinese site (Option A prices ¥35 / ¥99, active chips updated)');
}

// Sub-test 2: Query param ?lang=en override
console.log('\n[Sub-test 2] URL param ?lang=en override');
{
  const env = createMockEnvironment({ search: '?lang=en', lang: 'zh-CN' });
  global.window = env.mockWindow;
  global.document = env.mockDoc;
  global.localStorage = env.mockWindow.localStorage;
  global.navigator = env.mockWindow.navigator;

  const detected = detectPreferredLanguage();
  assert.strictEqual(detected, 'en', 'Detected language must be en when ?lang=en is present');

  applyLanguage(detected);
  assert.strictEqual(env.mockDoc.documentElement.lang, 'en', 'Document lang must be en');

  const heroTitle = env.elements.find(e => e.key === 'hero.title');
  assert(heroTitle.innerHTML.includes('Resurrect Your Bookmarks'), 'Hero title must be in English');

  const washAmount = env.elements.find(e => e.key === 'price.washAmount');
  assert.strictEqual(washAmount.textContent, '4.90', 'Wash amount must be 4.90 (USD, Option A)');

  const ltdAmount = env.elements.find(e => e.key === 'price.ltdAmount');
  assert.strictEqual(ltdAmount.textContent, '14.90', 'Lifetime amount must be 14.90 (USD, Option A)');

  assert(!env.chipElements[0].classList.contains('active'), 'Chinese chip must NOT be active');
  assert(env.chipElements[1].classList.contains('active'), 'English chip must be active');

  console.log('  ✓ ?lang=en correctly forced English site (Option A: $4.90 / $14.90)');
}

// Sub-test 3: Smooth Toggle & Persistence
console.log('\n[Sub-test 3] Seamless Client-side Toggle & Persistence');
{
  const env = createMockEnvironment({ search: '', lang: 'en-US' });
  global.window = env.mockWindow;
  global.document = env.mockDoc;
  global.localStorage = env.mockWindow.localStorage;
  global.navigator = env.mockWindow.navigator;

  applyLanguage('en');
  assert.strictEqual(env.mockDoc.documentElement.lang, 'en');

  // Switch to zh
  applyLanguage('zh');
  assert.strictEqual(env.mockDoc.documentElement.lang, 'zh-CN');
  assert.strictEqual(env.store['bhm_lang'], 'zh', 'Must persist zh to localStorage');

  const heroTitleZh = env.elements.find(e => e.key === 'hero.title');
  assert(heroTitleZh.innerHTML.includes('让沉睡的书签重获新生'));

  // Switch back to en
  applyLanguage('en');
  assert.strictEqual(env.mockDoc.documentElement.lang, 'en');
  assert.strictEqual(env.store['bhm_lang'], 'en', 'Must persist en to localStorage');

  const heroTitleEn = env.elements.find(e => e.key === 'hero.title');
  assert(heroTitleEn.innerHTML.includes('Resurrect Your Bookmarks'));

  console.log('  ✓ Client-side toggle smoothly switches zh <-> en without page reload and persists to localStorage');
}

// Sub-test 4: Dictionary completeness & coverage
console.log('\n[Sub-test 4] Dictionary Completeness & Section Parity');
{
  const zhKeys = Object.keys(BHM_I18N_DICT.zh);
  const enKeys = Object.keys(BHM_I18N_DICT.en);

  assert.strictEqual(zhKeys.length, enKeys.length, 'Key count in zh and en must match exactly');
  for (const k of zhKeys) {
    assert(BHM_I18N_DICT.en[k] !== undefined, `Key ${k} must exist in en`);
    assert(BHM_I18N_DICT.zh[k].length > 0, `Key ${k} in zh must not be empty`);
    assert(BHM_I18N_DICT.en[k].length > 0, `Key ${k} in en must not be empty`);
  }

  // Check 8 mandatory sections
  assert(BHM_I18N_DICT.zh['nav.features'] === '功能特性');
  assert(BHM_I18N_DICT.zh['hero.pill'].includes('Google Chrome'));
  assert(BHM_I18N_DICT.zh['comp.badBadge'].includes('淘汰型'));
  assert(BHM_I18N_DICT.zh['feat.tab1Title'].includes('DNS-over-HTTPS'));
  assert(BHM_I18N_DICT.zh['feat.tab2Title'].includes('16 大全球与中国科技巨头'));
  assert(BHM_I18N_DICT.zh['feat.tab3Title'].includes('UGC 协同文档'));
  assert(BHM_I18N_DICT.zh['feat.tab4Title'].includes('同级锚点事务日志'));
  assert(BHM_I18N_DICT.zh['arch.card1Title'].includes('Ed25519 纯本地离线密码学验真'));
  assert(BHM_I18N_DICT.zh['price.washAmount'] === '35');
  assert(BHM_I18N_DICT.zh['price.ltdAmount'] === '99');
  assert(BHM_I18N_DICT.zh['faq.q1'].includes('上传到服务器'));
  assert(BHM_I18N_DICT.zh['footer.brandDesc'].includes('守护隐私'));

  console.log(`  ✓ All ${zhKeys.length} dictionary keys verified with authentic Chinese translations across all 8 core sections`);
}

console.log('\n================================================================');
console.log('🎉 ALL LANDING PAGE i18n E2E TESTS PASSED (100%)!');
console.log('================================================================');
