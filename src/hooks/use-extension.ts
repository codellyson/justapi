'use client';

import { useEffect } from 'react';
import { extensionBridge } from '../utils/extension-bridge';
import { useDebuggerStore } from '../stores/use-debugger-store';

/**
 * Discovers the extension on mount, opens the port, and routes
 * extension events into the debugger store. Mount once near the top
 * of the app.
 */
export function useExtension() {
  const store = useDebuggerStore.getState;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const id = await extensionBridge.discover();
      if (cancelled) return;
      if (!id) {
        store().setStatus('no-extension');
        return;
      }
      if (!extensionBridge.connect()) {
        store().setStatus('no-extension');
        return;
      }
      // Default to 'idle'. The first 'state' message from the extension
      // will refine to 'attached' if a tab is already being captured.
      store().setStatus('idle');
      // Ask for an initial tab list so the picker has something to show.
      extensionBridge.send({ type: 'list-tabs' });
    })();

    const unsubMsg = extensionBridge.subscribe((msg) => {
      const s = store();
      switch (msg.type) {
        case 'state':
          s.applyState({
            attachedTabId: msg.attachedTabId,
            attachedTabTitle: msg.attachedTabTitle,
            paused: msg.paused,
            captures: msg.captures,
          });
          break;
        case 'paused':
          s.setPaused(msg.paused);
          break;
        case 'capture-evicted':
          s.evictCaptures(msg.requestIds);
          break;
        case 'tabs':
          s.setTabs(msg.tabs);
          break;
        case 'attached':
          s.setAttached(msg.tabId, msg.tabTitle);
          s.setError(null);
          break;
        case 'attach-failed':
          s.setError(msg.error);
          break;
        case 'detached':
          s.setAttached(null, '');
          s.resetCaptures();
          break;
        case 'capture-new':
          s.addCapture(msg.entry);
          break;
        case 'capture-update':
          s.updateCapture(msg.entry);
          break;
        case 'cleared':
          s.resetCaptures();
          break;
      }
    });

    const unsubConn = extensionBridge.onConnectionChange((connected) => {
      if (!connected) store().setStatus('no-extension');
    });

    return () => {
      cancelled = true;
      unsubMsg();
      unsubConn();
    };
  }, [store]);
}
