'use client';

import { useEffect, useState } from 'react';
import { Send, Activity } from 'lucide-react';
import { useUIStore } from '../../stores/use-ui-store';

const STORAGE_KEY = 'justapi-intro-seen';

export const IntroOverlay = () => {
  const [show, setShow] = useState(false);
  const setSidebarSection = useUIStore((s) => s.setSidebarSection);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  const pickExplore = () => {
    setSidebarSection('collections');
    dismiss();
  };

  const pickDebug = () => {
    setSidebarSection('debug');
    setSidebarOpen(true); // open the sidebar drawer on mobile
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative z-10 bg-bg border border-border rounded-lg shadow-lg w-full max-w-2xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-1">Welcome to JUSTAPI</h2>
        <p className="text-sm text-secondary mb-6">Two things this app does well:</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={pickExplore}
            className="text-left p-4 rounded-md border border-border hover:border-accent hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Send className="w-4 h-4 text-accent" />
              <span className="font-medium text-primary">Explore</span>
            </div>
            <p className="text-xs text-secondary">
              Compose and send HTTP requests. Save the ones you reuse. Replay shared requests from URLs.
            </p>
          </button>

          <button
            onClick={pickDebug}
            className="text-left p-4 rounded-md border border-border hover:border-accent hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-accent" />
              <span className="font-medium text-primary">Debug</span>
            </div>
            <p className="text-xs text-secondary">
              Capture fetch + XHR from any tab via the JUSTAPI extension, inspect headers and bodies, replay with one click.
            </p>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={dismiss} className="text-xs text-muted hover:text-primary">
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
};
