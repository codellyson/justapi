// QuickRest interceptor bridge — runs in the target page's ISOLATED world.
//
// Listens for postMessages from interceptor.js (MAIN world) and forwards
// them to the extension's background service worker via chrome.runtime.

/* global chrome */
(() => {
  'use strict';

  if (window.__quickrestBridgeInstalled) return;
  window.__quickrestBridgeInstalled = true;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'quickrest-interceptor') return;
    chrome.runtime.sendMessage({
      type: 'capture-event',
      payload: data.payload,
    });
  });
})();
