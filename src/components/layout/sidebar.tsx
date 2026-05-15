'use client';

import { useState } from "react";
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
import { cn } from "../../utils/cn";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  { id: "collections", label: "Collections" },
  { id: "debug", label: "Debug" },
  { id: "history", label: "History" },
] as const;

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { mode, toggleMode } = useTheme();
  const activeSection = useUIStore((s) => s.sidebarSection);
  const setActiveSection = useUIStore((s) => s.setSidebarSection);
  const [showSettings, setShowSettings] = useState(false);

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
          "lg:static lg:translate-x-0 lg:w-64 lg:max-w-none lg:z-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
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
          <div className="flex border-b border-border -mb-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                  activeSection === section.id
                    ? "border-accent text-primary"
                    : "border-transparent text-secondary hover:text-primary"
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {activeSection === "collections" && <CollectionsList />}
          {activeSection === "debug" && <DebuggerPanel />}
          {activeSection === "history" && <HistoryPanel />}
        </div>
        <div className="px-4 py-3 border-t border-border space-y-2">
          <EnvironmentSelector />
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMode}
              className="flex-1"
              aria-label="Toggle theme"
            >
              {mode === "dark" ? (
                <Sun className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <Moon className="w-3.5 h-3.5 mr-1.5" />
              )}
              {mode === "dark" ? "Light" : "Dark"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="flex-1"
              aria-label="Settings"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Settings
            </Button>
          </div>
        </div>
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </aside>
    </>
  );
};
