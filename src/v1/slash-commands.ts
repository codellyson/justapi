import { useDraftStore } from "./use-draft-store";
import { useStackStore } from "./use-stack-store";
import { useTemplatesStore } from "./use-templates-store";
import { useWorkspaceStore } from "./use-workspace-store";
import { useToastStore } from "../stores/use-toast-store";
import { useRequestStore } from "../stores/use-request-store";
import { useEnvironmentStore } from "../stores/use-environment-store";
import { replaceVariables } from "../utils/variables";

export interface SlashCommand {
  name: string;
  hint: string;
  requiresArg?: boolean;
  preview?: string;
  run: (arg: string) => Promise<void> | void;
}

const toast = (message: string, type: "info" | "error" = "info") =>
  useToastStore.getState().showToast(type, message);

const buildCurl = (): string => {
  const d = useDraftStore.getState();
  const env = useEnvironmentStore.getState().getActiveEnvironment();
  const variables = env?.variables ?? {};
  const url = replaceVariables(d.url.trim(), variables);
  const parts = [`curl -X ${d.method}`];
  Object.entries(d.headers).forEach(([k, v]) => {
    parts.push(`-H ${shellQuote(`${k}: ${replaceVariables(v, variables)}`)}`);
  });
  if (d.authType === "bearer" && d.authConfig.bearerToken) {
    parts.push(
      `-H ${shellQuote(
        `Authorization: Bearer ${replaceVariables(d.authConfig.bearerToken, variables)}`
      )}`
    );
  } else if (d.authType === "basic" && d.authConfig.username) {
    const u = replaceVariables(d.authConfig.username, variables);
    const p = replaceVariables(d.authConfig.password ?? "", variables);
    parts.push(`-u ${shellQuote(`${u}:${p}`)}`);
  } else if (
    d.authType === "api-key" &&
    d.authConfig.apiKey &&
    d.authConfig.apiKeyHeader
  ) {
    parts.push(
      `-H ${shellQuote(
        `${d.authConfig.apiKeyHeader}: ${replaceVariables(d.authConfig.apiKey, variables)}`
      )}`
    );
  }
  if (d.bodyType === "json" && d.body) {
    if (!d.headers["Content-Type"]) {
      parts.push(`-H ${shellQuote("Content-Type: application/json")}`);
    }
    parts.push(`-d ${shellQuote(d.body)}`);
  } else if (d.bodyType === "raw" && d.body) {
    parts.push(`-d ${shellQuote(d.body)}`);
  }
  parts.push(shellQuote(url));
  return parts.join(" ");
};

const shellQuote = (s: string): string =>
  `'${s.replace(/'/g, "'\\''")}'`;

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "/save",
    hint: "save current input as a template",
    run: async (arg) => {
      const d = useDraftStore.getState();
      if (!d.url.trim()) {
        toast("Nothing to save — input is empty", "error");
        return;
      }
      const name =
        arg.trim() || `${d.method} ${new URL(d.url, "http://x").pathname}`;
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
      toast(`Saved “${name}”`);
      useDraftStore.getState().setUrl("");
    },
  },
  {
    name: "/env",
    hint: "switch environment or open env manager",
    run: (arg) => {
      const target = arg.trim().toLowerCase();
      const env = useEnvironmentStore.getState();
      if (!target) {
        useDraftStore.getState().togglePopover("env");
        useDraftStore.getState().setUrl("");
        return;
      }
      const match = env.environments.find(
        (e) => e.name.toLowerCase() === target || e.id.toLowerCase() === target
      );
      if (match) {
        env.setActiveEnvironmentId(match.id);
        toast(`Env: ${match.name}`);
        useDraftStore.getState().setUrl("");
      } else {
        toast(`No env named “${arg.trim()}”`, "error");
      }
    },
  },
  {
    name: "/headers",
    hint: "open inline header editor",
    run: () => {
      const d = useDraftStore.getState();
      if (!d.openPopovers.includes("headers")) d.togglePopover("headers");
      d.setUrl("");
    },
  },
  {
    name: "/curl",
    hint: "copy current draft as cURL",
    run: async () => {
      if (!useDraftStore.getState().url.trim()) {
        toast("Nothing to copy — input is empty", "error");
        return;
      }
      const ok = await copyToClipboard(buildCurl());
      toast(ok ? "Copied as cURL" : "Copy failed", ok ? "info" : "error");
    },
  },
  {
    name: "/share",
    hint: "copy short share link",
    run: async () => {
      const d = useDraftStore.getState();
      if (!d.url.trim()) {
        toast("Nothing to share — input is empty", "error");
        return;
      }
      const legacy = useRequestStore.getState();
      legacy.setMethod(d.method);
      legacy.setUrl(d.url);
      legacy.setBodyType(d.bodyType);
      legacy.setBody(d.body);
      legacy.setAuthType(d.authType);
      legacy.setAuthConfig(d.authConfig);
      const sharing = await import("../utils/sharing");
      const url = await sharing.generateShareableLink();
      const ok = await copyToClipboard(url);
      toast(ok ? "Share link copied" : "Failed to create link", ok ? "info" : "error");
    },
  },
  {
    name: "/clear",
    hint: "archive entire stack",
    run: () => {
      const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      useStackStore.getState().archiveAll(workspaceId);
      useDraftStore.getState().setUrl("");
      toast("Stack archived");
    },
  },
  {
    name: "/delete",
    hint: "permanently delete the request currently in the drawer",
    run: () => {
      const stack = useStackStore.getState();
      const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      const id = stack.displayedCardIdByWorkspace[workspaceId];
      if (!id) {
        toast("No request on stage to delete", "error");
        return;
      }
      const card = stack.cards.find((c) => c.id === id);
      if (!card) {
        toast("Card not found", "error");
        return;
      }
      if (typeof window !== "undefined" && !window.confirm("Delete this request?")) {
        return;
      }
      stack.remove(id);
      useDraftStore.getState().setUrl("");
      toast("Request deleted");
    },
  },
  {
    name: "/expand",
    hint: "open current draft in legacy composer",
    run: () => {
      const d = useDraftStore.getState();
      const legacy = useRequestStore.getState();
      legacy.setMethod(d.method);
      legacy.setUrl(d.url);
      legacy.setBodyType(d.bodyType);
      legacy.setBody(d.body);
      legacy.setAuthType(d.authType);
      legacy.setAuthConfig(d.authConfig);
      window.location.href = "/expand";
    },
  },
  {
    name: "/archive",
    hint: "view archived cards (coming soon)",
    run: () => {
      toast("Archive view coming soon");
    },
  },
  {
    name: "/captures",
    hint: "view extension-captured requests (coming soon)",
    run: () => {
      toast("Captures view coming soon");
    },
  },
];

export interface ParsedSlash {
  name: string;
  arg: string;
  match: SlashCommand | null;
  /** Candidate matches by prefix (for the suggestion dropdown). */
  candidates: SlashCommand[];
}

export const parseSlash = (raw: string): ParsedSlash | null => {
  const input = raw.trim();
  if (!input.startsWith("/")) return null;
  const space = input.indexOf(" ");
  const name = space === -1 ? input : input.slice(0, space);
  const arg = space === -1 ? "" : input.slice(space + 1);
  const match = SLASH_COMMANDS.find((c) => c.name === name) ?? null;
  const candidates = match
    ? [match]
    : SLASH_COMMANDS.filter((c) => c.name.startsWith(name));
  return { name, arg, match, candidates };
};
