// ============================================================================
// Chrome MV3 In-Memory Deterministic Mock Environment
// Simulates bookmarks, storage.local, permissions, alarms, declarativeNetRequest
// ============================================================================

class MockChrome {
  constructor(initialTree = null) {
    this._reset(initialTree);
  }

  _reset(initialTree = null) {
    const self = this;
    this.storageMap = {};
    this.sessionStorageMap = {};
    this.grantedOrigins = new Set();
    this.grantedPermissions = new Set(["bookmarks", "storage", "unlimitedStorage", "sidePanel"]);
    this.dynamicRules = [];
    this._sessionRules = [];
    this._alarmsMap = new Map();
    this.alarmListeners = [];
    this.messageListeners = [];
    this.bookmarkListeners = {
      onCreated: [],
      onMoved: [],
      onRemoved: [],
      onChanged: []
    };
    this.lastError = null;
    this._idCounter = 0;

    // Default bookmark tree structure (Bar = '1', Other = '2')
    this.nodesById = new Map();
    this.tree = initialTree || [
      {
        id: "0",
        title: "Root",
        children: [
          {
            id: "1",
            parentId: "0",
            index: 0,
            title: "Bookmarks Bar",
            children: []
          },
          {
            id: "2",
            parentId: "0",
            index: 1,
            title: "Other Bookmarks",
            children: []
          }
        ]
      }
    ];

    this._indexTree(this.tree);

    // Initialized stable API objects
    this.bookmarks = {
      getTree: (cb) => {
        self.lastError = null;
        const copy = JSON.parse(JSON.stringify(self.tree));
        if (cb) cb(copy);
        return Promise.resolve(copy);
      },
      getSubTree: (id, cb) => {
        self.lastError = null;
        const node = self.nodesById.get(id);
        if (!node) {
          self.lastError = { message: `Bookmark id ${id} not found` };
          if (cb) cb([]);
          return Promise.resolve([]);
        }
        const copy = [JSON.parse(JSON.stringify(node))];
        if (cb) cb(copy);
        return Promise.resolve(copy);
      },
      getChildren: (id, cb) => {
        self.lastError = null;
        const key = String(id);
        const parentNode = self.nodesById.get(key) || self.nodesById.get(id);

        if (!parentNode || (parentNode.url && !parentNode.children)) {
          self.lastError = { message: `Bookmark id ${id} not found` };
          if (cb) {
            cb(undefined);
            return Promise.resolve(undefined);
          }
          return Promise.reject(new Error(self.lastError.message));
        }

        let directChildren = [];
        if (Array.isArray(parentNode.children)) {
          directChildren = parentNode.children.slice();
        } else {
          for (const node of self.nodesById.values()) {
            if (node.parentId === key || node.parentId === id) {
              directChildren.push(node);
            }
          }
        }

        const sorted = directChildren
          .map((c, idx) => {
            const copy = JSON.parse(JSON.stringify(c));
            if (copy.children) delete copy.children;
            if (typeof copy.index !== "number") {
              copy.index = idx;
            }
            return copy;
          })
          .sort((a, b) => a.index - b.index);

        if (cb) cb(sorted);
        return Promise.resolve(sorted);
      },
      get: (idOrList, cb) => {
        self.lastError = null;
        const ids = Array.isArray(idOrList) ? idOrList : [idOrList];
        const res = [];
        for (const id of ids) {
          const n = self.nodesById.get(id);
          if (n) {
            const shallow = { ...n };
            delete shallow.children;
            res.push(shallow);
          }
        }
        if (cb) cb(res);
        return Promise.resolve(res);
      },
      create: (bookmark, cb) => {
        self.lastError = null;
        const parentId = bookmark.parentId || "1";
        const parent = self.nodesById.get(parentId);
        if (!parent || !parent.children) {
          self.lastError = { message: `Parent folder ${parentId} not found` };
          if (cb) cb(null);
          return Promise.resolve(null);
        }

        let newId = bookmark.id;
        if (!newId) {
          do {
            self._idCounter = (self._idCounter || 0) + 1;
            newId = "bm_" + Date.now() + "_" + self._idCounter;
          } while (self.nodesById.has(newId));
        }
        const newNode = {
          id: newId,
          parentId,
          title: bookmark.title || "",
          url: bookmark.url || undefined,
          dateAdded: bookmark.dateAdded || Date.now(),
          children: bookmark.url ? undefined : (bookmark.children || [])
        };

        const targetIndex = (typeof bookmark.index === "number" && bookmark.index >= 0 && bookmark.index <= parent.children.length)
          ? bookmark.index
          : parent.children.length;

        parent.children.splice(targetIndex, 0, newNode);
        for (let i = 0; i < parent.children.length; i++) {
          parent.children[i].index = i;
        }

        self.nodesById.set(newId, newNode);
        if (newNode.children) {
          self._indexTree(newNode.children, newId);
        }

        self.bookmarkListeners.onCreated.forEach(fn => fn(newId, newNode));
        if (cb) cb(newNode);
        return Promise.resolve(newNode);
      },
      move: (id, destination, cb) => {
        self.lastError = null;
        const node = self.nodesById.get(id);
        if (!node) {
          self.lastError = { message: `Bookmark id ${id} not found` };
          if (cb) cb(null);
          return Promise.resolve(null);
        }

        const oldParentId = node.parentId;
        const oldIndex = node.index;
        const newParentId = destination.parentId || oldParentId;
        const newParent = self.nodesById.get(newParentId);
        if (!newParent || !newParent.children) {
          self.lastError = { message: `Destination folder ${newParentId} not found` };
          if (cb) cb(null);
          return Promise.resolve(null);
        }

        const oldParent = self.nodesById.get(oldParentId);
        if (oldParent && oldParent.children) {
          const idx = oldParent.children.findIndex(c => c.id === id);
          if (idx !== -1) {
            oldParent.children.splice(idx, 1);
            for (let i = 0; i < oldParent.children.length; i++) {
              oldParent.children[i].index = i;
            }
          }
        }

        let newIndex = (typeof destination.index === "number") ? destination.index : newParent.children.length;
        if (newIndex < 0) newIndex = 0;
        if (newIndex > newParent.children.length) newIndex = newParent.children.length;

        node.parentId = newParentId;
        newParent.children.splice(newIndex, 0, node);
        for (let i = 0; i < newParent.children.length; i++) {
          newParent.children[i].index = i;
        }

        const moveInfo = { parentId: newParentId, index: node.index, oldParentId, oldIndex };
        self.bookmarkListeners.onMoved.forEach(fn => fn(id, moveInfo));
        if (cb) cb(node);
        return Promise.resolve(node);
      },
      remove: (id, cb) => {
        self.lastError = null;
        const node = self.nodesById.get(id);
        if (!node) {
          self.lastError = { message: `Bookmark id ${id} not found` };
          if (cb) cb();
          return Promise.resolve();
        }
        const parent = self.nodesById.get(node.parentId);
        if (parent && parent.children) {
          const idx = parent.children.findIndex(c => c.id === id);
          if (idx !== -1) {
            parent.children.splice(idx, 1);
            for (let i = 0; i < parent.children.length; i++) {
              parent.children[i].index = i;
            }
          }
        }
        self.nodesById.delete(id);
        self.bookmarkListeners.onRemoved.forEach(fn => fn(id, { parentId: node.parentId, index: node.index }));
        if (cb) cb();
        return Promise.resolve();
      },
      search: (query, cb) => {
        self.lastError = null;
        const q = String(query).toLowerCase();
        const matches = [];
        for (const node of self.nodesById.values()) {
          if (node.url) {
            if ((node.title && node.title.toLowerCase().includes(q)) || node.url.toLowerCase().includes(q)) {
              matches.push({ ...node });
            }
          }
        }
        if (cb) cb(matches);
        return Promise.resolve(matches);
      },
      onCreated: {
        addListener: (fn) => self.bookmarkListeners.onCreated.push(fn),
        removeListener: (fn) => {
          self.bookmarkListeners.onCreated = self.bookmarkListeners.onCreated.filter(f => f !== fn);
        }
      },
      onMoved: {
        addListener: (fn) => self.bookmarkListeners.onMoved.push(fn),
        removeListener: (fn) => {
          self.bookmarkListeners.onMoved = self.bookmarkListeners.onMoved.filter(f => f !== fn);
        }
      },
      onRemoved: {
        addListener: (fn) => self.bookmarkListeners.onRemoved.push(fn),
        removeListener: (fn) => {
          self.bookmarkListeners.onRemoved = self.bookmarkListeners.onRemoved.filter(f => f !== fn);
        }
      }
    };

    this.storage = {
      local: {
        get: (keys, cb) => {
          self.lastError = null;
          const res = {};
          if (typeof keys === "string") {
            res[keys] = self.storageMap[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach(k => {
              if (self.storageMap[k] !== undefined) res[k] = self.storageMap[k];
            });
          } else if (keys && typeof keys === "object") {
            for (const [k, defaultVal] of Object.entries(keys)) {
              res[k] = self.storageMap[k] !== undefined ? self.storageMap[k] : defaultVal;
            }
          } else {
            Object.assign(res, self.storageMap);
          }
          const copy = JSON.parse(JSON.stringify(res));
          if (cb) cb(copy);
          return Promise.resolve(copy);
        },
        set: (items, cb) => {
          self.lastError = null;
          for (const [k, v] of Object.entries(items)) {
            self.storageMap[k] = JSON.parse(JSON.stringify(v));
          }
          if (cb) cb();
          return Promise.resolve();
        },
        remove: (keys, cb) => {
          self.lastError = null;
          const arr = Array.isArray(keys) ? keys : [keys];
          arr.forEach(k => delete self.storageMap[k]);
          if (cb) cb();
          return Promise.resolve();
        },
        clear: (cb) => {
          self.lastError = null;
          self.storageMap = {};
          if (cb) cb();
          return Promise.resolve();
        }
      },
      session: {
        get: (keys, cb) => {
          self.lastError = null;
          const res = {};
          if (typeof keys === "string") {
            res[keys] = self.sessionStorageMap[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach(k => {
              if (self.sessionStorageMap[k] !== undefined) res[k] = self.sessionStorageMap[k];
            });
          } else if (keys && typeof keys === "object") {
            for (const [k, defaultVal] of Object.entries(keys)) {
              res[k] = self.sessionStorageMap[k] !== undefined ? self.sessionStorageMap[k] : defaultVal;
            }
          } else {
            Object.assign(res, self.sessionStorageMap);
          }
          const copy = JSON.parse(JSON.stringify(res));
          if (cb) cb(copy);
          return Promise.resolve(copy);
        },
        set: (items, cb) => {
          self.lastError = null;
          for (const [k, v] of Object.entries(items || {})) {
            self.sessionStorageMap[k] = JSON.parse(JSON.stringify(v));
          }
          if (cb) cb();
          return Promise.resolve();
        },
        remove: (keys, cb) => {
          self.lastError = null;
          const arr = Array.isArray(keys) ? keys : [keys];
          arr.forEach(k => delete self.sessionStorageMap[k]);
          if (cb) cb();
          return Promise.resolve();
        },
        clear: (cb) => {
          self.lastError = null;
          self.sessionStorageMap = {};
          if (cb) cb();
          return Promise.resolve();
        }
      }
    };

    this.permissions = {
      contains: ({ permissions = [], origins = [] }, cb) => {
        self.lastError = null;
        const permsOk = permissions.every(p => self.grantedPermissions.has(p));
        const originsOk = origins.every(o => self.grantedOrigins.has(o));
        const has = permsOk && originsOk;
        if (cb) cb(has);
        return Promise.resolve(has);
      },
      request: ({ permissions = [], origins = [] }, cb) => {
        self.lastError = null;
        permissions.forEach(p => self.grantedPermissions.add(p));
        origins.forEach(o => self.grantedOrigins.add(o));
        if (cb) cb(true);
        return Promise.resolve(true);
      },
      remove: ({ permissions = [], origins = [] }, cb) => {
        self.lastError = null;
        permissions.forEach(p => self.grantedPermissions.delete(p));
        origins.forEach(o => self.grantedOrigins.delete(o));
        if (cb) cb(true);
        return Promise.resolve(true);
      }
    };

    this.declarativeNetRequest = {
      getDynamicRules: (cb) => {
        self.lastError = null;
        const copy = JSON.parse(JSON.stringify(self.dynamicRules));
        if (cb) cb(copy);
        return Promise.resolve(copy);
      },
      updateDynamicRules: ({ addRules = [], removeRuleIds = [] }, cb) => {
        self.lastError = null;
        self.dynamicRules = self.dynamicRules.filter(r => !removeRuleIds.includes(r.id));
        self.dynamicRules.push(...JSON.parse(JSON.stringify(addRules)));
        if (cb) cb();
        return Promise.resolve();
      },
      getSessionRules: (cb) => {
        self.lastError = null;
        const copy = JSON.parse(JSON.stringify(self._sessionRules));
        if (cb) cb(copy);
        return Promise.resolve(copy);
      },
      updateSessionRules: (options = {}, cb) => {
        self.lastError = null;
        const { addRules = [], removeRuleIds = [] } = options || {};
        if (Array.isArray(removeRuleIds) && removeRuleIds.length > 0) {
          self._sessionRules = self._sessionRules.filter(r => !removeRuleIds.includes(r.id));
        }
        if (Array.isArray(addRules) && addRules.length > 0) {
          self._sessionRules.push(...JSON.parse(JSON.stringify(addRules)));
        }
        if (cb) cb();
        return Promise.resolve();
      }
    };

    this.alarms = {
      create: (name, alarmInfo) => {
        self._alarmsMap.set(name, {
          name,
          scheduledTime: Date.now() + (alarmInfo.delayInMinutes ? alarmInfo.delayInMinutes * 60000 : 0),
          periodInMinutes: alarmInfo.periodInMinutes
        });
      },
      get: (name, cb) => {
        const a = self._alarmsMap.get(name) || null;
        if (cb) cb(a);
        return Promise.resolve(a);
      },
      clear: (name, cb) => {
        const cleared = self._alarmsMap.delete(name);
        if (cb) cb(cleared);
        return Promise.resolve(cleared);
      },
      onAlarm: {
        addListener: (fn) => self.alarmListeners.push(fn),
        removeListener: (fn) => {
          self.alarmListeners = self.alarmListeners.filter(f => f !== fn);
        }
      },
      _trigger: (name) => {
        const alarm = self._alarmsMap.get(name) || { name, scheduledTime: Date.now() };
        self.alarmListeners.forEach(fn => fn(alarm));
      }
    };

    this.runtime = {
      get lastError() {
        return self.lastError;
      },
      set lastError(val) {
        self.lastError = val;
      },
      getURL: (path) => `chrome-extension://mock-extension-id/${path.replace(/^\//, "")}`,
      openOptionsPage: (cb) => {
        if (cb) cb();
        return Promise.resolve();
      },
      onMessage: {
        addListener: (fn) => self.messageListeners.push(fn),
        removeListener: (fn) => {
          self.messageListeners = self.messageListeners.filter(f => f !== fn);
        }
      },
      sendMessage: (msg, cb) => {
        let responded = false;
        const sendResponse = (res) => {
          responded = true;
          if (cb) cb(res);
        };
        for (const fn of self.messageListeners) {
          const res = fn(msg, {}, sendResponse);
          if (res === true) return;
        }
        if (!responded && cb) cb(null);
      }
    };

    this.sidePanel = {
      open: (opts, cb) => { if (cb) cb(); return Promise.resolve(); },
      setOptions: (opts, cb) => { if (cb) cb(); return Promise.resolve(); }
    };
  }

  _indexTree(nodes, parentId = null) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (parentId !== null && node.parentId === undefined) {
        node.parentId = parentId;
      }
      if (node.index === undefined) {
        node.index = i;
      }
      this.nodesById.set(node.id, node);
      if (node.children) {
        this._indexTree(node.children, node.id);
      }
    }
  }

  get sessionRules() {
    return this._sessionRules;
  }

  set sessionRules(rules) {
    this._sessionRules = rules;
  }

  get storageSessionMap() {
    return this.sessionStorageMap;
  }

  set storageSessionMap(map) {
    this.sessionStorageMap = map;
  }

  installGlobal() {
    global.chrome = this;
    return this;
  }

  uninstallGlobal() {
    if (global.chrome === this) {
      delete global.chrome;
    }
  }
}

module.exports = { MockChrome };
