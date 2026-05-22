"use client";

import { useEffect, useMemo, useRef } from "react";
import type { HttpMethod } from "../../utils/http";
import { useDraftStore } from "../use-draft-store";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import { useV1Send } from "../use-v1-send";
import { parseSlash } from "../slash-commands";
import { MethodPill } from "./method-pill";
import { Chip } from "./chip";

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const cycleMethod = (m: HttpMethod): HttpMethod => {
  const i = METHODS.indexOf(m);
  return METHODS[(i + 1) % METHODS.length];
};

const methodAllowsBody = (m: HttpMethod) =>
  m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";

export const InputBar = () => {
  const method = useDraftStore((s) => s.method);
  const url = useDraftStore((s) => s.url);
  const bodyType = useDraftStore((s) => s.bodyType);
  const body = useDraftStore((s) => s.body);
  const authType = useDraftStore((s) => s.authType);
  const openPopovers = useDraftStore((s) => s.openPopovers);
  const setMethod = useDraftStore((s) => s.setMethod);
  const setUrl = useDraftStore((s) => s.setUrl);
  const togglePopover = useDraftStore((s) => s.togglePopover);
  const closeAllPopovers = useDraftStore((s) => s.closeAllPopovers);

  const env = useEnvironmentStore((s) =>
    s.environments.find((e) => e.id === s.activeEnvironmentId)
  );

  const { send, cancel } = useV1Send();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Slash commands still execute on Enter; we just don't surface a dropdown
  // while typing so the input stays quiet.
  const slash = useMemo(() => parseSlash(url), [url]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (slash?.match) {
        const parts = url.trim().split(/\s+/);
        const arg = parts.slice(1).join(" ");
        slash.match.run(arg);
        return;
      }
      send();
      return;
    }

    if (e.key === "Escape") {
      if (openPopovers.length > 0) {
        closeAllPopovers();
      } else {
        cancel();
        (e.target as HTMLInputElement).blur();
      }
    }
  };

  const bodySize = body ? new Blob([body]).size : 0;
  const bodyChipValue =
    bodyType === "json" && bodySize > 0
      ? `JSON ${bodySize}B`
      : bodyType === "none"
      ? "none"
      : bodyType;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-bg-secondary">
        <MethodPill
          method={method}
          onClick={() => setMethod(cycleMethod(method))}
        />
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="https://api.example.com/...  or  /command"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent !outline-none focus:!outline-none focus-visible:!outline-none font-mono text-[13px] placeholder:text-muted"
        />
      </div>
      <div className="flex items-center gap-2 mt-2 px-1">
        {methodAllowsBody(method) && (
          <Chip
            label="BODY"
            value={bodyChipValue}
            active={openPopovers.includes("body")}
            onClick={() => togglePopover("body")}
          />
        )}
        <Chip
          label="AUTH"
          value={authType}
          active={openPopovers.includes("auth")}
          onClick={() => togglePopover("auth")}
        />
        <Chip
          label="ENV"
          value={env?.name ?? "—"}
          active={openPopovers.includes("env")}
          onClick={() => togglePopover("env")}
        />
      </div>
    </div>
  );
};
