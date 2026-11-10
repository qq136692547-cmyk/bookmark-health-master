# Privacy Policy for Bookmark Health Master (BHM-PRO)

**Last Updated:** November 7, 2026  
**Effective Date:** November 7, 2026  

Bookmark Health Master (BHM-PRO, "we", "our", or "the extension") is a privacy-first, local-first browser extension designed to audit dead bookmark links, reorganize official tech giant ecosystems, and provide zero-loss bookmark backups within Google Chrome.

We are deeply committed to protecting your privacy. This Privacy Policy details our data collection, usage, and security practices.

---

## 1. 100% Local-First Philosophy (Zero Remote Data Storage)

* **No Remote Telemetry or Tracking**: The extension operates entirely within your local browser sandbox. We do not operate any external tracking servers, analytics endpoints, or user databases.
* **No Bookmarks or Personal Data Transmission**: Your bookmark tree, folder structures, tags, browsing history, and personal bookmark content are **never** transmitted to our servers or any private third-party database. All clustering, sorting, Netscape HTML serialization, and health calculations are executed strictly on your local device.
* **Third-Party DNS-over-HTTPS (DoH) Hostname Resolution**: The only external network communication made by the extension outside of direct user-initiated website reachability checks is querying Cloudflare's public DNS-over-HTTPS service (`https://cloudflare-dns.com/dns-query`) solely to resolve domain hostnames and cross-validate NXDOMAIN (non-existent domain) status during dead link health checks. Only the isolated domain hostname (e.g., `example.com`) is queried; full URL paths, search parameters, hashes, cookies, and user identifiers are never included or transmitted. Cloudflare handles DNS queries in accordance with their public DNS privacy policy.

---

## 2. Permissions Justification & Usage

In accordance with Google Chrome Web Store's **Least Privilege Principle** and **Single-Purpose Policy**, BHM-PRO requests only the minimal permissions required to deliver its core functionality:

| Permission | Purpose & Technical Scope |
| :--- | :--- |
| `bookmarks` | Required to read your bookmark hierarchy, organize links into categorized folders, and move broken links into a quarantined trash folder upon explicit user request. |
| `storage` & `unlimitedStorage` | Required to save local operation journals (Move Journals) and Netscape HTML backup snapshots within Chrome's local storage (`chrome.storage.local`) for atomic undo and disaster recovery. |
| `sidePanel` | Required to open the native Chrome Side Panel companion for fast bookmark search and access. |
| `alarms` | Required to manage Service Worker keepalive cycles during active user-initiated scans to prevent Chromium idle timeout. |
| `declarativeNetRequest` | Used strictly during active user-initiated health scans via temporary session rules (`updateSessionRules`) to remove the `Origin` request header exclusively on probe requests dispatched to bookmarked domains by the extension itself (from the dashboard page or background Service Worker) to test target domain reachability. This prevents cross-origin headers from triggering server anti-bot blocks without monitoring, collecting, or altering general web browsing traffic in normal tabs. All session rules are uninstalled immediately upon scan completion or abort. |
| `optional_host_permissions` (`*://*/*`) | **Never requested at installation.** Dynamically and optionally requested **only** when the user explicitly clicks the "Start Health Scan" button, enabling the browser to send low-overhead `HEAD` / slice-`GET` network requests directly from the user's browser to check whether bookmarked pages return HTTP 404 or connection failures. |

---

## 3. Network Probing, DoH Resolution & Traffic Safety

When you initiate a Bookmark Health Scan:
1. **Credentials Omitted**: All diagnostic network requests explicitly enforce `credentials: 'omit'`. The extension **never** sends your cookies, authentication tokens, session IDs, or login state.
2. **Intranet & Action Parameter Shielding**: URLs containing sensitive action parameters (such as `logout`, `unsubscribe`, `reset_password`, `token=`) and RFC1918/RFC3927/RFC6598 private and reserved IP addresses (`127.0.0.1`, `10.*`, `172.16-31.*`, `192.168.*`, `169.254.*`, `100.64-127.*`, `198.18-19.*`, IPv6 private/link-local) are automatically shielded and bypassed to protect internal infrastructure, cloud metadata endpoints, and active user sessions.
3. **Third-Party DNS Hostname Resolution (Cloudflare DoH)**: During dead link health checks, when target domain reachability requires secondary verification or encounters network anomalies, the extension queries Cloudflare's public DNS-over-HTTPS service (`https://cloudflare-dns.com/dns-query`) solely to determine whether the domain's DNS record exists (NXDOMAIN check). Only the isolated domain hostname is sent in the DNS query. No URL paths, search queries, bookmark titles, headers, cookies, or user identifiers are ever transmitted.
4. **No Browsing Traffic Monitoring or Interception**: The extension never monitors, collects, or alters general web browsing traffic in standard user tabs. Strictly during user-initiated bookmark health checkups, temporary session rules (`updateSessionRules`) remove the `Origin` request header exclusively on diagnostic probe requests dispatched to bookmarked domains by the extension itself (from the dashboard page or background Service Worker) to test target domain reachability. User browsing activity across tabs is never intercepted, tracked, or modified, and rules are uninstalled immediately once inspection completes or halts.

---

## 4. Payment Processing

Commercial licensing is processed securely through **Paddle (Paddle.com Market Ltd)** as the Merchant of Record (MoR). 
* When purchasing a license, payment details (credit card, PayPal, Apple Pay) are processed directly by Paddle under PCI-DSS Level 1 compliance.
* BHM-PRO does not store or process your financial information. The extension only stores your activation license key locally in `chrome.storage.local` to unlock premium capabilities.

---

## 5. Contact & Questions

If you have any questions or feedback regarding this Privacy Policy, please contact our support team at:
* **Support Email**: `support@bookmarkhealthmaster.com` (or submit an issue via our official repository)
