'use client';

import { useMemo } from 'react';
import { Loader2, X, AlertTriangle, ArrowRight } from 'lucide-react';
import type { HttpMethod, HttpResponse } from '../../utils/http';
import { useInlineSendStore } from '../../stores/use-inline-send-store';
import { useRequestStore } from '../../stores/use-request-store';
import { methodPillColor } from '../request/method-selector';
import { StatusBadge } from '../ui/status-badge';
import { cn } from '../../utils/cn';

interface PaletteInlineResultProps {
  onDismiss: () => void;
  onPromote: () => void;
}

const previewLines = (body: string, max = 12): string => {
  const lines = body.split('\n');
  if (lines.length <= max) return body;
  return lines.slice(0, max).join('\n') + `\n… +${lines.length - max} more lines`;
};

const formatBody = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return `(${data.byteLength} byte binary response)`;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const summarizeDrift = (prev: HttpResponse, next: HttpResponse): string | null => {
  if (prev.status !== next.status) {
    return `Status ${prev.status} → ${next.status}`;
  }
  const prevKeys = topLevelKeys(prev.data);
  const nextKeys = topLevelKeys(next.data);
  if (prevKeys && nextKeys) {
    const added = nextKeys.filter((k) => !prevKeys.includes(k));
    const removed = prevKeys.filter((k) => !nextKeys.includes(k));
    if (added.length || removed.length) {
      const parts: string[] = [];
      if (added.length) parts.push(`+ ${added.slice(0, 3).join(', ')}`);
      if (removed.length) parts.push(`− ${removed.slice(0, 3).join(', ')}`);
      return `Shape changed: ${parts.join(' · ')}`;
    }
  }
  if (prev.size !== next.size) {
    const delta = next.size - prev.size;
    return `Size ${delta >= 0 ? '+' : ''}${delta} B`;
  }
  return null;
};

function topLevelKeys(data: unknown): string[] | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return Object.keys(data as Record<string, unknown>);
}

export const PaletteInlineResult = ({ onDismiss, onPromote }: PaletteInlineResultProps) => {
  const pending = useInlineSendStore((s) => s.pending);
  const current = useInlineSendStore((s) => s.current);
  const error = useInlineSendStore((s) => s.error);
  const getPrior = useInlineSendStore((s) => s.getPrior);

  const prior = useMemo(() => {
    if (pending) return getPrior(pending.method, pending.url);
    if (current) return getPrior(current.method, current.url);
    return undefined;
  }, [pending, current, getPrior]);

  if (!pending && !current && !error) return null;

  const target = pending || current!;
  const drift =
    current && prior && current.response !== prior
      ? summarizeDrift(prior, current.response)
      : null;

  return (
    <div className="border-t border-border bg-bg-secondary/40">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <MethodPill method={target.method} />
        <span className="flex-1 min-w-0 truncate font-mono text-xs text-primary" title={target.url}>
          {target.url}
        </span>
        {pending && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />}
        {current && <StatusBadge status={current.response.status} />}
        {current && (
          <span className="text-[11px] text-muted tabular-nums">
            {current.response.time}ms
          </span>
        )}
        <button
          onClick={onDismiss}
          className="p-1 rounded text-muted hover:text-primary hover:bg-bg"
          aria-label="Dismiss"
          title="Dismiss (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 flex items-center gap-2 text-xs text-danger">
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {drift && (
        <div className="px-3 py-1.5 text-[11px] text-warning bg-warning/5 border-b border-warning/20">
          {drift}
          {prior && (
            <span className="text-muted ml-1.5">(was {prior.status})</span>
          )}
        </div>
      )}

      {current && (
        <>
          <div className="px-3 py-2 max-h-[35vh] overflow-auto">
            <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-primary leading-relaxed">
              {previewLines(formatBody(current.response.data))}
            </pre>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-[10px] text-muted">
            <span>
              {prior && !drift ? 'Identical to last call.' : prior ? '' : 'First time hitting this endpoint.'}
            </span>
            <button
              onClick={() => {
                const r = useRequestStore.getState();
                r.setMethod(target.method);
                r.setUrl(target.url);
                onPromote();
              }}
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              Open in composer
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const MethodPill = ({ method }: { method: HttpMethod }) => (
  <span
    className={cn(
      'px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0',
      methodPillColor[method] || 'bg-bg-secondary text-muted'
    )}
  >
    {method}
  </span>
);
