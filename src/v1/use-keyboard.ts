import { useEffect } from "react";
import { useDraftStore } from "./use-draft-store";
import { useTemplatesStore } from "./use-templates-store";
import { useToastStore } from "../stores/use-toast-store";

interface KeyboardOptions {
  openPalette: () => void;
}

const isEditable = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
};

const toast = (msg: string) =>
  useToastStore.getState().showToast("info", msg);

export const useV1Keyboard = ({ openPalette }: KeyboardOptions) => {
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "k") {
        e.preventDefault();
        openPalette();
        return;
      }

      if (mod && (e.key === "z" || e.key === "Z")) {
        if (isEditable(e.target)) return;
        const undone = useDraftStore.getState().undoFill();
        if (undone) {
          e.preventDefault();
          toast("Undo refill");
        }
        return;
      }

      if (mod && (e.key === "s" || e.key === "S")) {
        const d = useDraftStore.getState();
        if (!d.url.trim()) return;
        e.preventDefault();
        try {
          const u = new URL(d.url, "http://x");
          const name = `${d.method} ${u.pathname}`;
          useTemplatesStore.getState().save({
            name,
            method: d.method,
            url: d.url,
            body: d.body,
            bodyType: d.bodyType,
            authType: d.authType,
            authConfig: { ...d.authConfig },
            headers: { ...d.headers },
          });
          toast(`Saved "${name}"`);
        } catch {
          toast("Cannot save — invalid URL");
        }
        return;
      }

      if (mod && (e.key === "l" || e.key === "L")) {
        const d = useDraftStore.getState();
        if (!d.url.trim()) return;
        e.preventDefault();
        const sharing = await import("../utils/sharing");
        let url: string;
        try {
          url = await sharing.generateShareableLink({
            method: d.method,
            url: d.url,
            params: [],
            headers: Object.entries(d.headers).map(([k, v], i) => ({
              id: String(i + 1),
              key: k,
              value: v,
              enabled: true,
            })),
            bodyType: d.bodyType,
            body: d.body,
            authType: d.authType,
            authConfig: d.authConfig,
          });
        } catch {
          toast("Couldn't create share link");
          return;
        }
        try {
          await navigator.clipboard.writeText(url);
          toast("Share link copied");
        } catch {
          toast("Copy failed");
        }
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette]);
};
