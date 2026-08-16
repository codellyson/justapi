import { useCanvasStore } from "./use-canvas-store";
import { useLimitsStore } from "../stores/use-limits-store";

export const ANON_CANVAS_LIMIT = 1;

/**
 * Create a canvas, respecting the plan cap when signed in (usage synced from the
 * server) and ANON_CANVAS_LIMIT before that. Returns the new graph id, or null
 * if a cap blocks it — in which case a notice is set for the UI to surface.
 *
 * The anonymous cap counts local graphs rather than synced usage, which is the
 * only number available before sign-in. It is a signup nudge, not a security
 * control — local state is the user's to edit.
 */
export function createCanvasGuarded(name?: string): string | null {
  const s = useLimitsStore.getState();
  if (!s.synced) {
    const local = Object.keys(useCanvasStore.getState().graphs).length;
    if (local >= ANON_CANVAS_LIMIT) {
      s.setNotice("Sign in to work across more than one canvas.");
      return null;
    }
  } else if (s.limits && s.usage && s.usage.canvases >= s.limits.canvases) {
    s.setNotice(
      `Free plan: ${s.limits.canvases} canvases. Delete one or upgrade to add more.`
    );
    return null;
  }
  const id = useCanvasStore.getState().createGraph(name);
  // Optimistic bump so rapid successive creates are gated before the next sync.
  if (s.usage) s.setUsage({ ...s.usage, canvases: s.usage.canvases + 1 });
  return id;
}
