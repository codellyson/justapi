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

  // Register the PWA service worker so the app is installable. The SW
  // itself is intentionally inert (no caching) — the old aggressive cache-
  // first worker caused stale-content bugs and we don't want to repeat
  // that. When a new sw.js version ships, registering again triggers the
  // browser's update flow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        console.warn("[JUSTAPI] service worker registration failed:", err);
      });
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
