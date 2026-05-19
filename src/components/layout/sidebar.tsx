'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { Settings, Moon, Sun, X } from "lucide-react";
import { useTheme } from "../../contexts/theme-context";
import { useUIStore } from "../../stores/use-ui-store";
import { CollectionsList } from "../collections/collections-list";
import { HistoryPanel } from "../history/history-panel";
import { DebuggerPanel } from "../debugger/debugger-panel";
import { EnvironmentSelector } from "../environment/environment-selector";
import { Button } from "../ui/button";
import { Logo } from "../ui/logo";
import { SettingsModal } from "./settings-modal";
import { Tabs, type TabItem } from "../ui/tabs";
import { cn } from "../../utils/cn";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type SectionId = "collections" | "debug" | "history";

const sections: TabItem<SectionId>[] = [
  { id: "collections", label: "Collections" },
  { id: "debug", label: "Debug" },
  { id: "history", label: "History" },
];

const SIDEBAR_WIDTH_KEY = "justapi-sidebar-width";
const SIDEBAR_DEFAULT_WIDTH = 256;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 480;

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { mode, toggleMode } = useTheme();
  const activeSection = useUIStore((s) => s.sidebarSection);
  const setActiveSection = useUIStore((s) => s.setSidebarSection);
  const [showSettings, setShowSettings] = useState(false);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isLg, setIsLg] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      if (
        !isNaN(parsed) &&
        parsed >= SIDEBAR_MIN_WIDTH &&
        parsed <= SIDEBAR_MAX_WIDTH
      ) {
        setWidth(parsed);
      }
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsLg(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current) return;
    const next = Math.min(
      SIDEBAR_MAX_WIDTH,
      Math.max(SIDEBAR_MIN_WIDTH, e.clientX)
    );
    setWidth(next);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const resetWidth = () => {
    setWidth(SIDEBAR_DEFAULT_WIDTH);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(SIDEBAR_DEFAULT_WIDTH));
  };

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-bg-secondary",
          "border-r border-border",
          "flex flex-col h-full transition-transform duration-150",
          "lg:relative lg:translate-x-0 lg:max-w-none lg:z-0 lg:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={isLg ? { width: `${width}px` } : undefined}
      >
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <Logo variant="default" className="h-8" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-7 h-7 p-0 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Tabs
            items={sections}
            active={activeSection}
            onChange={setActiveSection}
            size="sm"
            className="-mb-3"
          />
        </div>
        <div className="flex-1 overflow-auto">
          {activeSection === "collections" && <CollectionsList />}
          {activeSection === "debug" && <DebuggerPanel />}
          {activeSection === "history" && <HistoryPanel />}
        </div>
        <div className="px-4 py-3 border-t border-border space-y-2">
          <EnvironmentSelector />
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMode}
              className="justify-center gap-1.5"
              aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
              title={mode === "dark" ? "Light mode" : "Dark mode"}
            >
              {mode === "dark" ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              <span className="text-xs font-medium">
                {mode === "dark" ? "Light" : "Dark"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="justify-center gap-1.5"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Settings</span>
            </Button>
          </div>
        </div>
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
        <div
          onPointerDown={startDrag}
          onDoubleClick={resetWidth}
          className="hidden lg:block absolute top-0 right-0 h-full w-1 -mr-px cursor-col-resize bg-transparent hover:bg-accent transition-colors"
          title="Drag to resize · double-click to reset"
          role="separator"
          aria-orientation="vertical"
        />
      </aside>
    </>
  );
};
