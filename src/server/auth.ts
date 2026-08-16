import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sharedAuthConfig } from "./auth-shared";
import * as schema from "../db/schema";

/**
 * The D1 binding is only available per-request on Workers, so better-auth is
 * built fresh per request from the request's env rather than a module singleton.
 */
export async function getAuth() {
  const { env } = await getCloudflareContext({ async: true });
  const db = drizzle(env.DB, { schema });
  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    // A provider is enabled only when both halves of its credential are set,
    // so the app runs fine before OAuth is configured (dev, or email-only).
    socialProviders: socialProvidersFrom(env),
    ...sharedAuthConfig,
  });
}

type Creds = { clientId: string; clientSecret: string };
function socialProvidersFrom(env: CloudflareEnv): {
  github?: Creds;
} {
  const providers: { github?: Creds } = {};
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }
  return providers;
}

export type Auth = Awaited<ReturnType<typeof getAuth>>;
