/**
 * True when the canvas is running inside an iframe (the marketing-page live
 * embed). In that mode it becomes a look-don't-touch preview: it reads the
 * visitor's saved canvas but never writes back, doesn't open the agent bridge,
 * and disables editing — so poking at the preview can't touch real data.
 */
export const isEmbedded = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access to window.top throws — that only happens when framed.
    return true;
  }
};
