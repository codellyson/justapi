"use client";

import { useDraftStore } from "../use-draft-store";
import { PopoverBody } from "./popover-body";
import { PopoverAuth } from "./popover-auth";
import { PopoverEnv } from "./popover-env";
import { PopoverHeaders } from "./popover-headers";

export const PopoverStack = () => {
  const openPopovers = useDraftStore((s) => s.openPopovers);
  if (openPopovers.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-2 pb-4 space-y-2">
      {openPopovers.map((key) => {
        if (key === "body") return <PopoverBody key={key} />;
        if (key === "auth") return <PopoverAuth key={key} />;
        if (key === "env") return <PopoverEnv key={key} />;
        if (key === "headers") return <PopoverHeaders key={key} />;
        return null;
      })}
    </div>
  );
};
