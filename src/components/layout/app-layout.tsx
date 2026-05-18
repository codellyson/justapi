"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { RequestTabs } from "../request/request-tabs";
import { ResponsePanel } from "../response/response-panel";
import { ToastContainer } from "../ui/toast";
import { ThemeToggle } from "../ui/theme-toggle";
import { DebuggerDetail } from "../debugger/debugger-detail";
import { IntroOverlay } from "./intro-overlay";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { SplitPane } from "./split-pane";
import { loadConfigFromUrl, applySharedConfig } from "../../utils/sharing";
import { useToastStore } from "../../stores/use-toast-store";
import { useDebuggerStore } from "../../stores/use-debugger-store";
import { useUIStore } from "../../stores/use-ui-store";
import { useExtension } from "../../hooks/use-extension";

export const AppLayout = () => {
  const { toasts, removeToast } = useToastStore();
  const debugSelected = useDebuggerStore((s) => s.selectedRequestId);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  useExtension();

  // One-shot cleanup for users who registered the old PWA service worker.
  // Safe to remove once existing browsers have loaded the app at least once.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()));
    }
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }, []);

  useEffect(() => {
    const config = loadConfigFromUrl();
    if (config) {
      applySharedConfig(config);
      if (window.history.replaceState) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      }
    }
  }, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg text-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {debugSelected ? (
          <DebuggerDetail />
        ) : (
          <>
            <TopBar onOpenSidebar={() => setSidebarOpen(true)} />
            <SplitPane
              storageKey="request-response"
              defaultLeftPercent={40}
              className="flex-1"
            >
              <RequestTabs className="flex-1" />
              <ResponsePanel />
            </SplitPane>
          </>
        )}
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <ThemeToggle />
      <IntroOverlay />
      <KeyboardShortcuts />
    </div>
  );
};
