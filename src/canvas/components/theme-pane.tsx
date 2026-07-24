"use client";

import { useTheme } from "../../contexts/theme-context";
import { cn } from "../../utils/cn";

/** Appearance panel, docked beside the rail like the other panes. */
export const ThemePane = () => {
  const { mode, toggleMode, themeId, setThemeId, themes } = useTheme();

  return (
    <div className="flex w-60 flex-none flex-col border-r border-border/50 bg-bg-secondary font-sans">
      <div className="flex items-center border-b border-border/40 px-3 py-2">
        <span className="text-[11px] text-muted">appearance</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <button
          type="button"
          onClick={toggleMode}
          className="w-full rounded-md border border-border/60 px-3 py-2 text-left text-[13px] text-primary transition-colors hover:bg-bg/60"
        >
          {mode === "light" ? "Switch to dark" : "Switch to light"}
        </button>

        <div className="pb-1.5 pt-3 text-[11px] text-muted">theme</div>
        <div className="space-y-1">
          {themes.map((t) => {
            const active = t.id === themeId;
            const swatchBg = mode === "dark" ? t.swatch.dark : t.swatch.light;
            const swatchFg = mode === "dark" ? t.swatch.light : t.swatch.dark;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeId(t.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md border px-2 py-1.5 text-left text-[13px] transition-colors",
                  active
                    ? "border-accent/60 bg-accent/10 text-primary"
                    : "border-transparent text-secondary hover:bg-bg/60"
                )}
              >
                <span className="flex h-5 w-7 flex-shrink-0 overflow-hidden rounded border border-border/60">
                  <span style={{ background: swatchBg, flex: 1 }} />
                  <span style={{ background: swatchFg, flex: 1 }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.label}</span>
                  {t.description && (
                    <span className="block truncate text-[11px] text-muted">
                      {t.description}
                    </span>
                  )}
                </span>
                {active && <span className="text-[11px] text-accent">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
