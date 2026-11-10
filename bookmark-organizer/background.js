// ============================================================================
// Chrome Extensions Manifest V3 后台服务线程 (Background Service Worker)
// 包含: declarativeNetRequest 请求头防泄漏规则 (消除 Origin 特征头)、
//       Service Worker 状态保活心跳 (chrome.alarms)、长耗时游标状态落盘、
//       统一消息调度与动态权限中继路由
// ============================================================================

const PROBE_RULE_ID = 1001;
const ALARM_NAME_HEARTBEAT = "bhm_sw_heartbeat";
const ALARM_NAME_SENTINEL = "bhm_domain_sentinel";

/**
 * 确保定时闹钟注册（支持安装、更新与浏览器启动激活生命周期）
 */
function ensureAlarmsRegistered() {
  if (typeof chrome !== "undefined" && chrome.alarms && chrome.alarms.create) {
    chrome.alarms.create(ALARM_NAME_HEARTBEAT, {
      periodInMinutes: 1 // 每 1 分钟心跳保活
    });

    chrome.alarms.create(ALARM_NAME_SENTINEL, {
      periodInMinutes: 60 * 24 // 每天执行一次静默安全巡检 (1440 min)
    });
  }
}

/**
 * 初始化与安装生命周期
 */
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onInstalled && chrome.runtime.onInstalled.addListener) {
  chrome.runtime.onInstalled.addListener(async (details) => {
    console.log(`[BHM-PRO SW] Extension installed/updated: reason=${details.reason}`);

    // 1. 清理旧版本遗留的常驻 dynamic DNR 规则，杜绝全局篡改浏览器流量
    await clearLegacyDynamicRules();

    // 2. 注册定时闹钟，防止长时间探测时 Service Worker 假死降频
    ensureAlarmsRegistered();

    // 3. 初始化本地持久化状态
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["bhm_sw_state"], (res) => {
        if (!res.bhm_sw_state) {
          chrome.storage.local.set({
            bhm_sw_state: {
              installedAt: Date.now(),
              lastHeartbeat: Date.now(),
              scanCursor: null,
              activeTask: null
            }
          });
        }
      });
    }
  });
}

/**
 * Service Worker 启动激活
 */
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onStartup && chrome.runtime.onStartup.addListener) {
  chrome.runtime.onStartup.addListener(async () => {
    console.log("[BHM-PRO SW] Service Worker started");
    // 启动时确保旧版常驻 dynamic DNR 规则已被移除
    await clearLegacyDynamicRules();
    // 启动时确保定时闹钟重新注册（防浏览器重启后闹钟丢失）
    ensureAlarmsRegistered();
  });
}

/**
 * 定时闹钟处理函数
 */
async function handleAlarmEvent(alarm) {
  if (!alarm) return;
  if (alarm.name === ALARM_NAME_HEARTBEAT) {
    // 刷新心跳时间戳，维持 Service Worker 状态就绪
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await new Promise((resolve) => {
        chrome.storage.local.get(["bhm_sw_state"], (res) => {
          const state = (res && typeof res.bhm_sw_state === "object" && res.bhm_sw_state !== null)
            ? res.bhm_sw_state
            : {};
          state.lastHeartbeat = Date.now();
          chrome.storage.local.set({ bhm_sw_state: state }, resolve);
        });
      });
    }
  } else if (alarm.name === ALARM_NAME_SENTINEL) {
    // 每日安全卫生巡检：若当前无进行中的扫描游标，确保会话级临时 DNR 探测规则已被彻底清理
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await new Promise((resolve) => {
        chrome.storage.local.get(["bhm_sw_state"], async (res) => {
          const state = (res && typeof res.bhm_sw_state === "object" && res.bhm_sw_state !== null)
            ? res.bhm_sw_state
            : {};
          if (!state.scanCursor) {
            await uninstallProbeSessionRule();
          }
          state.lastSentinelCheck = Date.now();
          chrome.storage.local.set({ bhm_sw_state: state }, resolve);
        });
      });
    }
  }
}

if (typeof chrome !== "undefined" && chrome.alarms && chrome.alarms.onAlarm && chrome.alarms.onAlarm.addListener) {
  chrome.alarms.onAlarm.addListener(handleAlarmEvent);
}

/**
 * 清除旧版本常驻安装的动态 DNR 规则（防全网请求污染）
 */
async function clearLegacyDynamicRules() {
  if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.updateDynamicRules) {
    return;
  }
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [PROBE_RULE_ID]
    });
  } catch (err) {
    // 忽略未安装时的清除异常
  }
}

/**
 * declarativeNetRequest: Session 级规则安装（P0-3 修复）
 * 严格收窄作用域与生命周期：
 * 1. 采用 updateSessionRules，随浏览器会话/进程退出自动失效
 * 2. 动作仅移除 Origin 头，严禁修改 Sec-Fetch-Site 与 Sec-Fetch-Mode
 * 3. 严格限定 tabIds: [-1]（或指定扫描标签页）及 resourceTypes: ["xmlhttprequest"]
 * 4. 严格绑定本次待探测目标域名 requestDomains，严禁通配全局 urlFilter: "*"
 *
 * @param {string[]} [domains] 待探测目标域名/主机名列表
 * @param {number} [tabId] 扫描发起标签页 ID，默认为 -1 (Service Worker 后台无标签页请求)
 */
async function installProbeSessionRule(domains = [], tabId = -1) {
  if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.updateSessionRules) {
    return;
  }

  // 规整并去重待测域名列表
  let cleanDomains = [];
  if (Array.isArray(domains)) {
    cleanDomains = [...new Set(domains.map(d => {
      if (!d) return "";
      try {
        if (d.includes("://")) {
          return new URL(d).hostname.toLowerCase();
        }
        return String(d).trim().toLowerCase();
      } catch (e) {
        return String(d).trim().toLowerCase();
      }
    }).filter(Boolean))];
  }

  // 若清洗去重后域名列表为空，严禁安装缺少 requestDomains 的宽泛规则，卸载旧规则并提前返回
  if (cleanDomains.length === 0) {
    await uninstallProbeSessionRule();
    return;
  }

  const condition = {
    resourceTypes: ["xmlhttprequest"],
    requestDomains: cleanDomains
  };

  if (typeof tabId === "number" && tabId >= 0) {
    // 仅限发起本次扫描的插件 Dashboard 标签页及后台 Service Worker (-1)，绝不影响任何普通网页标签页
    condition.tabIds = [tabId, -1];
  } else {
    condition.tabIds = [-1];
  }

  const rule = {
    id: PROBE_RULE_ID,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "Origin", operation: "remove" }
      ]
    },
    condition
  };

  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [PROBE_RULE_ID],
      addRules: [rule]
    });
    console.log(`[BHM-PRO SW] DeclarativeNetRequest session rule installed: ruleId=${PROBE_RULE_ID}, domains=${cleanDomains.length}`);
  } catch (err) {
    console.warn("[BHM-PRO SW] Failed to install session DNR rules:", err);
    throw err;
  }
}

/**
 * 卸载 Session 级 DNR 规则（扫描完成或中断时立即调用）
 */
async function uninstallProbeSessionRule() {
  if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.updateSessionRules) {
    return;
  }

  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [PROBE_RULE_ID]
    });
    console.log(`[BHM-PRO SW] DeclarativeNetRequest session rule uninstalled: ruleId=${PROBE_RULE_ID}`);
  } catch (err) {
    console.warn("[BHM-PRO SW] Failed to uninstall session DNR rules:", err);
  }
}

// 契约别名
const installProbeRule = installProbeSessionRule;
const uninstallProbeRule = uninstallProbeSessionRule;

/**
 * 跨上下文通信调度处理函数 (Dashboard / Popup / Side Panel)
 */
function handleRuntimeMessage(message, sender, sendResponse) {
  const { type, payload } = message || {};

  switch (type) {
    case "BHM_PING":
      sendResponse({ status: "PONG", timestamp: Date.now() });
      return false;

    case "BHM_GET_SW_STATUS":
      chrome.storage.local.get(["bhm_sw_state", "bhm_pro_tier", "bhm_license_tier"], (res) => {
        const rawState = res ? res.bhm_sw_state : null;
        const safeState = (rawState && typeof rawState === "object") ? rawState : null;
        sendResponse({
          active: true,
          state: safeState,
          proTier: (res && (res.bhm_license_tier || res.bhm_pro_tier)) || "FREE"
        });
      });
      return true; // 异步响应

    case "BHM_SAVE_SCAN_CHECKPOINT":
      // 记录长耗时扫描游标，支持中断恢复
      chrome.storage.local.get(["bhm_sw_state"], (res) => {
        const state = (res && typeof res.bhm_sw_state === "object" && res.bhm_sw_state !== null)
          ? res.bhm_sw_state
          : {};
        state.scanCursor = payload;
        chrome.storage.local.set({ bhm_sw_state: state }, () => {
          sendResponse({ success: true, scanCursor: payload });
        });
      });
      return true;

    case "BHM_CLEAR_SCAN_CHECKPOINT":
      chrome.storage.local.get(["bhm_sw_state"], (res) => {
        const state = (res && typeof res.bhm_sw_state === "object" && res.bhm_sw_state !== null)
          ? res.bhm_sw_state
          : {};
        state.scanCursor = null;
        chrome.storage.local.set({ bhm_sw_state: state }, () => {
          sendResponse({ success: true });
        });
      });
      return true;

    case "BHM_INSTALL_PROBE_RULES":
    case "BHM_INSTALL_PROBE_RULE":
    case "INSTALL_PROBE_RULES":
      installProbeSessionRule(payload?.domains || [], payload?.tabId ?? (sender?.tab?.id ?? -1))
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "BHM_UNINSTALL_PROBE_RULES":
    case "BHM_UNINSTALL_PROBE_RULE":
    case "UNINSTALL_PROBE_RULES":
      uninstallProbeSessionRule()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "BHM_CHECK_ORIGIN_RULE":
      // 检查 sessionRules 状态 (优先检查 sessionRules)
      if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.getSessionRules) {
        chrome.declarativeNetRequest.getSessionRules((rules) => {
          const installed = Array.isArray(rules) && rules.some(r => r.id === PROBE_RULE_ID);
          sendResponse({ ruleActive: installed, rules });
        });
        return true;
      }
      sendResponse({ ruleActive: false, rules: [] });
      return false;

    default:
      return false;
  }
}

/**
 * 绑定当前全局 chrome 环境监听（支持真实扩展运行与单元测试注入绑定）
 */
function bindServiceWorkerListeners() {
  if (typeof chrome === "undefined") return;
  if (chrome.alarms && chrome.alarms.onAlarm && chrome.alarms.onAlarm.addListener) {
    chrome.alarms.onAlarm.addListener(handleAlarmEvent);
  }
  if (chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener) {
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  }
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener) {
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PROBE_RULE_ID,
    ALARM_NAME_HEARTBEAT,
    ALARM_NAME_SENTINEL,
    installProbeSessionRule,
    uninstallProbeSessionRule,
    installProbeRule,
    uninstallProbeRule,
    clearLegacyDynamicRules,
    ensureAlarmsRegistered,
    handleAlarmEvent,
    handleRuntimeMessage,
    bindServiceWorkerListeners
  };
}
