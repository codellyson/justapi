"use client";

import { useState } from "react";
import { useStackStore, useActiveDisplayedCardId } from "../use-stack-store";
import { useWorkspaceStore } from "../use-workspace-store";
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
import { WorkspaceTabs } from "./workspace-tabs";
import { HeadersDrawer } from "./headers-drawer";
import { BodyDrawer } from "./body-drawer";

export const Workspace = () => {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const allCards = useStackStore((s) => s.cards);
  const displayedCardId = useActiveDisplayedCardId();
  const closeDrawer = useStackStore((s) => s.closeDrawer);
  const displayedCard =
    allCards.find(
      (c) => c.id === displayedCardId && c.workspaceId === activeWorkspaceId
    ) ?? null;
  const hasInStack = allCards.some(
    (c) => c.workspaceId === activeWorkspaceId && c.inStack && !c.archived
  );
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
        <WorkspaceTabs />
        {!hasInStack && <CursorDemo />}
        <PopoverStack />
      </div>

      {displayedCard && (
        <Sheet
          card={displayedCard}
          open={drawerOpen}
          onOpenChange={(o) => {
            if (!o) closeDrawer(activeWorkspaceId);
          }}
        />
      )}

      <HeadersDrawer />
      <BodyDrawer />

      {hasInStack && <PeekRail onShowMore={() => setPaletteOpen(true)} />}

      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <ThemeToggle />
    </main>
  );
};
