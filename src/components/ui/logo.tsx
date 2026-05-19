import { cn } from "../../utils/cn";

export type LogoVariant = "full" | "mark" | "wordmark" | "default";

interface LogoProps {
  /**
   * `full` (default) — JA monogram + JUSTAPI wordmark.
   * `mark` — JA monogram only (square; favicon / extension icon).
   * `wordmark` — JUSTAPI text only.
   */
  variant?: LogoVariant;
  className?: string;
}

export const Logo = ({ variant = "full", className }: LogoProps) => {
  const showMark = variant === "full" || variant === "default" || variant === "mark";
  const showWordmark = variant === "full" || variant === "default" || variant === "wordmark";

  return (
    <div className={cn("inline-flex items-center gap-2 leading-none", className)}>
      {showMark && (
        <svg
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full aspect-square shrink-0"
          aria-label="JUSTAPI"
        >
          <rect
            x="0"
            y="0"
            width="128"
            height="128"
            rx="28"
            fill="rgb(var(--accent))"
          />
          <path
            d="M 92 24 L 92 76 A 28 28 0 0 1 36 76 L 52 76 A 12 12 0 0 0 76 76 L 76 24 Z"
            fill="rgb(var(--accent-text))"
          />
        </svg>
      )}
      {showWordmark && (
        <span
          className="font-bold text-primary text-base"
          style={{ letterSpacing: "-0.015em" }}
        >
          JUST<span className="text-accent">API</span>
        </span>
      )}
    </div>
  );
};
