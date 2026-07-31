"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "../utils/cn";
import { authClient } from "../lib/auth-client";

type Mode = "login" | "signup";

const input =
  "w-full rounded-md border border-border/50 bg-bg px-2.5 py-2 text-[13px] text-primary outline-none focus:border-accent/60 placeholder:text-muted/70";

export const AuthForm = ({ mode }: { mode: Mode }) => {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

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

  const isSignup = mode === "signup";

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
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to JustAPI?{" "}
              <Link href="/signup" className="text-accent hover:underline">
                Create an account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
