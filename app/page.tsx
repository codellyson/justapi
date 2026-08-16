import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/src/marketing/theme-toggle";

const TITLE = "JustAPI — an API client that thinks in flows";
const DESCRIPTION =
  "Drop requests on a canvas, wire a response value into the next call, and run the whole chain. Import cURL, fetch, HAR, or OpenAPI — and let an agent drive it.";
// Social cards truncate near 125 characters, so they get a tighter line than
// the search-result description.
const SOCIAL_DESCRIPTION =
  "Drop requests on a canvas, wire one response into the next, and run the whole chain. Import cURL, HAR, or OpenAPI.";

// Next replaces `openGraph`/`twitter` wholesale rather than deep-merging them,
// so every field the layout sets has to be repeated here or it is dropped.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "JustAPI",
    locale: "en_US",
    title: TITLE,
    description: SOCIAL_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@kreativekorna",
    title: TITLE,
    description: SOCIAL_DESCRIPTION,
  },
};

const Brand = ({ size = "md" }: { size?: "md" | "sm" }) => (
  <span className="flex items-center gap-2.5">
    <span
      className={
        "flex items-center justify-center rounded-lg bg-accent font-mono font-bold text-accent-text " +
        (size === "sm" ? "h-[26px] w-[26px] text-[12px]" : "h-7 w-7 text-[13px]")
      }
    >
      {"{}"}
    </span>
    <span className="text-[15px] text-primary">
      <span className="font-medium text-accent">just</span>
      <span className="font-bold">api</span>
    </span>
  </span>
);

const IDEAS = [
  {
    n: "01",
    title: "Chain, don't copy-paste",
    body: "Wire a value from one response into the next request. Bindings resolve in dependency order, and captures pull tokens into variables automatically.",
  },
  {
    n: "02",
    title: "Run the whole flow",
    body: "One click executes every request in order and grades your asserts as the responses land — “4 passed · 2 checks ✓”. No tab-hopping.",
  },
  {
    n: "03",
    title: "Agents drive it too",
    body: "Push a declarative flow over MCP and watch it materialize and run on the board, then read back a machine verdict. You supervise; the agent proves the API.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-bg font-sans">
      {/* NAV */}
      <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <Link href="/" className="no-underline">
          <Brand />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/app"
            className="whitespace-nowrap rounded-[10px] bg-accent px-[18px] py-2.5 text-sm font-semibold text-accent-text no-underline transition-colors hover:bg-accent-hover"
          >
            Open canvas
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="mx-auto max-w-[760px] px-6 pt-16 text-center md:px-12 md:pt-24">
        <div className="mb-[30px] text-xs tracking-[0.16em] text-muted">
          POSTMAN, AS A GRAPH
        </div>
        <h1 className="text-[42px] font-extrabold leading-none tracking-[-0.045em] text-primary sm:text-[54px] md:text-[66px]">
          Test APIs as a graph,
          <br />
          <span className="text-accent">not a folder of tabs.</span>
        </h1>
        <p className="mx-auto mt-[30px] max-w-[460px] text-[17px] leading-relaxed text-secondary md:text-[19px]">
          {DESCRIPTION}
        </p>
        <div className="mt-[38px] flex items-baseline justify-center gap-7">
          <Link
            href="/app"
            className="whitespace-nowrap border-b-[1.5px] border-accent pb-1 text-base font-semibold text-primary no-underline transition-colors hover:text-accent"
          >
            Open the canvas
          </Link>
          <Link
            href="/login"
            className="text-[15px] font-medium text-muted no-underline transition-colors hover:text-secondary"
          >
            sign in to sync
          </Link>
        </div>
      </header>

      {/* LIVE CANVAS EMBED */}
      <div className="mt-10 w-full px-4 md:mt-[72px] md:px-6">
        <div className="relative mx-auto max-w-[1180px] overflow-hidden rounded-2xl border border-border bg-bg-secondary">
          <iframe
            src="/app"
            title="the JustAPI canvas"
            loading="lazy"
            className="block h-[60vh] min-h-[420px] w-full border-0 md:h-[74vh] md:min-h-[600px]"
          />
          {/* On touch screens the live canvas swallows page scroll; a tap-through
              cover lets swipes scroll and a tap opens the real app. */}
          <Link
            href="/app"
            aria-label="Open the canvas"
            className="absolute inset-0 z-10 md:hidden"
          />
        </div>
      </div>

      {/* THREE IDEAS */}
      <section className="mx-auto mt-20 max-w-[1000px] px-6 md:mt-[130px] md:px-12">
        <div className="grid grid-cols-1 gap-10 border-t border-border pt-12 md:grid-cols-3 md:gap-12">
          {IDEAS.map((idea) => (
            <div key={idea.n}>
              <div className="mb-[18px] text-2xl font-extrabold leading-none tracking-[-0.02em] text-accent">
                {idea.n}
              </div>
              <h3 className="mb-2.5 text-[19px] font-semibold text-primary">
                {idea.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-secondary">
                {idea.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* EDITORIAL STATEMENT */}
      <section className="mx-auto mt-24 max-w-[760px] px-6 text-center md:mt-[140px] md:px-12">
        <div className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.04em] text-primary sm:text-[40px] md:text-[46px]">
          Tabs hide the flow.
          <br />
          <span className="text-accent">A graph proves it.</span>
        </div>
        <p className="mx-auto mt-[34px] max-w-[520px] text-[16px] leading-[1.65] text-secondary md:text-[17px]">
          Your canvases live in the browser, yours to keep. Sign in and the agent
          bridge opens: mint a token, and Claude (or any MCP client) can build a
          flow, run it on your board, and hand back a verdict — while you watch.
        </p>
      </section>

      {/* CLOSING CTA */}
      <section className="mx-auto mt-24 max-w-[860px] px-4 md:mt-[140px] md:px-12">
        <div className="rounded-3xl border border-border bg-bg-secondary px-6 py-14 text-center shadow-[0_30px_70px_-42px_rgba(0,0,0,0.5)] md:px-14 md:py-[90px]">
          <div className="mb-[26px] text-xs tracking-[0.16em] text-muted">
            READY WHEN YOU ARE
          </div>
          <div className="text-[32px] font-extrabold leading-[1.04] tracking-[-0.04em] text-primary sm:text-[40px] md:text-[48px]">
            Send the <span className="text-accent">first</span>
            <br />
            request.
          </div>
          <div className="mt-[38px] flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-[22px]">
            <Link
              href="/app"
              className="whitespace-nowrap rounded-xl bg-accent px-7 py-[15px] text-[15.5px] font-semibold text-accent-text no-underline transition-colors hover:bg-accent-hover"
            >
              Open the canvas
            </Link>
            <Link
              href="/login"
              className="whitespace-nowrap text-[15px] font-medium text-muted no-underline transition-colors hover:text-secondary"
            >
              or sign in to sync
            </Link>
          </div>
          <div className="mt-[22px] text-[13.5px] text-muted">
            Free, in your browser. No account needed to start.
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto mt-24 max-w-[1080px] px-6 md:mt-[140px] md:px-12">
        <div className="border-t border-border pt-12">
          <div className="flex flex-wrap items-start justify-between gap-10">
            <div className="max-w-[300px]">
              <div className="mb-4">
                <Brand size="sm" />
              </div>
              <div className="text-[18px] font-medium leading-[1.45] text-secondary">
                One canvas for every request.
                <br />
                Yours, and your agent&apos;s.
              </div>
            </div>
            <div className="flex flex-wrap gap-10 md:gap-16">
              <div>
                <div className="mb-4 text-[11px] tracking-[0.14em] text-muted">
                  PRODUCT
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/app" className="text-[14.5px] text-secondary no-underline transition-colors hover:text-accent">
                    Open canvas
                  </Link>
                  <Link href="/account" className="text-[14.5px] text-secondary no-underline transition-colors hover:text-accent">
                    Account &amp; tokens
                  </Link>
                  <Link href="/login" className="text-[14.5px] text-secondary no-underline transition-colors hover:text-accent">
                    Sign in
                  </Link>
                </div>
              </div>
              <div>
                <div className="mb-4 text-[11px] tracking-[0.14em] text-muted">
                  ELSEWHERE
                </div>
                <div className="flex flex-col gap-3">
                  <a href="https://github.com/codellyson/justapi" className="text-[14.5px] text-secondary no-underline transition-colors hover:text-accent">
                    GitHub
                  </a>
                  <a href="https://kreativekorna.com" className="whitespace-nowrap text-[14.5px] text-secondary no-underline transition-colors hover:text-accent">
                    Just Apps
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-2.5 border-t border-border pb-[52px] pt-[22px] text-[12.5px] text-muted">
            <span>
              © 2026 JustAPI · a just app by{" "}
              <a href="https://kreativekorna.com" className="text-secondary no-underline transition-colors hover:text-accent">
                KreativeKorna
              </a>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
