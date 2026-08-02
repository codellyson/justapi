"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "../utils/cn";
import { authClient } from "../lib/auth-client";
import type { SocialProviderFlags } from "../server/social-providers";
import { GoogleIcon, GithubIcon } from "./provider-icons";

type Mode = "login" | "signup";

const input =
  "w-full rounded-md border border-border/50 bg-bg px-2.5 py-2 text-[13px] text-primary outline-none focus:border-accent/60 placeholder:text-muted/70";

export const AuthForm = ({
  initialMode,
  providers,
}: {
  initialMode: Mode;
  providers?: SocialProviderFlags;
}) => {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res =
      mode === "signup"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Something went wrong");
      return;
    }
    router.push(next);
    router.refresh();
  };

  const social = async (provider: "google" | "github") => {
    setError(null);
    setBusy(true);
    // Redirects to the provider on success; only lands back here on failure.
    const res = await authClient.signIn.social({ provider, callbackURL: next });
    if (res?.error) {
      setError(res.error.message ?? "Couldn't start sign-in");
      setBusy(false);
    }
  };

  const isSignup = mode === "signup";
  const hasSocial = Boolean(providers?.google || providers?.github);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-4 font-sans">
      <div className="w-[360px] max-w-full rounded-xl border border-border/60 bg-bg-secondary/95 p-6 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-mono text-[13px] font-bold text-accent-text">
            {"{}"}
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-primary">JustAPI</div>
            <div className="text-[12px] text-muted">
              {isSignup ? "Create your account" : "Sign in to continue"}
            </div>
          </div>
        </div>

        {hasSocial && (
          <>
            <div className="space-y-2">
              {providers?.google && (
                <button
                  type="button"
                  onClick={() => social("google")}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border/60 bg-bg px-3 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-bg/60 disabled:opacity-60"
                >
                  <GoogleIcon className="h-4 w-4" />
                  Continue with Google
                </button>
              )}
              {providers?.github && (
                <button
                  type="button"
                  onClick={() => social("github")}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border/60 bg-bg px-3 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-bg/60 disabled:opacity-60"
                >
                  <GithubIcon className="h-4 w-4" />
                  Continue with GitHub
                </button>
              )}
            </div>
            <div className="my-4 flex items-center gap-3 text-[11px] text-muted">
              <span className="h-px flex-1 bg-border/50" />
              or
              <span className="h-px flex-1 bg-border/50" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-2.5">
          {isSignup && (
            <input
              className={input}
              type="text"
              placeholder="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          )}
          <input
            className={input}
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus={!isSignup}
          />
          <input
            className={input}
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={8}
            required
          />

          {error && (
            <p className="text-[12px] text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              "w-full rounded-md px-3 py-2 text-[13px] font-semibold transition-colors",
              busy
                ? "bg-bg text-muted cursor-not-allowed"
                : "bg-accent text-accent-text hover:bg-accent-hover"
            )}
          >
            {busy
              ? isSignup
                ? "Creating…"
                : "Signing in…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-[12px] text-muted">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="text-accent hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New to JustAPI?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="text-accent hover:underline"
              >
                Create an account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
