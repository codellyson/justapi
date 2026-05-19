'use client';

import { useEffect, useMemo, useState } from 'react';
import { useResponseStore } from '../../stores/use-response-store';
import { useDebuggerStore } from '../../stores/use-debugger-store';
import { ResponseMeta } from './response-meta';
import { ResponseBody } from './response-body';
import { ResponseHeaders } from './response-headers';
import { ResponseCookies } from './response-cookies';
import { Tabs as TabStrip, type TabItem } from '../ui/tabs';
import { StatusBadge } from '../ui/status-badge';
import { cn } from '../../utils/cn';
import { lineDiff, pretty, shouldDiff } from '../../utils/diff';
import { Loader2, Send, AlertTriangle } from 'lucide-react';
import type { HttpResponse } from '../../utils/http';
import type { CapturedRequest } from '../../utils/extension-bridge';

type Tab = 'body' | 'headers' | 'cookies' | 'diff';
type Source = 'live' | 'captured';

export const ResponsePanel = () => {
  const { response, loading, error } = useResponseStore();
  const replayOriginal = useDebuggerStore((s) => s.replayOriginal);
  const [activeTab, setActiveTab] = useState<Tab>('body');
  const [source, setSource] = useState<Source>('live');

  // When a new live response arrives during a replay, snap back to "live".
  useEffect(() => {
    if (response) setSource('live');
  }, [response]);

  // If user switches away from Diff tab and then loses the replay context,
  // bounce back to Body so they don't get stuck on a hidden tab.
  useEffect(() => {
    if (activeTab === 'diff' && !(response && replayOriginal)) {
      setActiveTab('body');
    }
  }, [activeTab, response, replayOriginal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <p className="text-sm text-secondary">Sending request…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full px-6">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <p className="text-sm text-danger font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!response) {
    if (replayOriginal) {
      return (
        <div className="flex flex-col h-full">
          <ReplayBanner replayOriginal={replayOriginal} response={null} source={source} setSource={setSource} />
          <CapturedView entry={replayOriginal} activeTab={activeTab} setActiveTab={setActiveTab} canDiff={false} />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-bg-secondary border border-border flex items-center justify-center">
            <Send className="w-4 h-4 text-muted" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary">No response yet</p>
            <p className="text-xs text-muted">
              Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-bg-secondary font-mono text-[10px]">⌘ Enter</kbd> or click Send
            </p>
          </div>
        </div>
      </div>
    );
  }

  const canDiff = !!replayOriginal;

  return (
    <div className="flex flex-col h-full">
      {replayOriginal && (
        <ReplayBanner replayOriginal={replayOriginal} response={response} source={source} setSource={setSource} />
      )}

      {source === 'live' ? (
        <>
          <ResponseMeta response={response} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs active={activeTab} onChange={setActiveTab} canDiff={canDiff} response={response} />
            <div className="flex-1 overflow-auto">
              {activeTab === 'body' && <ResponseBody response={response} />}
              {activeTab === 'headers' && <ResponseHeaders response={response} />}
              {activeTab === 'cookies' && <ResponseCookies response={response} />}
              {activeTab === 'diff' && replayOriginal && (
                <DiffView captured={replayOriginal} response={response} />
              )}
            </div>
          </div>
        </>
      ) : (
        <CapturedView
          entry={replayOriginal!}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          canDiff={canDiff}
          response={response}
        />
      )}
    </div>
  );
};

const Tabs = ({
  active,
  onChange,
  canDiff,
  response,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  canDiff: boolean;
  response?: HttpResponse | null;
}) => {
  const headerCount = response ? Object.keys(response.headers).length : 0;
  const cookieCount = response?.cookies?.length || 0;
  const items: TabItem<Tab>[] = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers', badge: headerCount || undefined },
    { id: 'cookies', label: 'Cookies', badge: cookieCount || undefined },
  ];
  if (canDiff) items.push({ id: 'diff', label: 'Diff' });
  return <TabStrip items={items} active={active} onChange={onChange} />;
};

interface ReplayBannerProps {
  replayOriginal: CapturedRequest;
  response: HttpResponse | null;
  source: Source;
  setSource: (s: Source) => void;
}

const ReplayBanner = ({ replayOriginal, response, source, setSource }: ReplayBannerProps) => {
  const liveDiff = response
    ? response.status === replayOriginal.status
      ? null
      : `was ${replayOriginal.status}, now ${response.status}`
    : null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-bg-secondary text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted shrink-0">Comparing replay vs captured</span>
        {liveDiff && <span className="text-warning truncate">· {liveDiff}</span>}
      </div>
      <div className="inline-flex p-0.5 bg-bg rounded-md border border-border shrink-0">
        <button
          onClick={() => setSource('live')}
          className={cn(
            'px-2.5 py-0.5 text-xs font-medium rounded transition-colors',
            source === 'live' ? 'bg-bg-secondary text-primary' : 'text-secondary hover:text-primary',
            !response && 'opacity-50 cursor-not-allowed'
          )}
          disabled={!response}
          title={response ? 'Show replayed response' : 'No replay yet — click Send'}
        >
          Replayed
        </button>
        <button
          onClick={() => setSource('captured')}
          className={cn(
            'px-2.5 py-0.5 text-xs font-medium rounded transition-colors',
            source === 'captured' ? 'bg-bg-secondary text-primary' : 'text-secondary hover:text-primary'
          )}
        >
          Captured
        </button>
      </div>
    </div>
  );
};

interface CapturedViewProps {
  entry: CapturedRequest;
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  canDiff: boolean;
  response?: HttpResponse;
}

const CapturedView = ({ entry, activeTab, setActiveTab, canDiff, response }: CapturedViewProps) => {
  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-bg-secondary">
        <StatusBadge status={entry.status} />
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span>{entry.timeMs}ms</span>
          <span className="text-muted">·</span>
          <span>{formatSize(entry.size)}</span>
          <span className="text-muted">·</span>
          <span>{Object.keys(entry.responseHeaders).length} headers</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs active={activeTab} onChange={setActiveTab} canDiff={canDiff} />
        <div className="flex-1 overflow-auto px-3 py-3">
          {activeTab === 'body' && (
            <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-bg-secondary border border-border rounded-md p-3 text-primary">
              {pretty(entry.responseBody, entry.mimeType) || (
                <span className="text-muted">(empty)</span>
              )}
            </pre>
          )}
          {activeTab === 'headers' && (
            <div className="grid grid-cols-[minmax(140px,_25%)_1fr] gap-x-4 gap-y-1 font-mono text-xs">
              {Object.entries(entry.responseHeaders).map(([k, v]) => (
                <div key={k} className="contents">
                  <div className="text-secondary break-all">{k}</div>
                  <div className="text-primary break-all">{v}</div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'diff' && response && (
            <DiffView captured={entry} response={response} />
          )}
        </div>
      </div>
    </>
  );
};

interface DiffViewProps {
  captured: CapturedRequest;
  response: HttpResponse;
}

const DiffView = ({ captured, response }: DiffViewProps) => {
  const capturedBody = useMemo(
    () => pretty(captured.responseBody || '', captured.mimeType || ''),
    [captured]
  );
  const liveBody = useMemo(() => {
    const ct = response.headers['content-type'] || response.headers['Content-Type'] || '';
    const text =
      typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);
    return pretty(text, ct);
  }, [response]);

  if (!shouldDiff(capturedBody, liveBody)) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-warning">
          Bodies are too large for a line diff. Showing side-by-side instead.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Pane title="Captured" body={capturedBody} />
          <Pane title="Replayed" body={liveBody} />
        </div>
      </div>
    );
  }

  const lines = lineDiff(capturedBody, liveBody);
  const hasChanges = lines.some((l) => l.type !== 'same');

  if (!hasChanges) {
    return (
      <p className="text-xs text-muted px-2 py-3">
        Captured and replayed response bodies are identical.
      </p>
    );
  }

  return (
    <div className="text-xs font-mono leading-relaxed bg-bg-secondary border border-border rounded-md overflow-hidden">
      {lines.map((l, i) => (
        <div
          key={i}
          className={cn(
            'flex items-start gap-2 px-3 py-0.5',
            l.type === 'del' && 'bg-danger/10 text-danger',
            l.type === 'add' && 'bg-success/10 text-success'
          )}
        >
          <span className="w-3 shrink-0 text-center select-none opacity-60">
            {l.type === 'del' ? '-' : l.type === 'add' ? '+' : ' '}
          </span>
          <span className="whitespace-pre-wrap break-words">{l.line}</span>
        </div>
      ))}
    </div>
  );
};

const Pane = ({ title, body }: { title: string; body: string }) => (
  <div className="space-y-1">
    <div className="text-[10px] uppercase tracking-wide text-muted">{title}</div>
    <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-bg-secondary border border-border rounded-md p-3 text-primary max-h-[50vh] overflow-auto">
      {body || <span className="text-muted">(empty)</span>}
    </pre>
  </div>
);

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
