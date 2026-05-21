'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'cmdk';
import {
  Send,
  X,
  Save,
  Share2,
  Code2,
  Trash2,
  History as HistoryIcon,
  Activity,
  Settings,
  Sun,
  Moon,
  Palette,
  Upload,
  FolderOpen,
  Globe,
  Zap,
} from 'lucide-react';
import { useRequestStore } from '../../stores/use-request-store';
import { useCollectionsStore } from '../../stores/use-collections-store';
import { useHistoryStore } from '../../stores/use-history-store';
import { useDebuggerStore } from '../../stores/use-debugger-store';
import { useEnvironmentStore } from '../../stores/use-environment-store';
import { useResponseStore } from '../../stores/use-response-store';
import { useUIStore } from '../../stores/use-ui-store';
import { useToastStore } from '../../stores/use-toast-store';
import { useInlineSendStore } from '../../stores/use-inline-send-store';
import { useTheme } from '../../contexts/theme-context';
import { useRequest } from '../../hooks/use-request';
import { generateShareableLink } from '../../utils/sharing';
import { toCurl } from '../../utils/snippets';
import { sendRequest, type HttpMethod } from '../../utils/http';
import { parseQuickRequest } from '../../utils/parse-quick-request';
import { methodPillColor } from '../request/method-selector';
import { PaletteInlineResult } from './palette-inline-result';
import { cn } from '../../utils/cn';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const truncate = (s: string, n: number) =>
  s.length > n ? s.slice(0, n - 1) + '…' : s;

export const CommandPalette = ({ open, onClose }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const inlineStore = useInlineSendStore();
  const setSidebarSection = useUIStore((s) => s.setSidebarSection);

  useEffect(() => {
    if (open) {
      setQuery('');
      inlineStore.clear();
    } else {
      // Abort any in-flight inline send when closing.
      abortRef.current?.abort();
      abortRef.current = null;
    }
    // inlineStore is a stable zustand instance; we intentionally omit it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const quick = useMemo(() => parseQuickRequest(query), [query]);

  const runQuickSend = async () => {
    if (!quick) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    inlineStore.setPending(quick);
    try {
      const response = await sendRequest(
        { method: quick.method, url: quick.url, headers: {} },
        controller.signal
      );
      if (controller.signal.aborted) return;
      inlineStore.setCurrent(quick.method, quick.url, response);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Request failed';
      inlineStore.setError(message);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <Command
        loop
        label="Command Palette"
        className="relative z-10 w-full max-w-xl rounded-lg border border-border bg-bg shadow-2xl overflow-hidden"
      >
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Type a URL to send, or search commands…"
          className="w-full px-4 py-3 text-sm bg-transparent border-0 border-b border-border text-primary placeholder:text-muted focus:outline-none"
        />
        <Command.List className="max-h-[55vh] overflow-auto py-1">
          {quick && (
            <Command.Group heading={<GroupHeading>Quick send</GroupHeading>}>
              <Command.Item
                value={`__quicksend ${quick.method} ${quick.url}`}
                onSelect={runQuickSend}
                className="mx-1 my-0.5 px-3 py-2 rounded-md text-sm flex items-center gap-3 cursor-pointer aria-selected:bg-bg-secondary text-secondary aria-selected:text-primary"
              >
                <Zap className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="flex-1 min-w-0 inline-flex items-center gap-2">
                  <MethodPill method={quick.method} />
                  <span className="truncate font-mono text-xs">{quick.url}</span>
                </span>
                <Kbd>↵</Kbd>
              </Command.Item>
            </Command.Group>
          )}
          <Command.Empty className="px-4 py-6 text-xs text-muted text-center">
            No matches for &quot;{query}&quot;
          </Command.Empty>
          <PaletteSections onClose={onClose} />
        </Command.List>
        <PaletteInlineResult
          onDismiss={() => {
            abortRef.current?.abort();
            inlineStore.clear();
          }}
          onPromote={() => {
            inlineStore.clear();
            onClose();
            setSidebarSection('collections');
          }}
        />
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-bg-secondary text-[10px] text-muted">
          <span className="inline-flex items-center gap-3">
            <Kbd>↑↓</Kbd>
            <Kbd>↵</Kbd>
            <Kbd>esc</Kbd>
          </span>
          <span>JUSTAPI</span>
        </div>
      </Command>
    </div>
  );
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-1 py-0.5 rounded border border-border bg-bg font-mono text-[10px] text-secondary">
    {children}
  </kbd>
);

interface SectionProps {
  onClose: () => void;
}

const PaletteSections = ({ onClose }: SectionProps) => {
  const { send, cancel } = useRequest();
  const loading = useResponseStore((s) => s.loading);
  const requestStore = useRequestStore();
  const collections = useCollectionsStore((s) => s.items);
  const setActiveCollectionId = useCollectionsStore((s) => s.setActiveCollectionId);
  const history = useHistoryStore((s) => s.items);
  const captures = useDebuggerStore((s) => s.captures);
  const setDebugSelected = useDebuggerStore((s) => s.setSelected);
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvId = useEnvironmentStore((s) => s.activeEnvironmentId);
  const setActiveEnvId = useEnvironmentStore((s) => s.setActiveEnvironmentId);
  const setSidebarSection = useUIStore((s) => s.setSidebarSection);
  const { showToast } = useToastStore();
  const { mode, toggleMode, themes, themeId, setThemeId } = useTheme();

  const run = (fn: () => void) => () => {
    onClose();
    setTimeout(fn, 0);
  };

  const handleSend = run(send);
  const handleCancel = run(cancel);

  const handleCopyCurl = run(async () => {
    const r = requestStore;
    const headers: Record<string, string> = {};
    r.headers
      .filter((h) => h.enabled && h.key)
      .forEach((h) => (headers[h.key] = h.value));
    const code = toCurl({
      method: r.method,
      url: r.url,
      headers,
      body: r.body || undefined,
    });
    try {
      await navigator.clipboard.writeText(code);
      showToast('success', 'Copied as cURL');
    } catch {
      showToast('error', 'Clipboard unavailable');
    }
  });

  const handleCopyShare = run(async () => {
    try {
      const link = await generateShareableLink();
      await navigator.clipboard.writeText(link);
      showToast('success', 'Share link copied');
    } catch {
      showToast('error', 'Failed to copy share link');
    }
  });

  const handleClear = run(() => {
    requestStore.reset();
    showToast('info', 'Request reset');
  });

  const loadCollection = (id: string) => run(() => {
    const item = collections.find((c) => c.id === id);
    if (!item) return;
    requestStore.setMethod(item.method);
    requestStore.setUrl(item.url);
    requestStore.setParams(item.params);
    requestStore.setHeaders(item.headers);
    requestStore.setBodyType(item.bodyType);
    requestStore.setBody(item.body);
    requestStore.setAuthType(item.authType);
    requestStore.setAuthConfig(item.authConfig);
    setActiveCollectionId(id);
  });

  const loadHistory = (url: string, method: HttpMethod) => run(() => {
    requestStore.setMethod(method);
    requestStore.setUrl(url);
    setActiveCollectionId(null);
  });

  const jumpToCapture = (id: string) => run(() => {
    setDebugSelected(id);
  });

  const recentHistory = useMemo(() => history.slice(0, 8), [history]);
  const recentCaptures = useMemo(() => [...captures].reverse().slice(0, 8), [captures]);

  return (
    <>
      <Command.Group heading={<GroupHeading>Actions</GroupHeading>}>
        {loading ? (
          <Item icon={<X className="w-3.5 h-3.5 text-danger" />} label="Cancel request" onSelect={handleCancel} shortcut="⌘ ⏎" />
        ) : (
          <Item
            icon={<Send className="w-3.5 h-3.5 text-accent" />}
            label="Send request"
            onSelect={handleSend}
            shortcut="⌘ ⏎"
            disabled={!requestStore.url.trim()}
          />
        )}
        <Item icon={<Code2 className="w-3.5 h-3.5" />} label="Copy as cURL" onSelect={handleCopyCurl} />
        <Item icon={<Share2 className="w-3.5 h-3.5" />} label="Copy share link" onSelect={handleCopyShare} />
        <Item icon={<Save className="w-3.5 h-3.5" />} label="Open Collections" onSelect={run(() => setSidebarSection('collections'))} />
        <Item icon={<Trash2 className="w-3.5 h-3.5" />} label="Reset current request" onSelect={handleClear} />
      </Command.Group>

      {collections.length > 0 && (
        <Command.Group heading={<GroupHeading>Collections · {collections.length}</GroupHeading>}>
          {collections.map((c) => (
            <Item
              key={c.id}
              icon={<MethodPill method={c.method} />}
              label={c.name}
              secondary={truncate(c.url, 60)}
              onSelect={loadCollection(c.id)}
              keywords={[c.method, c.url]}
            />
          ))}
        </Command.Group>
      )}

      {recentHistory.length > 0 && (
        <Command.Group heading={<GroupHeading>History · last {recentHistory.length}</GroupHeading>}>
          {recentHistory.map((h) => (
            <Item
              key={h.id}
              icon={<MethodPill method={h.method} />}
              label={truncate(h.url, 60)}
              secondary={`${h.status} · ${timeAgo(h.timestamp)}`}
              onSelect={loadHistory(h.url, h.method)}
              keywords={[h.method, h.url, String(h.status)]}
            />
          ))}
        </Command.Group>
      )}

      {recentCaptures.length > 0 && (
        <Command.Group heading={<GroupHeading>Captures · last {recentCaptures.length}</GroupHeading>}>
          {recentCaptures.map((c) => (
            <Item
              key={c.requestId}
              icon={<MethodPill method={c.method as HttpMethod} />}
              label={truncate(new URL(c.url, 'http://x').pathname || c.url, 60)}
              secondary={`${c.status || '—'} · ${c.timeMs}ms`}
              onSelect={jumpToCapture(c.requestId)}
              keywords={[c.method, c.url, String(c.status)]}
            />
          ))}
        </Command.Group>
      )}

      <Command.Group heading={<GroupHeading>Environment</GroupHeading>}>
        {environments.map((e) => (
          <Item
            key={e.id}
            icon={<Globe className="w-3.5 h-3.5" />}
            label={e.name}
            secondary={
              activeEnvId === e.id
                ? 'Active'
                : `${Object.keys(e.variables).length} variable${Object.keys(e.variables).length === 1 ? '' : 's'}`
            }
            onSelect={run(() => setActiveEnvId(e.id))}
            keywords={['env', 'environment', e.name]}
          />
        ))}
      </Command.Group>

      <Command.Group heading={<GroupHeading>Theme</GroupHeading>}>
        <Item
          icon={mode === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          onSelect={run(toggleMode)}
          keywords={['light', 'dark', 'mode']}
        />
        {themes.map((t) => (
          <Item
            key={t.id}
            icon={<Palette className="w-3.5 h-3.5" />}
            label={`Theme: ${t.label}`}
            secondary={themeId === t.id ? 'Active' : t.description}
            onSelect={run(() => setThemeId(t.id))}
            keywords={['theme', 'palette', t.label]}
          />
        ))}
      </Command.Group>

      <Command.Group heading={<GroupHeading>Navigate</GroupHeading>}>
        <Item icon={<FolderOpen className="w-3.5 h-3.5" />} label="Show Collections" onSelect={run(() => setSidebarSection('collections'))} />
        <Item icon={<Activity className="w-3.5 h-3.5" />} label="Show Debug" onSelect={run(() => setSidebarSection('debug'))} />
        <Item icon={<HistoryIcon className="w-3.5 h-3.5" />} label="Show History" onSelect={run(() => setSidebarSection('history'))} />
        <Item icon={<Upload className="w-3.5 h-3.5" />} label="Import HAR…" onSelect={run(() => {
          setSidebarSection('debug');
          showToast('info', 'Use the upload button in the Debug panel');
        })} />
        <Item icon={<Settings className="w-3.5 h-3.5" />} label="Open Settings" onSelect={run(() => {
          // Settings modal is in the sidebar; just direct the user there.
          showToast('info', 'Open the gear icon in the sidebar');
        })} />
      </Command.Group>
    </>
  );
};

const GroupHeading = ({ children }: { children: React.ReactNode }) => (
  <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-medium text-muted">
    {children}
  </div>
);

interface ItemProps {
  icon: React.ReactNode;
  label: string;
  secondary?: string;
  shortcut?: string;
  onSelect: () => void;
  disabled?: boolean;
  keywords?: string[];
}

const Item = ({ icon, label, secondary, shortcut, onSelect, disabled, keywords }: ItemProps) => (
  <Command.Item
    value={[label, ...(keywords || [])].join(' ')}
    onSelect={onSelect}
    disabled={disabled}
    className={cn(
      'mx-1 my-0.5 px-3 py-2 rounded-md text-sm flex items-center gap-3 cursor-pointer',
      'aria-selected:bg-bg-secondary aria-selected:text-primary',
      'text-secondary'
    )}
  >
    <span className="shrink-0 inline-flex items-center justify-center w-5">
      {icon}
    </span>
    <span className="flex-1 min-w-0 truncate">{label}</span>
    {secondary && (
      <span className="text-[11px] text-muted shrink-0 truncate max-w-[40%]">
        {secondary}
      </span>
    )}
    {shortcut && (
      <span className="text-[10px] text-muted shrink-0">{shortcut}</span>
    )}
  </Command.Item>
);

const MethodPill = ({ method }: { method: HttpMethod }) => (
  <span
    className={cn(
      'px-1 py-px rounded text-[9px] font-semibold leading-tight',
      methodPillColor[method] || 'bg-bg-secondary text-muted'
    )}
  >
    {method}
  </span>
);

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
