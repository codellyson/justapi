'use client';

import { cn } from '../../utils/cn';
import { methodPillColor } from '../request/method-selector';
import { HttpMethod } from '../../utils/http';
import type { CapturedRequest } from '../../utils/extension-bridge';

interface DebuggerItemProps {
  entry: CapturedRequest;
  isActive: boolean;
  onClick: () => void;
}

export const DebuggerItem = ({ entry, isActive, onClick }: DebuggerItemProps) => {
  const statusBucket = entry.failed ? '5' : String(entry.status)[0] || '0';
  const statusClass =
    statusBucket === '2'
      ? 'text-success'
      : statusBucket === '3'
      ? 'text-accent'
      : statusBucket === '4'
      ? 'text-warning'
      : statusBucket === '5'
      ? 'text-danger'
      : 'text-muted';

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
        isActive ? 'bg-accent/10' : 'hover:bg-bg-secondary'
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          'px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0',
          methodPillColor[entry.method as HttpMethod] || 'bg-bg-secondary text-muted'
        )}
      >
        {entry.method}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-primary truncate font-mono">{displayUrl(entry.url)}</div>
        <div className="text-[11px] text-muted flex gap-2">
          <span>{entry.resourceType}</span>
          {entry.timeMs > 0 && <span>{entry.timeMs}ms</span>}
          {entry.size > 0 && <span>{formatSize(entry.size)}</span>}
        </div>
      </div>
      <span className={cn('text-xs font-semibold font-mono', statusClass)}>
        {entry.failed ? '✕' : entry.status || '…'}
      </span>
    </div>
  );
};

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
