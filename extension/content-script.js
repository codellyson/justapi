// QuickRest extension — content script.
//
// Injected into QuickRest web app pages (localhost dev URLs for now).
// Posts the extension ID to the page so the web app can open an
// externally_connectable port back to the extension.
//
// Runs at document_start so the page can read the ID immediately on mount.

/* global chrome */
'use strict';

const announce = () => {
  window.postMessage(
    {
      type: 'quickrest-extension-ready',
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
    },
    window.location.origin
  );
};

console.log('[QuickRest] content script loaded, extensionId=', chrome.runtime.id);
announce();

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'quickrest-extension-ping') {
    console.log('[QuickRest] ping received, re-announcing');
    announce();
  }
});
