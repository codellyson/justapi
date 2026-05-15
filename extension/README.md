# QuickRest — API Debugger (Chrome extension)

A passive capture agent. The UI lives in the QuickRest web app — this extension is just the bridge that lets the web app see JS-initiated HTTP traffic from other tabs.

## What it captures

- `window.fetch` calls
- `XMLHttpRequest` calls (covers axios, jQuery.ajax, and anything XHR-based)

**With request + response bodies** for both, no banner from Chrome.

## What it does NOT capture

- Preflight CORS requests (`OPTIONS` issued by the browser, not your code)
- Browser-level redirects
- Image / font / CSS / script asset loads
- Requests from service workers
- Navigations (full page loads, `<form>` POSTs that navigate)

If you need any of those, you need `chrome.debugger` (which is what shows the yellow banner) — happy to add a "Deep capture" toggle later.

## How it works

1. You click **Attach tab** in QuickRest's Debug panel.
2. The extension's background service worker injects two scripts into the target tab via `chrome.scripting.executeScript`:
   - `interceptor.js` runs in the page's **MAIN world** and patches `window.fetch` + `XMLHttpRequest.prototype` to post events via `window.postMessage`.
   - `interceptor-bridge.js` runs in the **ISOLATED world** of the same tab, listens for those postMessages, and forwards them via `chrome.runtime.sendMessage` to the background service worker.
3. The background service worker buffers captured requests and broadcasts them to QuickRest via the long-lived `chrome.runtime` port (the web app is listed in `externally_connectable.matches`).

## Install (dev mode)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and pick this `extension/` directory.
4. Open QuickRest at `http://localhost:3000`.
5. **Refresh the page** after the extension is installed (the content script that announces the extension ID runs at `document_start` and needs to fire once).
6. Sidebar → **Debug** tab → should now show "Pick a tab to attach."

After editing the manifest, click the refresh icon on the extension card in `chrome://extensions` before reloading the QuickRest tab.

## Use

1. Click **Attach tab** in the Debug panel.
2. Pick the tab you want to capture from the dropdown.
3. Interact with that tab — fetch + XHR calls stream into QuickRest live.
4. Click a captured row → **Load** button (or double-click) to push the request into the Explorer composer and replay/modify it.
5. Click **Detach** when done. (The interceptor stays patched until the target tab is reloaded; events are ignored after detach.)

## Files

- `manifest.json` — Manifest V3. Permissions: `scripting`, `tabs`. Host: `<all_urls>`.
- `content-script.js` — runs on QuickRest pages. Announces the extension ID to the page via window.postMessage.
- `background.js` — service worker. Owns the attachment state, injects interceptors, normalizes events, broadcasts to the web app.
- `interceptor.js` — injected into target page's MAIN world. Patches fetch/XHR.
- `interceptor-bridge.js` — injected into target page's ISOLATED world. Forwards interceptor events to background.

No build step.

## Known gaps (v1)

- Initial-page-load requests fire before the interceptor is injected. Click Attach, then **reload the target tab** to capture them.
- Detach doesn't truly un-patch fetch/XHR; the patch lingers until the page reloads. Captured events are just ignored.
- One tab attached at a time.
- Binary / streamed response bodies are reported as placeholder text.
- No filter UI yet — captures every fetch/XHR.
- Icons not included.
