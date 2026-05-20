// JustAPI interceptor — runs in the target page's MAIN world.
//
// Patches window.fetch and XMLHttpRequest so every JS-initiated request
// gets reported via window.postMessage. A companion ISOLATED-world bridge
// (interceptor-bridge.js) forwards those messages to the extension.
//
// No yellow banner — this is a regular content-script-injected patch,
// not chrome.debugger.

(() => {
  'use strict';

  if (window.__justapiIntercepted) return;
  window.__justapiIntercepted = true;

  const POST_TYPE = 'justapi-captured-event';
  let nextLocal = 1;
  const genId = () => `qr-${Date.now()}-${nextLocal++}`;

  // Capture a short, page-only stack so the user can see which line of
  // their code triggered the request. The first frame is always the
  // interceptor itself; we drop it. Extension/chrome frames are also
  // filtered so the user sees their own code.
  const captureStack = () => {
    const raw = new Error().stack || '';
    const lines = raw.split('\n').slice(1); // drop "Error" header
    const cleaned = lines
      .map((l) => l.trim())
      .filter((l) => l && !l.includes('interceptor.js') && !l.includes('chrome-extension://'))
      .slice(0, 8);
    return cleaned.join('\n');
  };

  const post = (payload) => {
    try {
      window.postMessage({ source: 'justapi-interceptor', type: POST_TYPE, payload }, '*');
    } catch {
      /* postMessage can throw on closed windows */
    }
  };

  const headersToObject = (h) => {
    if (!h) return {};
    if (typeof Headers !== 'undefined' && h instanceof Headers) {
      const o = {};
      h.forEach((v, k) => (o[k] = v));
      return o;
    }
    if (Array.isArray(h)) return Object.fromEntries(h);
    if (typeof h === 'object') {
      const o = {};
      for (const [k, v] of Object.entries(h)) o[k] = String(v);
      return o;
    }
    return {};
  };

  const parseHeadersString = (str) => {
    const o = {};
    if (!str) return o;
    for (const line of str.trim().split(/[\r\n]+/)) {
      const idx = line.indexOf(':');
      if (idx > 0) o[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    }
    return o;
  };

  const serializeBody = (body) => {
    if (body == null) return '';
    if (typeof body === 'string') return body;
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return body.toString();
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      const o = {};
      body.forEach((v, k) => (o[k] = typeof v === 'string' ? v : '[Blob]'));
      return JSON.stringify(o);
    }
    if (typeof Blob !== 'undefined' && body instanceof Blob) return `[Blob ${body.size}B]`;
    if (body instanceof ArrayBuffer) return `[ArrayBuffer ${body.byteLength}B]`;
    if (ArrayBuffer.isView(body)) return `[${body.constructor.name} ${body.byteLength}B]`;
    try {
      return String(body);
    } catch {
      return '[unserializable]';
    }
  };

  // ─── fetch ───────────────────────────────────────────────────────

  const origFetch = window.fetch?.bind(window);
  if (origFetch) {
    window.fetch = async function (input, init) {
      const requestId = genId();
      const start = performance.now();

      let url, method, requestHeaders, requestBody;
      try {
        if (typeof input === 'string') {
          url = input;
          method = (init?.method || 'GET').toUpperCase();
          requestHeaders = headersToObject(init?.headers);
          requestBody = serializeBody(init?.body);
        } else if (typeof Request !== 'undefined' && input instanceof Request) {
          url = input.url;
          method = input.method.toUpperCase();
          requestHeaders = headersToObject(input.headers);
          requestBody = '';
          try {
            requestBody = await input.clone().text();
          } catch {
            /* opaque body */
          }
        } else {
          url = String(input);
          method = (init?.method || 'GET').toUpperCase();
          requestHeaders = headersToObject(init?.headers);
          requestBody = serializeBody(init?.body);
        }
      } catch {
        url = String(input);
        method = 'GET';
        requestHeaders = {};
        requestBody = '';
      }

      post({
        phase: 'start',
        requestId,
        method,
        url,
        requestHeaders,
        requestBody,
        resourceType: 'fetch',
        initiator: captureStack(),
        startTime: start,
      });

      try {
        const res = await origFetch(input, init);
        const cloned = res.clone();
        const responseHeaders = headersToObject(cloned.headers);
        let responseBody = '';
        try {
          responseBody = await cloned.text();
        } catch {
          /* opaque body or stream consumed */
        }
        const end = performance.now();
        post({
          phase: 'finish',
          requestId,
          status: res.status,
          statusText: res.statusText,
          responseHeaders,
          responseBody,
          mimeType: responseHeaders['content-type'] || '',
          timeMs: Math.round(end - start),
          size: responseBody.length,
        });
        return res;
      } catch (err) {
        const end = performance.now();
        post({
          phase: 'fail',
          requestId,
          timeMs: Math.round(end - start),
          errorText: err?.message || String(err),
        });
        throw err;
      }
    };
  }

  // ─── XMLHttpRequest ──────────────────────────────────────────────

  const OrigXHR = window.XMLHttpRequest;
  if (OrigXHR && OrigXHR.prototype) {
    const proto = OrigXHR.prototype;
    const origOpen = proto.open;
    const origSend = proto.send;
    const origSetHeader = proto.setRequestHeader;

    proto.open = function (method, url, ...rest) {
      this.__qrId = genId();
      this.__qrMethod = String(method || 'GET').toUpperCase();
      this.__qrUrl = String(url || '');
      this.__qrHeaders = {};
      // Capture stack at .open() — that's typically the user-code call site.
      this.__qrInitiator = captureStack();
      return origOpen.call(this, method, url, ...rest);
    };

    proto.setRequestHeader = function (name, value) {
      if (this.__qrHeaders) this.__qrHeaders[String(name)] = String(value);
      return origSetHeader.call(this, name, value);
    };

    proto.send = function (body) {
      const requestId = this.__qrId || genId();
      const start = performance.now();

      post({
        phase: 'start',
        requestId,
        method: this.__qrMethod || 'GET',
        url: this.__qrUrl || '',
        requestHeaders: this.__qrHeaders || {},
        requestBody: serializeBody(body),
        resourceType: 'xhr',
        initiator: this.__qrInitiator || '',
        startTime: start,
      });

      this.addEventListener('loadend', () => {
        const end = performance.now();
        const responseHeaders = parseHeadersString(this.getAllResponseHeaders?.() || '');
        if (this.status > 0) {
          let responseBody = '';
          try {
            if (this.responseType === '' || this.responseType === 'text') {
              responseBody = typeof this.responseText === 'string' ? this.responseText : '';
            } else if (this.responseType === 'json') {
              responseBody = JSON.stringify(this.response);
            } else {
              responseBody = `[${this.responseType} response]`;
            }
          } catch {
            /* responseText may throw if responseType is not text */
          }
          post({
            phase: 'finish',
            requestId,
            status: this.status,
            statusText: this.statusText || '',
            responseHeaders,
            responseBody,
            mimeType: responseHeaders['content-type'] || '',
            timeMs: Math.round(end - start),
            size: responseBody.length,
          });
        } else {
          post({
            phase: 'fail',
            requestId,
            timeMs: Math.round(end - start),
            errorText: 'XHR failed (network error or aborted)',
          });
        }
      });

      return origSend.call(this, body);
    };
  }

  // Mark active so future "detach" can no-op gracefully (page must reload
  // to truly remove the patch).
  window.__justapiInterceptorActive = true;

  console.log('[JustAPI] fetch + XHR interceptor active');
})();
