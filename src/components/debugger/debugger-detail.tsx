'use client';

import { useState } from 'react';
import { X, Save, RotateCw } from 'lucide-react';
import { useDebuggerStore } from '../../stores/use-debugger-store';
import { useRequestStore } from '../../stores/use-request-store';
import { useCollectionsStore } from '../../stores/use-collections-store';
import { useToastStore } from '../../stores/use-toast-store';
import { useRequest } from '../../hooks/use-request';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { StatusBadge } from '../ui/status-badge';
import { methodPillColor } from '../request/method-selector';
import { HttpMethod } from '../../utils/http';
import { cn } from '../../utils/cn';
import type { CapturedRequest } from '../../utils/extension-bridge';

type DetailTab = 'request' | 'response';

type RequestFields = {
  method: HttpMethod;
  url: string;
  params: Array<{ id: string; key: string; value: string; enabled: boolean }>;
  headers: Array<{ id: string; key: string; value: string; enabled: boolean }>;
  bodyType: 'none' | 'json' | 'raw' | 'form-data';
  body: string;
};

function captureToRequestFields(entry: CapturedRequest): RequestFields {
  const baseUrl = entry.url.includes('?') ? entry.url.split('?')[0] : entry.url;
  const params: RequestFields['params'] = [];
  try {
    const u = new URL(entry.url);
    let i = 0;
    u.searchParams.forEach((value, name) => {
      params.push({ id: String(i++), key: name, value, enabled: true });
    });
  } catch {
    // invalid URL — leave params empty
  }

  const headers: RequestFields['headers'] = Object.entries(
    entry.requestHeaders
  ).map(([k, v], i) => ({
    id: String(i),
    key: k,
    value: String(v),
    enabled: true,
  }));

  let bodyType: RequestFields['bodyType'] = 'none';
  if (entry.requestBody) {
    const ct =
      headers.find((h) => h.key.toLowerCase() === 'content-type')?.value || '';
    if (ct.includes('application/json')) bodyType = 'json';
    else if (ct.includes('multipart/form-data')) bodyType = 'form-data';
    else bodyType = 'raw';
  }

  return {
    method: entry.method as HttpMethod,
    url: baseUrl,
    params,
    headers,
    bodyType,
    body: entry.requestBody || '',
  };
}

function defaultSaveName(entry: CapturedRequest): string {
  try {
    const u = new URL(entry.url);
    return `${entry.method} ${u.pathname}`;
  } catch {
    return `${entry.method} ${entry.url}`;
  }
}

export const DebuggerDetail = () => {
  const { captures, selectedRequestId, setSelected, setReplayOriginal } =
    useDebuggerStore();
  const requestStore = useRequestStore();
  const { setActiveCollectionId, addItem } = useCollectionsStore();
  const { showToast } = useToastStore();
  const { send } = useRequest();
  const [tab, setTab] = useState<DetailTab>('request');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const entry = captures.find((c) => c.requestId === selectedRequestId);
  if (!entry) return null;

  const close = () => setSelected(null);

  const applyToExplorer = (capture: CapturedRequest) => {
    const fields = captureToRequestFields(capture);
    requestStore.setMethod(fields.method);
    requestStore.setUrl(fields.url);
    requestStore.setParams(fields.params);
    requestStore.setHeaders(fields.headers);
    requestStore.setBodyType(fields.bodyType);
    requestStore.setBody(fields.body);
    requestStore.setAuthType('none');
    requestStore.setAuthConfig({});
    setActiveCollectionId(null);
    setReplayOriginal(capture);
  };

  const loadInExplorer = () => {
    applyToExplorer(entry);
    setSelected(null);
  };

  const replayNow = async () => {
    applyToExplorer(entry);
    setSelected(null);
    // Defer to next tick so the request store has applied before send reads it.
    setTimeout(() => send(), 0);
  };

  const openSaveModal = () => {
    setSaveName(defaultSaveName(entry));
    setSaveModalOpen(true);
  };

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;
    const fields = captureToRequestFields(entry);
    addItem({
      name,
      method: fields.method,
      url: fields.url,
      params: fields.params,
      headers: fields.headers,
      bodyType: fields.bodyType,
      body: fields.body,
      authType: 'none',
      authConfig: {},
    });
    setSaveModalOpen(false);
    showToast('success', `Saved "${name}" to Collections`);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        entry={entry}
        onClose={close}
        onLoad={loadInExplorer}
        onReplay={replayNow}
        onSave={openSaveModal}
      />

      <div className="flex border-b border-border">
        {(['request', 'response'] as DetailTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t ? 'border-accent text-primary' : 'border-transparent text-secondary hover:text-primary'
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {tab === 'request' ? <RequestTab entry={entry} /> : <ResponseTab entry={entry} />}
      </div>

      <Modal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save to Collections"
        size="sm"
      >
        <div className="space-y-3">
          <Input
            label="Request Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="My API Request"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!saveName.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const Header = ({
  entry,
  onClose,
  onLoad,
  onReplay,
  onSave,
}: {
  entry: CapturedRequest;
  onClose: () => void;
  onLoad: () => void;
  onReplay: () => void;
  onSave: () => void;
}) => (
  <div className="px-4 py-3 border-b border-border flex items-center gap-3">
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0',
        methodPillColor[entry.method as HttpMethod] || 'bg-bg-secondary text-muted'
      )}
    >
      {entry.method}
    </span>
    <span className="flex-1 truncate font-mono text-sm text-primary" title={entry.url}>
      {entry.url}
    </span>
    {entry.status > 0 && <StatusBadge status={entry.status} />}
    {entry.timeMs > 0 && <span className="text-xs text-muted shrink-0">{entry.timeMs}ms</span>}
    <Button variant="ghost" size="sm" onClick={onSave} title="Save to Collections">
      <Save className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={onReplay} title="Replay now (load + send)">
      <RotateCw className="w-4 h-4" />
    </Button>
    <Button variant="primary" size="sm" onClick={onLoad}>
      Load in Explorer
    </Button>
    <Button variant="ghost" size="sm" onClick={onClose} className="w-7 h-7 p-0" aria-label="Close detail">
      <X className="w-4 h-4" />
    </Button>
  </div>
);

const RequestTab = ({ entry }: { entry: CapturedRequest }) => (
  <>
    <Section title="Headers">
      <KV obj={entry.requestHeaders} />
    </Section>
    {entry.requestBody && (
      <Section title="Body">
        <Code>{entry.requestBody}</Code>
      </Section>
    )}
    {entry.initiator && (
      <Section title="Initiator">
        <Code>{entry.initiator}</Code>
      </Section>
    )}
  </>
);

const ResponseTab = ({ entry }: { entry: CapturedRequest }) => (
  <>
    {entry.failed && (
      <div className="text-sm text-danger">{entry.errorText || 'Request failed'}</div>
    )}
    <Section title="Headers">
      <KV obj={entry.responseHeaders} />
    </Section>
    <Section title="Body">
      <Code>{formatBody(entry.responseBody, entry.mimeType)}</Code>
    </Section>
  </>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{title}</h3>
    {children}
  </div>
);

const KV = ({ obj }: { obj: Record<string, string> }) => {
  const entries = Object.entries(obj || {});
  if (entries.length === 0) return <div className="text-xs text-muted">No headers</div>;
  return (
    <div className="grid grid-cols-[minmax(140px,_25%)_1fr] gap-x-4 gap-y-1 font-mono text-xs">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <div className="text-secondary break-all">{k}</div>
          <div className="text-primary break-all">{v}</div>
        </div>
      ))}
    </div>
  );
};

const Code = ({ children }: { children: React.ReactNode }) => (
  <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-bg-secondary border border-border rounded-md p-3 text-primary max-h-[60vh] overflow-auto">
    {children || <span className="text-muted">(empty)</span>}
  </pre>
);

function formatBody(body: string, mimeType: string): string {
  if (!body) return '';
  if (mimeType.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}
