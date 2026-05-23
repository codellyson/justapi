import { useCallback, useRef } from "react";
import { sendRequest } from "../utils/http";
import type { RequestConfig } from "../utils/http";
import { replaceVariables } from "../utils/variables";
import { useEnvironmentStore } from "../stores/use-environment-store";
import { useDraftStore } from "./use-draft-store";
import { useStackStore } from "./use-stack-store";
import { useWorkspaceStore } from "./use-workspace-store";
import type { CardRequestSnapshot } from "./types";

const bodySummary = (
  bodyType: string,
  body: string
): { size: number; summary: string } | null => {
  if (bodyType === "none" || !body) return null;
  const size = new Blob([body]).size;
  const sizeStr =
    size < 1024 ? `${size}B` : `${(size / 1024).toFixed(1)}KB`;
  const typeLabel = bodyType === "json" ? "JSON" : bodyType.toUpperCase();
  return { size, summary: `${typeLabel} ${sizeStr}` };
};

const authSummary = (type: string): string => {
  if (type === "none") return "none";
  if (type === "bearer") return "bearer";
  if (type === "basic") return "basic";
  if (type === "api-key") return "api key";
  return type;
};

export const useV1Send = () => {
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const send = useCallback(async (): Promise<string | null> => {
    const d = useDraftStore.getState();
    const url = d.url.trim();
    if (!url) return null;

    const env = useEnvironmentStore.getState().getActiveEnvironment();
    const variables = env?.variables ?? {};
    const resolvedUrl = replaceVariables(url, variables);

    const headers: Record<string, string> = { ...d.headers };
    if (d.authType === "bearer" && d.authConfig.bearerToken) {
      headers["Authorization"] = `Bearer ${replaceVariables(
        d.authConfig.bearerToken,
        variables
      )}`;
    } else if (d.authType === "basic" && d.authConfig.username) {
      const u = replaceVariables(d.authConfig.username, variables);
      const p = replaceVariables(d.authConfig.password ?? "", variables);
      headers["Authorization"] = `Basic ${btoa(`${u}:${p}`)}`;
    } else if (
      d.authType === "api-key" &&
      d.authConfig.apiKey &&
      d.authConfig.apiKeyHeader
    ) {
      headers[d.authConfig.apiKeyHeader] = replaceVariables(
        d.authConfig.apiKey,
        variables
      );
    }

    let body: string | undefined;
    if (d.bodyType === "json" && d.body) {
      try {
        JSON.parse(d.body);
      } catch {
        return null;
      }
      body = d.body;
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    } else if (d.bodyType === "raw" && d.body) {
      body = d.body;
    }

    const bSum = bodySummary(d.bodyType, d.body);
    const snapshot: CardRequestSnapshot = {
      method: d.method,
      url: resolvedUrl,
      urlRaw: url,
      headers,
      body: body ?? null,
      bodyType: d.bodyType,
      authType: d.authType,
      authConfig: { ...d.authConfig },
    };

    const stack = useStackStore.getState();
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    const cardId = stack.spawn({
      workspaceId,
      request: snapshot,
      env: env ? { id: env.id, name: env.name } : null,
      auth: { type: d.authType, summary: authSummary(d.authType) },
      body: bSum
        ? { type: d.bodyType, size: bSum.size, summary: bSum.summary }
        : null,
    });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const config: RequestConfig = {
      method: snapshot.method,
      url: snapshot.url,
      headers,
      body,
    };

    try {
      const response = await sendRequest(config, controller.signal);
      if (controller.signal.aborted) return cardId;
      useStackStore.getState().resolve(cardId, response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        useStackStore.getState().fail(cardId, "cancelled");
        return cardId;
      }
      const msg = err instanceof Error ? err.message : "Request failed";
      useStackStore.getState().fail(cardId, msg);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }

    return cardId;
  }, []);

  return { send, cancel };
};
