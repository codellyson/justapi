import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sharedAuthConfig } from "./src/server/auth-shared";

/**
 * Schema-generation config only — consumed by `@better-auth/cli generate` to
 * emit src/db/schema.ts. It uses a dummy adapter (no real DB, no generated
 * schema import) so it can run before the schema exists. The plugins/options
 * come from sharedAuthConfig so the emitted schema matches the runtime app.
 */
export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: "sqlite" }),
  ...sharedAuthConfig,
});
