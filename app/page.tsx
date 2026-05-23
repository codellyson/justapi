"use client";

import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

const Pillar = ({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) => (
  <div className="space-y-2">
    <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
      {kicker}
    </p>
    <h3 className="text-base font-semibold text-primary">{title}</h3>
    <p className="text-sm text-secondary leading-relaxed">{body}</p>
  </div>
);

export default function Landing() {
  return (
    <main className="min-h-[100dvh] bg-bg text-primary flex flex-col">
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-mono text-[13px] text-primary">justapi</span>
        </div>
        <nav className="flex items-center gap-5 text-[12px] text-secondary">
          <Link href="/playground" className="hover:text-primary">
            Playground
          </Link>
          <a
            href="https://github.com/codellyson/justapi"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary inline-flex items-center gap-1.5"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted mb-5">
          api client · built for flow state
        </p>
        <h1 className="text-[44px] sm:text-[56px] leading-[1.05] font-semibold tracking-tight max-w-3xl">
          Type, send, drag,
          <br />
          send again.
        </h1>
        <p className="mt-5 max-w-xl text-secondary leading-relaxed">
          One input. Sends materialize as sheets you can stack, dismiss, and
          bring back. No tab-switching, no sidebars, no dropdowns mid-typing —
          just an API client that respects your rhythm.
        </p>
        <div className="mt-9 flex items-center gap-3">
          <Link
            href="/playground"
            className="group inline-flex items-center gap-2 rounded-md bg-accent text-accent-text px-4 py-2 text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            Open the playground
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="https://github.com/codellyson/justapi"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-secondary hover:text-primary hover:border-muted transition-colors"
          >
            <Github className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>
        <p className="mt-4 text-[11px] font-mono text-muted">
          no signup · runs in your browser · localStorage only
        </p>
      </section>

      <section className="border-t border-border/40">
        <div className="w-full max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          <Pillar
            kicker="01"
            title="The sheet is the response"
            body="Hit Enter and the result materializes as a draggable sheet with physics. Drag it down to dismiss, drag it back to revisit. Cards aren't tabs — they're objects."
          />
          <Pillar
            kicker="02"
            title="History is ambient"
            body="The last few requests sit visibly above the drawer as a peek rail. Click any to re-open. You see what you tested 30 seconds ago without leaving the surface."
          />
          <Pillar
            kicker="03"
            title="Workspaces, not tabs"
            body="Partition contexts (dev, staging, prod) into colored workspaces. Each carries its own draft and its own rail — switch with one click, no env-toggle anxiety."
          />
        </div>
      </section>

      <section className="border-t border-border/40">
        <div className="w-full max-w-5xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              Drift detection on every re-test.
            </h2>
            <p className="text-sm text-secondary mt-1">
              Hit the same endpoint again, see exactly what changed: status,
              shape, size. A free regression check, every time.
            </p>
          </div>
          <Link
            href="/playground"
            className="shrink-0 inline-flex items-center gap-2 text-sm text-accent hover:underline"
          >
            Try it
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40">
        <div className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-[11px] font-mono text-muted">
          <span>justapi · {new Date().getFullYear()}</span>
          <div className="flex items-center gap-4">
            <Link href="/playground" className="hover:text-primary">
              playground
            </Link>
            <Link href="/expand" className="hover:text-primary">
              legacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
