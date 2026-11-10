/**
 * Simple Atomic JSON File Storage for Webhook Orders & License Keys
 * Zero-dependency, crash-safe atomic write using tmp file rename.
 */

const fs = require("node:fs");
const path = require("node:path");

class OrderStorage {
  constructor(filePath = null) {
    this.filePath = filePath || path.resolve(__dirname, "./data/orders.json");
    this.dataDir = path.dirname(this.filePath);
    this._ensureDir();
    this.data = this._load();
    this.data.orders = this.data.orders || {};
    this.data.keys = this.data.keys || {};
    this.data.orderNumbers = this.data.orderNumbers || {};
  }

  _ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  _load() {
    if (!fs.existsSync(this.filePath)) {
      return { orders: {}, keys: {}, orderNumbers: {} };
    }
    try {
      const content = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(content);
      return {
        orders: parsed.orders || {},
        keys: parsed.keys || {},
        orderNumbers: parsed.orderNumbers || {}
      };
    } catch {
      return { orders: {}, keys: {}, orderNumbers: {} };
    }
  }

  _save() {
    this._ensureDir();
    const tmpPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), "utf8");
    try {
      fs.renameSync(tmpPath, this.filePath);
    } catch (e) {
      // Windows file locking fallback
      try {
        fs.copyFileSync(tmpPath, this.filePath);
        fs.unlinkSync(tmpPath);
      } catch (inner) {
        console.error("Storage save fallback error:", inner);
      }
    }
  }

  /**
   * Retrieves order by primary order ID or store order number (with optional # prefix)
   */
  getOrder(orderId) {
    if (!orderId) return null;
    const cleanId = String(orderId).trim().replace(/^#/, "");
    // Check primary order ID
    if (this.data.orders[cleanId]) {
      return this.data.orders[cleanId];
    }
    // Check aliased order number
    if (this.data.orderNumbers && this.data.orderNumbers[cleanId]) {
      const primaryId = this.data.orderNumbers[cleanId];
      return this.data.orders[primaryId] || null;
    }
    return null;
  }

  saveOrder(orderRecord) {
    const id = String(orderRecord.orderId);
    this.data.orders[id] = orderRecord;
    if (orderRecord.orderNumber) {
      const cleanNum = String(orderRecord.orderNumber).trim().replace(/^#/, "");
      this.data.orderNumbers[cleanNum] = id;
    }
    if (orderRecord.licenseKey) {
      this.data.keys[orderRecord.licenseKey] = {
        orderId: id,
        status: orderRecord.status || "active",
        tier: orderRecord.tier
      };
    }
    this._save();
    return orderRecord;
  }

  revokeOrder(orderId) {
    const cleanId = String(orderId || "").trim().replace(/^#/, "");
    let order = this.data.orders[cleanId];
    if (!order && this.data.orderNumbers && this.data.orderNumbers[cleanId]) {
      order = this.data.orders[this.data.orderNumbers[cleanId]];
    }
    if (order) {
      order.status = "revoked";
      order.refundedAt = new Date().toISOString();
      if (order.licenseKey && this.data.keys[order.licenseKey]) {
        this.data.keys[order.licenseKey].status = "revoked";
      }
      this._save();
      return order;
    }
    return null;
  }

  getKey(licenseKey) {
    return this.data.keys[licenseKey] || null;
  }
}

module.exports = { OrderStorage };
