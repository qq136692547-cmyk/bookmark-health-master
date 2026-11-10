# Contributing to Bookmark Health Master (BHM-PRO)

Thank you for your interest in contributing to Bookmark Health Master! We are building a high-performance, local-first bookmark management engine for Google Chrome, and we welcome contributions from developers worldwide.

---

## 1. Code of Conduct & Core Principles

Before contributing, please keep our core tenets in mind:
1. **Local-First & Zero Telemetry**: We never add third-party tracking scripts, analytic pings, or cloud data collectors.
2. **Safety & Zero Data Loss**: Any feature modifying bookmarks must integrate with `SafetyManager` and record operations in the `MoveJournal` to ensure 100% position fidelity on undo.
3. **Deterministic Testing**: Every feature, bug fix, or clustering rule must include tests in the `tests/` suite.

---

## 2. Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher (pure native, zero external dependencies required for running core test suite).
- [Google Chrome](https://www.google.com/chrome/) v114+ (or any Chromium browser supporting Manifest V3 and SidePanel API).

### Clone & Load in Chrome
```bash
git clone https://github.com/qq136692547-cmyk/bookmark-health-master.git
cd bookmark-health-master
```

1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle the **Developer mode** switch in the top right corner.
3. Click **Load unpacked** and select the `bookmark-organizer/` directory.
4. Pin the **Bookmark Health Master** extension to your toolbar.

---

## 3. Repository Structure

```
├── bookmark-organizer/        # Chrome Extension MV3 source code
│   ├── manifest.json          # Manifest V3 configuration
│   ├── background.js          # MV3 Service Worker (message bus, alarms, DNR)
│   ├── dashboard.html / .js   # Full-page diagnostic workspace
│   ├── sidepanel.html / .js   # Native Chrome SidePanel interface
│   ├── popup.html / .js       # Quick status popup
│   ├── _locales/              # i18n locales (en, zh_CN)
│   └── core/                  # Core engine modules
│       ├── prober.js          # Dual-stage dead link prober & DoH engine
│       ├── classifier.js      # 16 Tech Titans & UGC Docs classifier
│       ├── ecosystem_rules.js # Domain mapping rules for 16 tech ecosystems
│       ├── safety.js          # Sibling-Anchor Move Journal & Netscape HTML backups
│       ├── license.js         # Ed25519 offline WebCrypto verification
│       └── i18n.js            # Bilingual localization engine (en / zh_CN)
├── landing-page/              # Cloudflare Pages official website & checkout
├── serverless-gateway/        # Cloudflare Worker for Paddle webhook & issuance
├── tests/                     # 15-suite automated E2E regression & compliance runner
└── scripts/                   # Packaging and build automation scripts
```

---

## 4. Running Tests

BHM-PRO utilizes a custom, lightning-fast Node.js test runner with zero npm dependencies.

To execute the entire 15-tier regression and compliance suite:
```bash
node tests/run_all_tests.js
```

### Individual Test Suites
You can also run specific test suites directly:
```bash
node tests/test_prober.js                  # Prober, RFC1918 SSRF shielding & Cloudflare DoH
node tests/test_classifier.js              # 16 Tech Titans & UGC Docs isolation engine
node tests/test_safety.js                  # SafetyManager & Move Journal rollback
node tests/test_mv3_compliance.js          # MV3 lifecycle, DNR session rules & permissions
node tests/test_cross_features.js          # Cross-feature combinations & flow control
node tests/e2e_full_workload.js            # 1,500+ bookmark stress corpus
node tests/test_lemon_squeezy_webhook_e2e.js # Webhook & Ed25519 issuance validation
node tests/verify_open_source_release.js   # Open-source compliance & repository audit
```

All pull requests must pass `node tests/run_all_tests.js` with 100% success rate before being merged.

---

## 5. Coding Standards & Conventions

- **Vanilla Modern JavaScript**: The extension runtime avoids heavy frontend frameworks (React/Vue) in favor of lightweight, ultra-responsive native Web APIs and CSS variables. Keep bundle sizes minimal.
- **Manifest V3 Best Practices**:
  - Service Workers are ephemeral; do not store persistent state in memory variables across async ticks. Use `chrome.storage.local`.
  - Use `declarativeNetRequest` for network interception instead of blocking `webRequest`.
- **Ecosystem Classifier Rules**:
  - When contributing new ecosystem definitions to `core/ecosystem_rules.js` and `core/classifier.js`, provide authentic domain patterns and ensure UGC document platforms (Notion, Google Docs, Lark/Feishu) are preserved in the UGC container.

---

## 6. Pull Request Process

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/amazing-improvement
   ```
2. Commit your changes with descriptive commit messages following Conventional Commits:
   - `feat: add Kubernetes domain ecosystem clustering`
   - `fix: handle 308 redirect loop in DoH fallback`
   - `docs: improve developer onboarding instructions`
3. Run the full test suite and ensure all tests pass:
   ```bash
   node tests/run_all_tests.js
   ```
4. Push your branch to GitHub and open a Pull Request.
5. Maintainers will review your PR, run CI checks, and provide feedback.
