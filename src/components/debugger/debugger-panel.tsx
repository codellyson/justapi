'use client';

import { useMemo, useState } from 'react';
import { Pause, Play, Plug, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useDebuggerStore } from '../../stores/use-debugger-store';
import { useRequestStore } from '../../stores/use-request-store';
import { useCollectionsStore } from '../../stores/use-collections-store';
import { extensionBridge } from '../../utils/extension-bridge';
import { Button } from '../ui/button';
import { DebuggerItem } from './debugger-item';
import { cn } from '../../utils/cn';
import type { CapturedRequest } from '../../utils/extension-bridge';
import type { HttpMethod } from '../../utils/http';

const reloadPage = () => {
  if (typeof window !== 'undefined') window.location.reload();
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '—';
  }
}

/**
 * Walks the (already-filtered) captures top-to-bottom and emits a host
 * section header each time the host changes. Consecutive same-host rows
 * sit under the same header.
 */
function renderGrouped(
  entries: CapturedRequest[],
  renderEntry: (entry: CapturedRequest) => React.ReactNode
) {
  const nodes: React.ReactNode[] = [];
  let lastHost: string | null = null;
  let runCount = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const host = hostOf(entry.url);
    if (host !== lastHost) {
      runCount = entries.slice(i).findIndex((e) => hostOf(e.url) !== host);
      if (runCount === -1) runCount = entries.length - i;
      nodes.push(
        <div
          key={`h-${i}-${host}`}
          className="flex items-center justify-between px-2 py-1 text-[10px] uppercase tracking-wide font-medium text-muted bg-bg-secondary/60"
        >
          <span className="truncate">{host}</span>
          <span className="text-muted">{runCount}</span>
        </div>
      );
      lastHost = host;
    }
    nodes.push(renderEntry(entry));
  }
  return nodes;
}

export const DebuggerPanel = () => {
  const {
    status,
    tabs,
    attachedTabTitle,
    captures,
    selectedRequestId,
    setSelected,
    setReplayOriginal,
    paused,
    lastError,
  } = useDebuggerStore();
  const { setActiveCollectionId } = useCollectionsStore();
  const requestStore = useRequestStore();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return captures;
    return captures.filter(
      (c) =>
        c.url.toLowerCase().includes(q) ||
        c.method.toLowerCase().includes(q) ||
        String(c.status).includes(q)
    );
  }, [captures, filter]);

  const refreshTabs = () => {
    extensionBridge.send({ type: 'list-tabs' });
    setPickerOpen(true);
  };

  const attach = (tabId: number) => {
    extensionBridge.send({ type: 'attach', tabId });
    setPickerOpen(false);
  };

  const detach = () => {
    extensionBridge.send({ type: 'detach' });
  };

  const clear = () => {
    extensionBridge.send({ type: 'clear' });
  };

  const togglePause = () => {
    extensionBridge.send({ type: 'set-paused', paused: !paused });
  };

  const loadInExplorer = (entry: CapturedRequest) => {
    const baseUrl = entry.url.includes('?') ? entry.url.split('?')[0] : entry.url;

    const params: Array<{ id: string; key: string; value: string; enabled: boolean }> = [];
    try {
      const u = new URL(entry.url);
      let i = 0;
      u.searchParams.forEach((value, name) => {
        params.push({ id: String(i++), key: name, value, enabled: true });
      });
    } catch {
      // invalid URL — leave params empty
    }

    const headers = Object.entries(entry.requestHeaders).map(([k, v], i) => ({
      id: String(i),
      key: k,
      value: String(v),
      enabled: true,
    }));

    let bodyType: 'none' | 'json' | 'raw' | 'form-data' = 'none';
    if (entry.requestBody) {
      const ct = headers.find((h) => h.key.toLowerCase() === 'content-type')?.value || '';
      if (ct.includes('application/json')) bodyType = 'json';
      else if (ct.includes('multipart/form-data')) bodyType = 'form-data';
      else bodyType = 'raw';
    }

    requestStore.setMethod(entry.method as HttpMethod);
    requestStore.setUrl(baseUrl);
    requestStore.setParams(params);
    requestStore.setHeaders(headers);
    requestStore.setBodyType(bodyType);
    requestStore.setBody(entry.requestBody || '');
    requestStore.setAuthType('none');
    requestStore.setAuthConfig({});
    setActiveCollectionId(null);
    setReplayOriginal(entry);
    setSelected(null);
  };

  // Extension not detected — minimal prompt.
  if (status === 'no-extension' || status === 'unknown') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-medium text-secondary">Debug</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6">
          <Plug className="w-5 h-5 text-muted mb-2" />
          <p className="text-xs text-secondary max-w-[200px] mb-3">
            {status === 'unknown' ? 'Looking for extension…' : 'Install the QuickRest extension and reload this tab.'}
          </p>
          {status === 'no-extension' && (
            <button
              onClick={reloadPage}
              className="text-xs text-accent hover:underline"
            >
              Reload page
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-secondary">Debug</h3>
          <div className="flex items-center gap-1">
            {status === 'attached' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePause}
                aria-label={paused ? 'Resume capturing' : 'Pause capturing'}
                title={paused ? 'Resume capturing' : 'Pause capturing'}
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </Button>
            )}
            {status === 'attached' ? (
              <Button variant="ghost" size="sm" onClick={detach} className="text-xs">
                Detach
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={refreshTabs} className="text-xs">
                Attach tab
              </Button>
            )}
            {captures.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clear} aria-label="Clear">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {status === 'attached' && attachedTabTitle && (
          <div className="text-xs text-muted truncate">
            <span
              className={cn(
                'inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle',
                paused ? 'bg-warning' : 'bg-success'
              )}
            />
            {paused ? 'Paused · ' : 'Attached to '}
            <span className="text-secondary">{attachedTabTitle}</span>
          </div>
        )}

        {lastError && (
          <div className="text-xs text-danger break-words">{lastError}</div>
        )}
      </div>

      {/* Tab picker overlay */}
      {pickerOpen && (
        <div className="border-b border-border bg-bg-secondary">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-muted uppercase">Pick a tab</span>
            <button
              onClick={refreshTabs}
              className="text-xs text-secondary hover:text-primary inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
          <div className="max-h-48 overflow-auto">
            {tabs.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted text-center">No tabs available.</div>
            ) : (
              tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => attach(tab.id)}
                  className="w-full text-left px-3 py-1.5 hover:bg-bg flex items-center gap-2"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-sm bg-border shrink-0 bg-center bg-no-repeat bg-contain"
                    style={tab.favIconUrl ? { backgroundImage: `url(${JSON.stringify(tab.favIconUrl)})` } : undefined}
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-primary truncate">{tab.title || tab.url}</div>
                    <div className="text-[11px] text-muted truncate font-mono">{tab.url}</div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-border">
            <button
              onClick={() => setPickerOpen(false)}
              className="text-xs text-muted hover:text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {captures.length > 0 && (
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by URL, method, status…"
              className="w-full pl-8 pr-7 py-1.5 text-sm rounded-md border border-border bg-bg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                aria-label="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-2">
        {captures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4">
            <h3 className="text-sm font-medium text-primary mb-1">
              {status === 'attached' ? 'Listening…' : 'Not attached'}
            </h3>
            <p className="text-xs text-secondary max-w-[220px]">
              {status === 'attached'
                ? 'Interact with the attached tab — captured requests will stream in here.'
                : 'Click Attach tab to start capturing network traffic from another tab.'}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4">
            <h3 className="text-sm font-medium text-primary mb-1">No matches</h3>
            <p className="text-xs text-secondary">
              {captures.length} captured · 0 match <span className="font-mono">&quot;{filter}&quot;</span>
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {renderGrouped(filtered, (entry) => (
              <div key={entry.requestId} className="group flex items-stretch">
                <div className="flex-1 min-w-0" onDoubleClick={() => loadInExplorer(entry)}>
                  <DebuggerItem
                    entry={entry}
                    isActive={selectedRequestId === entry.requestId}
                    onClick={() => setSelected(entry.requestId)}
                  />
                </div>
                <button
                  onClick={() => loadInExplorer(entry)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-accent hover:underline px-2 transition-opacity"
                  title="Load this request into the Explorer composer"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
