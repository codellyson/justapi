'use client';

import { useEffect } from 'react';
import { useRequest } from '../../hooks/use-request';
import { useDebuggerStore } from '../../stores/use-debugger-store';

const isTypingInEditor = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
};

/**
 * Cmd/Ctrl+Enter sends the current request. Works from anywhere in the app
 * (including inside inputs), except when the debugger detail view has
 * focus — there's no request to send from that view.
 */
export const KeyboardShortcuts = () => {
  const { send } = useRequest();
  const debugSelected = useDebuggerStore((s) => s.selectedRequestId);

  useEffect(() => {
    if (debugSelected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (!(e.metaKey || e.ctrlKey)) return;
      // Inside a multiline editor, plain Enter inserts a newline; Cmd/Ctrl+
      // Enter is unambiguous so we still handle it.
      e.preventDefault();
      // Blur the focused element so the request store sees the latest value
      // from any uncommitted input (e.g., URL field with pending onBlur).
      if (isTypingInEditor(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
      send();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send, debugSelected]);

  return null;
};
