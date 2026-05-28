"use client";

import { useEffect, useState } from "react";
import { useStackStore, useActiveDisplayedCardId } from "../use-stack-store";
import { useWorkspaceStore } from "../use-workspace-store";
import { useV1Keyboard } from "../use-keyboard";
import { useDraftStore } from "../use-draft-store";
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
import { ExamplePills } from "./example-pills";
import { HeadersDrawer } from "./headers-drawer";
import { BodyDrawer } from "./body-drawer";
import { EnvDrawer } from "./env-drawer";

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

  // If we land here via a share link (?s=ID or #s=ENC), decode it and
  // apply the request to the active workspace's draft. Then clean the
  // URL so reloads don't re-apply the same payload.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { loadConfigFromUrl } = await import("../../utils/sharing");
      const cfg = await loadConfigFromUrl();
      if (cancelled || !cfg) return;
      const enabledHeaders: Record<string, string> = {};
      cfg.headers.forEach((h) => {
        if (h.enabled && h.key) enabledHeaders[h.key] = h.value;
      });
      useDraftStore.getState().fillFrom({
        method: cfg.method as ReturnType<typeof useDraftStore.getState>["method"],
        url: cfg.url,
        body: cfg.body,
        bodyType: cfg.bodyType as ReturnType<typeof useDraftStore.getState>["bodyType"],
        authType: cfg.authType as ReturnType<typeof useDraftStore.getState>["authType"],
        authConfig: cfg.authConfig,
        headers: enabledHeaders,
      });
      useToastStore.getState().showToast("info", "Loaded shared request");
      if (window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const drawerOpen = displayedCard !== null;

  return (
    <main
      data-vaul-drawer-wrapper
      className="relative h-[100dvh] w-full overflow-hidden bg-bg text-primary"
    >
      {!drawerOpen && (
        <div className="absolute inset-0 flex flex-col items-stretch justify-center">
          <InputBar />
          {!hasInStack && <CursorDemo />}
          <WorkspaceTabs />
          <ExamplePills />
          <PopoverStack />
        </div>
      )}

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
      <EnvDrawer />

      {hasInStack && <PeekRail onShowMore={() => setPaletteOpen(true)} />}

      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <ThemeToggle />
    </main>
  );
};
