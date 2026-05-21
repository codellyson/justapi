'use client';

import { useEffect } from 'react';
import { useRequest } from '../../hooks/use-request';
import { useDebuggerStore } from '../../stores/use-debugger-store';
import { useUIStore } from '../../stores/use-ui-store';

const isTypingInEditor = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
};

export const KeyboardShortcuts = () => {
  const { send } = useRequest();
  const debugSelected = useDebuggerStore((s) => s.selectedRequestId);
  const togglePalette = useUIStore((s) => s.togglePalette);
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const paletteOpen = useUIStore((s) => s.paletteOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
        return;
      }

      if (e.key === 'Escape' && paletteOpen) {
        e.preventDefault();
        setPaletteOpen(false);
        return;
      }

      // Cmd+Enter sends the current request, except when palette is open
      // (cmdk handles Enter for item selection) or when the debug detail
      // is in focus (no request to send from that view).
      if (cmd && e.key === 'Enter') {
        if (paletteOpen || debugSelected) return;
        e.preventDefault();
        if (isTypingInEditor(document.activeElement)) {
          (document.activeElement as HTMLElement).blur();
        }
        send();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send, debugSelected, togglePalette, setPaletteOpen, paletteOpen]);

  return null;
};
