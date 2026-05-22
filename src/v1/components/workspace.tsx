"use client";

import { useState } from "react";
import { useStackStore } from "../use-stack-store";
import { useV1Keyboard } from "../use-keyboard";
import { useToastStore } from "../../stores/use-toast-store";
import { ToastContainer } from "../../components/ui/toast";
import { ThemeToggle } from "../../components/ui/theme-toggle";
import { InputBar } from "./input-bar";
import { PopoverStack } from "./popover-stack";
import { Palette } from "./palette";
import { CursorDemo } from "./cursor-demo";
import { Sheet } from "./sheet";
import { PeekRail } from "./peek-rail";

export const Workspace = () => {
  const cards = useStackStore((s) => s.cards);
  const displayedCardId = useStackStore((s) => s.displayedCardId);
  const closeDrawer = useStackStore((s) => s.closeDrawer);
  const displayedCard =
    cards.find((c) => c.id === displayedCardId) ?? null;
  const hasInStack = cards.some((c) => c.inStack && !c.archived);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  useV1Keyboard({ openPalette: () => setPaletteOpen(true) });

  const drawerOpen = displayedCard !== null;

  return (
    <main
      data-vaul-drawer-wrapper
      className="relative h-[100dvh] w-full overflow-hidden bg-bg text-primary"
    >
      <div className="absolute inset-0 flex flex-col items-stretch justify-center">
        <InputBar />
        {!hasInStack && <CursorDemo />}
        <PopoverStack />
      </div>

      {displayedCard && (
        <Sheet
          card={displayedCard}
          open={drawerOpen}
          onOpenChange={(o) => {
            if (!o) closeDrawer();
          }}
        />
      )}

      {hasInStack && <PeekRail />}

      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <ThemeToggle />
    </main>
  );
};
