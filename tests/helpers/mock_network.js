// ============================================================================
// Deterministic Network & DoH Mock Environment
// Intercepts global.fetch, records outbound headers, simulates DNS & HTTP responses
// ============================================================================

class MockNetwork {
  constructor() {
    this.originalFetch = null;
    this.recordedRequests = [];
    this.routes = new Map(); // urlPattern -> handler or response object
    this.dohMap = new Map(); // hostname -> { status: 3 } or { status: 0, ips: [...] }
    this.defaultHandler = null;
  }

  install() {
    if (!this.originalFetch) {
      this.originalFetch = global.fetch;
    }
    const self = this;

    global.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : (input && input.url ? input.url : String(input));
      const method = (init.method || "GET").toUpperCase();
      const headers = {};

      if (init.headers) {
        if (typeof init.headers.forEach === "function") {
          init.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([k, v]) => { headers[k.toLowerCase()] = v; });
        } else {
          Object.entries(init.headers).forEach(([k, v]) => { headers[k.toLowerCase()] = v; });
        }
      }

      const record = {
        url,
        method,
        headers,
        credentials: init.credentials,
        signal: init.signal,
        timestamp: Date.now()
      };
      self.recordedRequests.push(record);

      // Handle Cloudflare DoH requests
      if (url.includes("cloudflare-dns.com/dns-query") || url.includes("/dns-query")) {
        const u = new URL(url);
        const name = u.searchParams.get("name") || "";
        const dohConfig = self.dohMap.get(name) || self.dohMap.get(name.toLowerCase());

        if (dohConfig && dohConfig.error) {
          throw new Error(dohConfig.error);
        }

        if (dohConfig && dohConfig.httpStatus && dohConfig.httpStatus !== 200) {
          return self._createResponse({
            status: dohConfig.httpStatus,
            json: { error: "Server Error" },
            text: "Server Error"
          });
        }

        const dohStatus = dohConfig ? dohConfig.status : 0; // 3 for NXDOMAIN, 0 for NOERROR
        const answers = (dohConfig && dohConfig.answers)
          ? dohConfig.answers
          : (dohStatus === 0 ? [{ name, type: 1, TTL: 300, data: "93.184.216.34" }] : []);

        const body = {
          Status: dohStatus,
          TC: false,
          RD: true,
          RA: true,
          AD: false,
          CD: false,
          Question: [{ name, type: 1 }],
          Answer: answers
        };

        return self._createResponse({
          status: 200,
          json: body,
          text: JSON.stringify(body),
          headers: { "content-type": "application/dns-json" }
        });
      }

      // Check registered custom routes
      for (const [pattern, handler] of self.routes.entries()) {
        let match = false;
        if (typeof pattern === "string" && (url === pattern || url.startsWith(pattern))) match = true;
        if (pattern instanceof RegExp && pattern.test(url)) match = true;

        if (match) {
          if (typeof handler === "function") {
            const customRes = await handler(record);
            if (customRes && typeof customRes === "object" && !customRes.body) {
              customRes.streamCancelled = false;
              customRes.body = {
                getReader: () => ({
                  read: async () => ({ value: new Uint8Array([1, 2, 3]), done: false }),
                  cancel: async () => { customRes.streamCancelled = true; }
                })
              };
            }
            return customRes;
          }
          return self._createResponse(handler);
        }
      }

      if (self.defaultHandler) {
        const defRes = await self.defaultHandler(record);
        if (defRes && typeof defRes === "object" && !defRes.body) {
          defRes.streamCancelled = false;
          defRes.body = {
            getReader: () => ({
              read: async () => ({ value: new Uint8Array([1, 2, 3]), done: false }),
              cancel: async () => { defRes.streamCancelled = true; }
            })
          };
        }
        return defRes;
      }

      // Default healthy 200 response
      return self._createResponse({ status: 200, text: "OK" });
    };

    return this;
  }

  uninstall() {
    if (this.originalFetch) {
      global.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  clear() {
    this.recordedRequests = [];
    this.routes.clear();
    this.dohMap.clear();
    this.defaultHandler = null;
  }

  setDoHResult(hostname, result) {
    this.dohMap.set(hostname.toLowerCase(), result);
  }

  setRoute(pattern, responseOrHandler) {
    this.routes.set(pattern, responseOrHandler);
  }

  _createResponse(opts) {
    const status = opts.status || 200;
    const ok = status >= 200 && status < 300;
    const bodyText = opts.text || (opts.json ? JSON.stringify(opts.json) : "");
    const headersMap = new Map();
    if (opts.headers) {
      if (typeof opts.headers.forEach === "function") {
        opts.headers.forEach((v, k) => headersMap.set(k.toLowerCase(), v));
      } else {
        Object.entries(opts.headers).forEach(([k, v]) => headersMap.set(k.toLowerCase(), v));
      }
    }
    const origGet = headersMap.get.bind(headersMap);
    headersMap.get = (h) => origGet(String(h).toLowerCase()) || null;

    const response = {
      ok,
      status,
      redirected: !!opts.redirectedUrl,
      url: opts.redirectedUrl || opts.url || "http://mocked.url",
      headers: headersMap,
      text: async () => bodyText,
      json: async () => opts.json || JSON.parse(bodyText || "{}"),
      streamCancelled: false,
      body: null
    };

    response.body = {
      getReader: () => ({
        read: async () => ({ value: new Uint8Array([1, 2, 3]), done: false }),
        cancel: async () => {
          response.streamCancelled = true;
        }
      })
    };

    return response;
  }
}

module.exports = { MockNetwork };
