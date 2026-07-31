"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { authClient, useSession, signOut } from "@/src/lib/auth-client";

type KeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string | Date;
  enabled: boolean | null;
};

export default function AccountPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [minting, setMinting] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await authClient.apiKey.list();
    const rows = (res.data as unknown as { apiKeys?: KeyRow[] })?.apiKeys;
    if (Array.isArray(rows)) setKeys(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mint = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMinting(true);
    setFreshKey(null);
    const res = await authClient.apiKey.create({ name: name.trim() || "token" });
    setMinting(false);
    if (res.error) {
      setError(res.error.message ?? "Could not mint token");
      return;
    }
    setFreshKey(res.data?.key ?? null);
    setName("");
    void refresh();
  };

  const revoke = async (id: string) => {
    await authClient.apiKey.delete({ keyId: id });
    void refresh();
  };

  const copy = async () => {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  };

  const logout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-[100dvh] bg-bg font-sans text-primary">
      <div className="mx-auto w-full max-w-[640px] px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/app"
            className="flex items-center gap-1.5 text-[13px] text-muted hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Canvas
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-border/50 px-2.5 py-1 text-[12px] text-secondary hover:text-primary hover:border-border"
          >
            Sign out
          </button>
        </div>

        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-mono text-[14px] font-bold text-accent-text">
            {"{}"}
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold">Account</div>
            <div className="text-[12px] text-muted">
              {session?.user?.email ?? "…"}
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-border/60 bg-bg-secondary/60 p-4">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
            <KeyRound className="h-4 w-4 text-accent" />
            Personal access tokens
          </div>
          <p className="mb-3 text-[12px] text-muted">
            A token authenticates the MCP bridge and agents against your account.
            The full token is shown once, at creation.
          </p>

          <form onSubmit={mint} className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-border/50 bg-bg px-2.5 py-2 text-[13px] outline-none focus:border-accent/60 placeholder:text-muted/70"
              placeholder="token name (e.g. claude-desktop)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="submit"
              disabled={minting}
              className={cn(
                "rounded-md px-3 py-2 text-[13px] font-semibold transition-colors",
                minting
                  ? "bg-bg text-muted cursor-not-allowed"
                  : "bg-accent text-accent-text hover:bg-accent-hover"
              )}
            >
              {minting ? "Minting…" : "Mint token"}
            </button>
          </form>

          {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}

          {freshKey && (
            <div className="mt-3 rounded-md border border-accent/40 bg-accent/10 p-3">
              <div className="mb-1.5 text-[12px] text-secondary">
                Copy this now — you won&apos;t see it again. Paste it into your
                MCP config as{" "}
                <code className="font-mono text-accent">JUSTAPI_TOKEN</code>.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-bg px-2 py-1.5 font-mono text-[12px] text-primary">
                  {freshKey}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-1 rounded-md border border-border/50 px-2 py-1.5 text-[12px] text-secondary hover:text-primary"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            {loading ? (
              <div className="text-[12px] text-muted">Loading…</div>
            ) : keys.length === 0 ? (
              <div className="text-[12px] text-muted">No tokens yet.</div>
            ) : (
              keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center gap-3 rounded-md border border-border/40 px-3 py-2"
                >
                  <span className="flex-1 truncate text-[13px]">
                    {k.name || "token"}
                  </span>
                  {k.start && (
                    <code className="font-mono text-[12px] text-muted">
                      {k.start}…
                    </code>
                  )}
                  <button
                    type="button"
                    onClick={() => revoke(k.id)}
                    className="rounded p-1 text-muted hover:text-danger"
                    title="Revoke token"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
