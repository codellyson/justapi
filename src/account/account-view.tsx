"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  KeyRound,
  Link2,
  Trash2,
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { authClient, useSession, signOut } from "@/src/lib/auth-client";
import { GoogleIcon, GithubIcon } from "@/src/auth/provider-icons";
import type { SocialProviderFlags } from "@/src/server/social-providers";

type KeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string | Date;
  lastRequest: string | Date | null;
  enabled: boolean | null;
};

type AccountRow = {
  id: string;
  providerId: string;
  accountId: string;
  createdAt: string | Date;
};

const providerMeta = {
  google: { label: "Google", Icon: GoogleIcon },
  github: { label: "GitHub", Icon: GithubIcon },
} as const;
type OAuthProvider = keyof typeof providerMeta;

const relTime = (d?: string | Date | null): string => {
  if (!d) return "never";
  const t = typeof d === "string" ? Date.parse(d) : d.getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
};

const fullDate = (d?: string | Date | null): string => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const AccountView = ({
  providers,
}: {
  providers: SocialProviderFlags;
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [minting, setMinting] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [keyRes, acctRes] = await Promise.all([
      authClient.apiKey.list(),
      authClient.listAccounts(),
    ]);
    const rows = (keyRes.data as unknown as { apiKeys?: KeyRow[] })?.apiKeys;
    if (Array.isArray(rows)) setKeys(rows);
    if (Array.isArray(acctRes.data)) setAccounts(acctRes.data as AccountRow[]);
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

  const connect = async (provider: OAuthProvider) => {
    setError(null);
    setBusyProvider(provider);
    const res = await authClient.linkSocial({ provider, callbackURL: "/account" });
    if (res?.error) {
      setError(res.error.message ?? "Couldn't start linking");
      setBusyProvider(null);
    }
  };

  const disconnect = async (provider: OAuthProvider) => {
    setError(null);
    setBusyProvider(provider);
    const res = await authClient.unlinkAccount({ providerId: provider });
    setBusyProvider(null);
    if (res?.error) {
      setError(res.error.message ?? "Couldn't unlink");
      return;
    }
    void refresh();
  };

  const logout = async () => {
    await signOut();
    router.push("/login");
  };

  const connectedIds = new Set(accounts.map((a) => a.providerId));
  const hasPassword = connectedIds.has("credential");
  // Never strand the account: unlinking is only allowed while another way to
  // sign in remains (a password, or another linked provider).
  const loginMethodCount = accounts.length;
  const initials = (user?.name || user?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  // Rows to render: any configured provider, plus any already-linked provider
  // (so a provider linked before its credentials were removed still shows).
  const oauthRows = (Object.keys(providerMeta) as OAuthProvider[]).filter(
    (p) => providers[p] || connectedIds.has(p)
  );

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

        <div className="mb-6 flex items-center gap-3">
          {user?.image ? (
            <div
              role="img"
              aria-label="Profile photo"
              className="h-11 w-11 rounded-full border border-border/60 bg-cover bg-center"
              style={{ backgroundImage: `url("${encodeURI(user.image)}")` }}
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-mono text-[15px] font-bold text-accent-text">
              {initials || "{}"}
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold">
                {user?.name || "Account"}
              </span>
              {user?.emailVerified && (
                <BadgeCheck
                  className="h-4 w-4 shrink-0 text-accent"
                  aria-label="Email verified"
                />
              )}
            </div>
            <div className="truncate text-[12px] text-muted">
              {user?.email ?? "…"}
            </div>
            {user?.createdAt && (
              <div className="text-[11px] text-muted/80">
                Member since {fullDate(user.createdAt)}
              </div>
            )}
          </div>
        </div>

        {error && <p className="mb-3 text-[12px] text-danger">{error}</p>}

        <section className="mb-4 rounded-xl border border-border/60 bg-bg-secondary/60 p-4">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
            <Link2 className="h-4 w-4 text-accent" />
            Connected accounts
          </div>
          <p className="mb-3 text-[12px] text-muted">
            Sign in with a linked provider, or keep your email &amp; password.
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-3 rounded-md border border-border/40 px-3 py-2">
              <KeyRound className="h-4 w-4 text-muted" />
              <span className="flex-1 text-[13px]">Email &amp; password</span>
              <span className="text-[12px] text-muted">
                {hasPassword ? "Enabled" : "Not set"}
              </span>
            </div>

            {oauthRows.map((p) => {
              const { label, Icon } = providerMeta[p];
              const linked = connectedIds.has(p);
              const canUnlink = linked && loginMethodCount > 1;
              const busy = busyProvider === p;
              return (
                <div
                  key={p}
                  className="flex items-center gap-3 rounded-md border border-border/40 px-3 py-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-[13px]">{label}</span>
                  {linked ? (
                    <button
                      type="button"
                      onClick={() => canUnlink && disconnect(p)}
                      disabled={!canUnlink || busy}
                      title={
                        canUnlink
                          ? `Unlink ${label}`
                          : "Add another sign-in method before unlinking this one"
                      }
                      className={cn(
                        "rounded-md border px-2 py-1 text-[12px] transition-colors",
                        canUnlink
                          ? "border-border/50 text-secondary hover:text-danger hover:border-danger/40"
                          : "border-border/30 text-muted/60 cursor-not-allowed"
                      )}
                    >
                      {busy ? "…" : canUnlink ? "Unlink" : "Connected"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => connect(p)}
                      disabled={busy}
                      className="rounded-md border border-border/50 px-2 py-1 text-[12px] text-secondary hover:text-primary hover:border-border disabled:opacity-60"
                    >
                      {busy ? "…" : "Connect"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

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
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px]">
                      {k.name || "token"}
                    </div>
                    <div className="text-[11px] text-muted">
                      created {relTime(k.createdAt)} · last used{" "}
                      {relTime(k.lastRequest)}
                    </div>
                  </div>
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
};
