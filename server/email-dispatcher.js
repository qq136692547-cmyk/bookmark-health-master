/**
 * Transactional Email Dispatcher for BHM-PRO Webhook Server
 * Supports Resend API (HTTP) with zero third-party npm dependencies.
 */

const { generateLicenseEmail } = require("../shared/email-template.js");

class EmailDispatcher {
  /**
   * @param {object} options
   * @param {string} [options.resendApiKey]
   * @param {string} [options.fromEmail="BHM-PRO Licensing <licenses@bhm-pro.com>"]
   * @param {boolean} [options.isDryRun=false]
   */
  constructor({
    resendApiKey = process.env.RESEND_API_KEY || null,
    fromEmail = process.env.FROM_EMAIL || "BHM-PRO Licensing <licenses@bhm-pro.com>",
    isDryRun = false
  } = {}) {
    this.resendApiKey = resendApiKey;
    this.fromEmail = fromEmail;
    this.isDryRun = isDryRun;
  }

  /**
   * Dispatches the license email
   * @param {object} params
   * @param {string} params.tier
   * @param {string} params.licenseKey
   * @param {string} params.userEmail
   * @param {string} params.orderId
   * @returns {Promise<{ sent: boolean, id?: string, reason?: string, error?: string }>}
   */
  async dispatchLicenseEmail({ tier, licenseKey, userEmail, orderId }) {
    const { subject, html, text } = generateLicenseEmail({
      tier,
      licenseKey,
      userEmail,
      orderId
    });

    if (this.isDryRun || !this.resendApiKey) {
      console.log(`\n[EMAIL DISPATCHER (DEV/MOCK)] To: ${userEmail} | Subject: ${subject}`);
      console.log(`[EMAIL DISPATCHER] Key: ${licenseKey.slice(0, 30)}...`);
      return { sent: true, mode: "dry-run", subject };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [userEmail],
          subject,
          html,
          text
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[EMAIL ERROR] Resend returned ${response.status}:`, errorBody);
        return { sent: false, error: errorBody };
      }

      const resData = await response.json();
      console.log(`[EMAIL SUCCESS] Sent to ${userEmail} (ID: ${resData.id})`);
      return { sent: true, id: resData.id };
    } catch (err) {
      console.error("[EMAIL ERROR] Network error calling Resend API:", err);
      return { sent: false, error: err.message };
    }
  }
}

module.exports = { EmailDispatcher };
