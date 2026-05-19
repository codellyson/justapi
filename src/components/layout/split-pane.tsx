'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

const STORAGE_PREFIX = 'justapi-split-';
const MIN_PCT = 20;
const MAX_PCT = 80;
const LG_QUERY = '(min-width: 1024px)';

interface SplitPaneProps {
  storageKey: string;
  defaultLeftPercent?: number;
  className?: string;
  children: [ReactNode, ReactNode];
}

/**
 * Resizable horizontal split for lg+ viewports, persisted to localStorage.
 * On smaller screens it collapses to a vertical stack with no divider.
 */
export const SplitPane = ({
  storageKey,
  defaultLeftPercent = 40,
  className,
  children,
}: SplitPaneProps) => {
  const [leftPct, setLeftPct] = useState(defaultLeftPercent);
  const [isLg, setIsLg] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Load persisted split + listen for breakpoint changes.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= MIN_PCT && parsed <= MAX_PCT) {
        setLeftPct(parsed);
      }
    }
    const mq = window.matchMedia(LG_QUERY);
    const handler = () => setIsLg(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [storageKey]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
    setLeftPct(clamped);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem(STORAGE_PREFIX + storageKey, String(leftPct));
  }, [leftPct, storageKey]);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onDoubleClick = () => {
    setLeftPct(defaultLeftPercent);
    localStorage.setItem(STORAGE_PREFIX + storageKey, String(defaultLeftPercent));
  };

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col lg:flex-row overflow-hidden', className)}
    >
      <div
        className="flex flex-col overflow-hidden min-h-0 border-b border-border lg:border-b-0 lg:border-r flex-1 lg:flex-none"
        style={isLg ? { width: `${leftPct}%` } : undefined}
      >
        {children[0]}
      </div>
      <div
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        className="hidden lg:block w-1 cursor-col-resize bg-border hover:bg-accent transition-colors shrink-0"
        title="Drag to resize · double-click to reset"
        role="separator"
        aria-orientation="vertical"
      />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {children[1]}
      </div>
    </div>
  );
};
