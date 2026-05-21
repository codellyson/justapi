import { create } from 'zustand';

export type SidebarSection = 'collections' | 'debug' | 'history';

interface UIState {
  sidebarSection: SidebarSection;
  sidebarOpen: boolean;
  paletteOpen: boolean;
  setSidebarSection: (s: SidebarSection) => void;
  setSidebarOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarSection: 'collections',
  sidebarOpen: false,
  paletteOpen: false,
  setSidebarSection: (s) => set({ sidebarSection: s }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
}));
