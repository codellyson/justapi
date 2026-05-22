"use client";

import { useDraftStore } from "../use-draft-store";
import type { AuthType } from "../../stores/use-request-store";
import { PopoverSection } from "./popover-section";

const OPTIONS: { value: AuthType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "bearer", label: "Bearer" },
  { value: "basic", label: "Basic" },
  { value: "api-key", label: "API key" },
];

const inputCls =
  "w-full px-2 py-1.5 rounded-md border border-border bg-bg text-[12px] font-mono focus:outline-none focus:border-accent";

export const PopoverAuth = () => {
  const authType = useDraftStore((s) => s.authType);
  const authConfig = useDraftStore((s) => s.authConfig);
  const setAuthType = useDraftStore((s) => s.setAuthType);
  const setAuthConfig = useDraftStore((s) => s.setAuthConfig);

  return (
    <PopoverSection popoverKey="auth" label="Auth">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 text-[12px] cursor-pointer"
            >
              <input
                type="radio"
                name="auth-type"
                checked={authType === opt.value}
                onChange={() => setAuthType(opt.value)}
                className="accent-[rgb(var(--accent))]"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {authType === "bearer" && (
          <input
            type="text"
            value={authConfig.bearerToken ?? ""}
            onChange={(e) => setAuthConfig({ bearerToken: e.target.value })}
            placeholder="token (supports {{variable}})"
            className={inputCls}
            spellCheck={false}
          />
        )}

        {authType === "basic" && (
          <div className="flex gap-2">
            <input
              type="text"
              value={authConfig.username ?? ""}
              onChange={(e) => setAuthConfig({ username: e.target.value })}
              placeholder="username"
              className={inputCls}
              spellCheck={false}
            />
            <input
              type="password"
              value={authConfig.password ?? ""}
              onChange={(e) => setAuthConfig({ password: e.target.value })}
              placeholder="password"
              className={inputCls}
              spellCheck={false}
            />
          </div>
        )}

        {authType === "api-key" && (
          <div className="flex gap-2">
            <input
              type="text"
              value={authConfig.apiKeyHeader ?? ""}
              onChange={(e) =>
                setAuthConfig({ apiKeyHeader: e.target.value })
              }
              placeholder="header name (e.g. X-API-Key)"
              className={inputCls}
              spellCheck={false}
            />
            <input
              type="text"
              value={authConfig.apiKey ?? ""}
              onChange={(e) => setAuthConfig({ apiKey: e.target.value })}
              placeholder="key value"
              className={inputCls}
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </PopoverSection>
  );
};
