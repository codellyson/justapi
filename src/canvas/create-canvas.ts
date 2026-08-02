import { useCanvasStore } from "./use-canvas-store";
import { useLimitsStore } from "../stores/use-limits-store";

/**
 * Create a canvas, respecting the plan cap when signed in (usage synced from the
 * server). Returns the new graph id, or null if the cap blocks it — in which
 * case a notice is set for the UI to surface. Anonymous users (no synced limits)
 * are never blocked.
 */
export function createCanvasGuarded(name?: string): string | null {
  const s = useLimitsStore.getState();
  if (
    s.synced &&
    s.limits &&
    s.usage &&
    s.usage.canvases >= s.limits.canvases
  ) {
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
