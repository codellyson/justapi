/**
 * Bridge to the JustAPI browser extension.
 *
 * The extension's content script broadcasts the extension ID to the page
 * via window.postMessage. Once discovered, we open a long-lived
 * `chrome.runtime` port (allowed by the extension's `externally_connectable`
 * manifest entry) and stream commands + events.
 */

export type DebuggerTab = {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: boolean;
  windowId: number;
};

export type CapturedRequest = {
  localId: number;
  requestId: string;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  requestHasBody: boolean;
  status: number;
  statusText: string;
  responseHeaders: Record<string, string>;
  responseBody: string;
  mimeType: string;
  resourceType: string;
  initiator: string;
  startTime: number;
  endTime: number;
  timeMs: number;
  size: number;
  failed: boolean;
  errorText: string;
};

type Listener = (msg: BridgeMessage) => void;

export type BridgeMessage =
  | { type: 'state'; attachedTabId: number | null; attachedTabTitle: string; paused?: boolean; captures: CapturedRequest[] }
  | { type: 'attached'; tabId: number; tabTitle: string }
  | { type: 'attach-failed'; error: string }
  | { type: 'detached'; reason?: string }
  | { type: 'capture-new'; entry: CapturedRequest }
  | { type: 'capture-update'; entry: CapturedRequest }
  | { type: 'capture-evicted'; requestIds: string[] }
  | { type: 'cleared' }
  | { type: 'paused'; paused: boolean }
  | { type: 'tabs'; tabs: DebuggerTab[] };

interface ChromePort {
  postMessage: (msg: unknown) => void;
  onMessage: { addListener: (cb: (msg: BridgeMessage) => void) => void };
  onDisconnect: { addListener: (cb: () => void) => void };
  disconnect: () => void;
}

interface ChromeRuntime {
  connect: (extensionId: string, info: { name: string }) => ChromePort;
}

class ExtensionBridge {
  extensionId: string | null = null;
  private port: ChromePort | null = null;
  private listeners = new Set<Listener>();
  private connectListeners = new Set<(connected: boolean) => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;

  /** Ask the content script for the extension ID. Resolves null if no reply. */
  async discover(timeoutMs = 2500): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    if (this.extensionId) return this.extensionId;

    return new Promise<string | null>((resolve) => {
      console.log('[JustAPI] discovering extension…');

      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        console.warn(
          '[JustAPI] extension not detected after',
          timeoutMs,
          'ms. Make sure the extension is loaded and the page URL matches `http://localhost/*` or `http://127.0.0.1/*` in its manifest.'
        );
        resolve(null);
      }, timeoutMs);

      const handler = (event: MessageEvent) => {
        if (event.source !== window) return;
        const data = event.data;
        if (data?.type === 'justapi-extension-ready' && typeof data.extensionId === 'string') {
          clearTimeout(timer);
          window.removeEventListener('message', handler);
          this.extensionId = data.extensionId;
          console.log('[JustAPI] extension detected, id=', data.extensionId);
          resolve(data.extensionId);
        }
      };

      window.addEventListener('message', handler);
      window.postMessage({ type: 'justapi-extension-ping' }, window.location.origin);
    });
  }

  /** Open the long-lived port to the extension. Returns false if no chrome.runtime. */
  connect(): boolean {
    if (this.port) return true;
    if (!this.extensionId) return false;

    const runtime = (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
    if (!runtime?.connect) {
      console.warn(
        '[JustAPI] window.chrome.runtime.connect is unavailable. The page URL must be listed in the extension\'s `externally_connectable.matches`.'
      );
      return false;
    }

    try {
      const port = runtime.connect(this.extensionId, { name: 'justapi-debugger' });
      port.onMessage.addListener((msg) => {
        for (const l of this.listeners) l(msg);
      });
      port.onDisconnect.addListener(() => {
        this.port = null;
        for (const l of this.connectListeners) l(false);
        this.scheduleReconnect();
      });
      this.port = port;
      this.reconnectAttempt = 0;
      console.log('[JustAPI] connected to extension');
      for (const l of this.connectListeners) l(true);
      return true;
    } catch (e) {
      console.error('[JustAPI] connect failed:', e);
      this.scheduleReconnect();
      return false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.extensionId) return;
    const delay = Math.min(10000, 500 * 2 ** Math.min(this.reconnectAttempt, 5));
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.port) return;
      this.connect();
    }, delay);
  }

  send(msg: unknown) {
    this.port?.postMessage(msg);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onConnectionChange(listener: (connected: boolean) => void) {
    this.connectListeners.add(listener);
    return () => this.connectListeners.delete(listener);
  }

  get isConnected(): boolean {
    return this.port !== null;
  }
}

export const extensionBridge = new ExtensionBridge();
