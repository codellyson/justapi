// JustAPI API Debugger — background service worker.
//
// Captures JS-initiated network traffic (fetch + XMLHttpRequest) from a
// chosen tab by injecting interceptor scripts. No yellow banner.
//
// The JustAPI web app drives the UI and connects via
// `externally_connectable`.

/* global chrome */
'use strict';

const REG_INTERCEPTOR = 'justapi-interceptor';
const REG_BRIDGE = 'justapi-interceptor-bridge';
const STORAGE_KEY = 'justapi-state';
const PERSIST_DEBOUNCE_MS = 400;
const MAX_CAPTURES = 500;

// ─── State ─────────────────────────────────────────────────────────

let attachedTabId = null;
let attachedTabTitle = '';
let paused = false;
let captures = new Map(); // requestId → entry, insertion-ordered
let nextLocalId = 1;

const webPorts = new Set();

// ─── Persistence ───────────────────────────────────────────────────
// chrome.storage.session lives only as long as the browser is open, but
// it survives service-worker restarts (idle timeout, force-suspend, etc.).
// We debounce writes so a chatty page doesn't thrash storage.

let persistTimer = null;
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    chrome.storage.session
      .set({
        [STORAGE_KEY]: {
          attachedTabId,
          attachedTabTitle,
          paused,
          nextLocalId,
          captures: [...captures.values()],
        },
      })
      .catch(() => {
        /* storage unavailable */
      });
  }, PERSIST_DEBOUNCE_MS);
}

// Handlers must `await restored` before touching state — SW respawns
// after idle wipe the in-memory Map until the storage read resolves.
const restored = chrome.storage.session
  .get(STORAGE_KEY)
  .then((data) => {
    const saved = data?.[STORAGE_KEY];
    if (!saved) return;
    attachedTabId = saved.attachedTabId ?? null;
    attachedTabTitle = saved.attachedTabTitle ?? '';
    paused = !!saved.paused;
    nextLocalId = saved.nextLocalId ?? 1;
    captures = new Map(
      (saved.captures || []).map((e) => [e.requestId, e])
    );
  })
  .catch(() => {});

// On service worker boot, clear stale dynamic content-script registrations
// from a previous session.
chrome.scripting
  .getRegisteredContentScripts()
  .then(async (scripts) => {
    const ids = scripts.map((s) => s.id).filter((id) => id.startsWith('justapi-'));
    if (ids.length > 0) {
      try {
        await chrome.scripting.unregisterContentScripts({ ids });
      } catch {
        /* already gone */
      }
    }
  })
  .catch(() => {
    /* not yet available */
  });

// ─── External (web app) connection ─────────────────────────────────

chrome.runtime.onConnectExternal.addListener((port) => {
  if (port.name !== 'justapi-debugger') return;
  webPorts.add(port);
  port.onDisconnect.addListener(() => webPorts.delete(port));
  port.onMessage.addListener((msg) => handlePanelMessage(msg, port));

  restored.then(() => {
    try {
      port.postMessage({
        type: 'state',
        attachedTabId,
        attachedTabTitle,
        paused,
        captures: [...captures.values()],
      });
    } catch {
      /* port closed */
    }
  });
});

function broadcast(msg) {
  for (const port of webPorts) {
    try {
      port.postMessage(msg);
    } catch {
      webPorts.delete(port);
    }
  }
}

async function handlePanelMessage(msg, port) {
  await restored;
  switch (msg.type) {
    case 'list-tabs':
      await sendTabList(port);
      break;
    case 'attach':
      await attachTab(msg.tabId, port);
      break;
    case 'detach':
      await detachCurrent();
      break;
    case 'clear':
      captures.clear();
      broadcast({ type: 'cleared' });
      schedulePersist();
      break;
    case 'set-paused':
      paused = !!msg.paused;
      broadcast({ type: 'paused', paused });
      schedulePersist();
      break;
  }
}

async function sendTabList(port) {
  const tabs = await chrome.tabs.query({});
  const list = tabs
    .filter(
      (t) =>
        t.id !== undefined &&
        t.url &&
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('chrome-extension://') &&
        !t.url.startsWith('edge://') &&
        !t.url.startsWith('about:')
    )
    .map((t) => ({
      id: t.id,
      title: t.title || '',
      url: t.url || '',
      favIconUrl: t.favIconUrl || '',
      active: t.active,
      windowId: t.windowId,
    }));
  port.postMessage({ type: 'tabs', tabs: list });
}

// ─── Attach / detach ───────────────────────────────────────────────

async function attachTab(tabId, port) {
  if (tabId === undefined || tabId === null) {
    port.postMessage({ type: 'attach-failed', error: 'No tab id provided.' });
    return;
  }

  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    port.postMessage({ type: 'attach-failed', error: 'Tab not found.' });
    return;
  }
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    port.postMessage({ type: 'attach-failed', error: 'Cannot attach to chrome:// pages.' });
    return;
  }

  // Compute origin match pattern (e.g. https://example.com/*).
  let originPattern;
  try {
    const u = new URL(tab.url);
    originPattern = `${u.protocol}//${u.host}/*`;
  } catch {
    port.postMessage({ type: 'attach-failed', error: 'Could not parse tab URL.' });
    return;
  }

  // Detach previous attachment (also unregisters scripts).
  await detachCurrent();

  try {
    // Register dynamic content scripts at document_start for future page
    // loads on this origin. This catches initial-load fetch/XHR.
    await chrome.scripting.registerContentScripts([
      {
        id: REG_INTERCEPTOR,
        matches: [originPattern],
        js: ['interceptor.js'],
        world: 'MAIN',
        runAt: 'document_start',
      },
      {
        id: REG_BRIDGE,
        matches: [originPattern],
        js: ['interceptor-bridge.js'],
        world: 'ISOLATED',
        runAt: 'document_start',
      },
    ]);

    // Also inject into the current page so the user can start capturing
    // without reloading. Future reloads/navigations are covered by the
    // registration above.
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'MAIN',
      files: ['interceptor.js'],
    });
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'ISOLATED',
      files: ['interceptor-bridge.js'],
    });

    attachedTabId = tabId;
    attachedTabTitle = tab.title || tab.url || '';
    captures.clear();
    broadcast({ type: 'attached', tabId, tabTitle: attachedTabTitle });
    schedulePersist();
  } catch (e) {
    port.postMessage({
      type: 'attach-failed',
      error: e?.message || String(e),
    });
  }
}

async function detachCurrent() {
  // Always try to unregister dynamic content scripts, even if state thinks
  // we're not attached — guards against stale registrations.
  try {
    await chrome.scripting.unregisterContentScripts({
      ids: [REG_INTERCEPTOR, REG_BRIDGE],
    });
  } catch {
    /* already unregistered */
  }

  if (attachedTabId === null) return;
  attachedTabId = null;
  attachedTabTitle = '';
  captures.clear();
  // We don't try to un-patch fetch/XHR in already-loaded pages — that's
  // not reliably possible. The interceptor stays alive until reload.
  // The background's runtime.onMessage handler ignores events for tabs
  // that aren't `attachedTabId`, so post-detach events are dropped.
  broadcast({ type: 'detached' });
  schedulePersist();
}

chrome.tabs.onRemoved.addListener((tabId) => {
  restored.then(() => {
    if (tabId === attachedTabId) {
      attachedTabId = null;
      attachedTabTitle = '';
      captures.clear();
      broadcast({ type: 'detached', reason: 'tab-closed' });
      schedulePersist();
    }
  });
});

// ─── Capture events from interceptor-bridge.js ─────────────────────

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'capture-event') return;
  restored.then(() => {
    if (!sender.tab || sender.tab.id !== attachedTabId) return;
    if (paused) return;
    handleCaptureEvent(msg.payload);
  });
});

function handleCaptureEvent(p) {
  if (!p?.requestId) return;

  if (p.phase === 'start') {
    const entry = {
      localId: nextLocalId++,
      requestId: p.requestId,
      method: p.method || 'GET',
      url: p.url || '',
      requestHeaders: p.requestHeaders || {},
      requestBody: p.requestBody || '',
      requestHasBody: !!p.requestBody,
      status: 0,
      statusText: '',
      responseHeaders: {},
      responseBody: '',
      mimeType: '',
      resourceType: p.resourceType || 'fetch',
      initiator: p.initiator || '',
      startTime: p.startTime || 0,
      endTime: 0,
      timeMs: 0,
      size: 0,
      failed: false,
      errorText: '',
    };
    captures.set(p.requestId, entry);
    // Evict oldest beyond cap.
    if (captures.size > MAX_CAPTURES) {
      const drop = captures.size - MAX_CAPTURES;
      const it = captures.keys();
      const evicted = [];
      for (let i = 0; i < drop; i++) {
        const k = it.next().value;
        evicted.push(k);
        captures.delete(k);
      }
      broadcast({ type: 'capture-evicted', requestIds: evicted });
    }
    broadcast({ type: 'capture-new', entry });
    schedulePersist();
  } else if (p.phase === 'finish') {
    const entry = captures.get(p.requestId);
    if (!entry) return;
    entry.status = p.status || 0;
    entry.statusText = p.statusText || '';
    entry.responseHeaders = p.responseHeaders || {};
    entry.responseBody = p.responseBody || '';
    entry.mimeType = p.mimeType || '';
    entry.timeMs = p.timeMs || 0;
    entry.size = p.size || 0;
    broadcast({ type: 'capture-update', entry });
    schedulePersist();
  } else if (p.phase === 'fail') {
    const entry = captures.get(p.requestId);
    if (!entry) return;
    entry.failed = true;
    entry.errorText = p.errorText || 'Failed';
    entry.timeMs = p.timeMs || 0;
    broadcast({ type: 'capture-update', entry });
    schedulePersist();
  }
}
