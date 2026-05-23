"use client";

import { useDraftStore } from "../use-draft-store";
import { PopoverAuth } from "./popover-auth";
import { PopoverEnv } from "./popover-env";

const DRAWER_KEYS = new Set(["headers", "body"]);

export const PopoverStack = () => {
  const openPopovers = useDraftStore((s) => s.openPopovers);
  // `headers` and `body` have their own Vaul drawers; only compact popovers
  // (auth, env) render inline here.
  const inline = openPopovers.filter((k) => !DRAWER_KEYS.has(k));
  if (inline.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-2 pb-4 space-y-2">
      {inline.map((key) => {
        if (key === "auth") return <PopoverAuth key={key} />;
        if (key === "env") return <PopoverEnv key={key} />;
        return null;
      })}
    </div>
  );
};
