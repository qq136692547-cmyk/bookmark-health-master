# Security Policy & Cryptographic Architecture

## 1. Security Philosophy: 100% Local-First & Zero Telemetry

Bookmark Health Master (BHM-PRO) is designed around a non-negotiable principle: **Your browser data belongs strictly to you.**

- **Zero Cloud Telemetry**: BHM-PRO contains zero analytics SDKs (no Google Analytics, no Mixpanel, no Sentry, no PostHog). We do not collect, track, log, or transmit your browsing history, bookmark URLs, titles, folder structures, or usage habits.
- **Pure Local Sandboxing**: All bookmark operations execute entirely within your browser's local sandbox using Chrome Extension Manifest V3 APIs (`chrome.bookmarks`, `chrome.storage.local`).
- **No Third-Party Relays**: Link probing requests are made directly from your browser runtime, never through an intermediary third-party backend proxy.

---

## 2. Core Security & Privacy Architectures

### 2.1 RFC 1918 & Intranet SSRF Shielding
To protect users against Local Network Probing, Intranet SSRF, and CSRF side-effects:
- **Private Subnet Protection**: The engine detects and blocks automated scanning of private address spaces:
  - IPv4: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8` (Loopback), `169.254.0.0/16` (Link-local)
  - IPv6: `::1`, `fc00::/7` (Unique Local), `fe80::/10` (Link-local)
  - Hostnames: `localhost`, `*.local`, `*.internal`, `*.lan`
- **Dangerous Scheme Shielding**: Links bearing `javascript:`, `data:`, `chrome:`, `chrome-extension:`, `edge:`, `about:`, and `file:` protocols are automatically marked internal/skipped without triggering network queries.

### 2.2 DeclarativeNetRequest Session Isolation
During health probing of bookmarks:
- The extension installs dynamic, short-lived DeclarativeNetRequest rules that strip the `Referer` and `Origin` request headers for background probe fetch calls.
- This prevents external target servers from discovering where a link was bookmarked or linking background checks to user identity.
- DNR session rules are automatically and idempotently uninstalled upon probe completion or abort.

### 2.3 Ed25519 Asymmetric Offline License Verification
BHM-PRO commercial tier validation does **NOT** require any online activation server, phone-home daemon, or remote ping:
- **Cryptographic Scheme**: Digital signatures are minted using Edwards-curve Digital Signature Algorithm (Ed25519 / RFC 8032).
- **Offline Client Verification**: The extension verifies license authenticity client-side using `crypto.subtle.verify()` with an embedded Ed25519 public key.
- **Privacy Assurance**: The verification process is 100% offline. Once entered, the license token is validated locally against cryptographic mathematics. Your machine never sends periodic heartbeat requests to verify authorization.

---

## 3. Reporting a Security Vulnerability

We welcome security audits, code reviews, and responsible disclosures from independent security researchers and the open-source community.

### Disclosure Process
1. **Do not create public GitHub issues for undisclosed security vulnerabilities.**
2. Send an email with technical details, proof-of-concept (PoC), and affected versions to:
   - **Email**: `qq136692547@gmail.com`
   - **Subject Line**: `[SECURITY VULNERABILITY] BHM-PRO: <Summary>`
3. Alternatively, report via **GitHub Private Vulnerability Reporting** directly on the repository.

### Response Commitment
- **Initial Acknowledgment**: Within 24-48 hours.
- **Triage & Reproduction**: Within 72 hours.
- **Patch & Release**: High-severity vulnerabilities will receive prioritized hotfixes within 7 days, followed by Chrome Web Store review submission and GitHub release notes.
- **Credit**: Researchers who responsibly disclose confirmed vulnerabilities will be credited in our Release Notes (unless anonymity is requested).
