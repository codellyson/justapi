"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import {
  BUILT_IN_THEMES,
  DEFAULT_THEME_ID,
  applyThemeVariant,
  findTheme,
  rgbTripletToHex,
  type ThemePlugin,
  type ThemeVariant,
} from "../utils/theme-plugins";

type Mode = "light" | "dark";

export interface PaletteColors {
  accent: string;
  accentHover: string;
  accentText: string;
}

/** Full palette for the current theme + mode, with all colors as hex strings. */
export type PaletteHex = { [K in keyof ThemeVariant]: string };

interface ThemeContextType {
  mode: Mode;
  toggleMode: () => void;
  themeId: string;
  setThemeId: (id: string) => void;
  themes: ThemePlugin[];
  theme: ThemePlugin;
  colors: PaletteColors;
  /** Every palette color for the active theme + mode, as hex. */
  palette: PaletteHex;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODE_KEY = "justapi-mode";
const THEME_KEY = "justapi-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("light");
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedMode = localStorage.getItem(MODE_KEY) as Mode | null;
    if (storedMode === "light" || storedMode === "dark") {
      setMode(storedMode);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setMode("dark");
    }

    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme && BUILT_IN_THEMES.some((t) => t.id === storedTheme)) {
      setThemeIdState(storedTheme);
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(MODE_KEY, mode);
  }, [mode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const t = findTheme(themeId);
    applyThemeVariant(mode === "dark" ? t.dark : t.light);
    document.documentElement.dataset.theme = t.id;
    localStorage.setItem(THEME_KEY, t.id);
  }, [themeId, mode, mounted]);

  const theme = useMemo(() => findTheme(themeId), [themeId]);
  const variant = mode === "dark" ? theme.dark : theme.light;
  const colors: PaletteColors = useMemo(
    () => ({
      accent: rgbTripletToHex(variant.accent),
      accentHover: rgbTripletToHex(variant.accentHover),
      accentText: rgbTripletToHex(variant.accentText),
    }),
    [variant.accent, variant.accentHover, variant.accentText]
  );

  const palette: PaletteHex = useMemo(
    () => ({
      bg: rgbTripletToHex(variant.bg),
      bgSecondary: rgbTripletToHex(variant.bgSecondary),
      border: rgbTripletToHex(variant.border),
      textPrimary: rgbTripletToHex(variant.textPrimary),
      textSecondary: rgbTripletToHex(variant.textSecondary),
      textMuted: rgbTripletToHex(variant.textMuted),
      accent: rgbTripletToHex(variant.accent),
      accentHover: rgbTripletToHex(variant.accentHover),
      accentText: rgbTripletToHex(variant.accentText),
      danger: rgbTripletToHex(variant.danger),
      success: rgbTripletToHex(variant.success),
      warning: rgbTripletToHex(variant.warning),
    }),
    [variant]
  );

  const toggleMode = () => setMode((prev) => (prev === "light" ? "dark" : "light"));
  const setThemeId = (id: string) => setThemeIdState(id);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        toggleMode,
        themeId,
        setThemeId,
        themes: BUILT_IN_THEMES,
        theme,
        colors,
        palette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
