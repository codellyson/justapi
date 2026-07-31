"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/theme-context";

export const ThemeToggle = () => {
  const { mode, toggleMode } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label="Toggle light/dark"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-secondary transition-colors hover:text-primary hover:border-border"
    >
      {mode === "dark" ? (
        <Sun className="h-[15px] w-[15px]" />
      ) : (
        <Moon className="h-[15px] w-[15px]" />
      )}
    </button>
  );
};
