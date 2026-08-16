import { apiKey } from "@better-auth/api-key";

/**
 * Auth config shared between the runtime instance (src/server/auth.ts, bound to
 * D1 per request) and the schema-generation config (better-auth-cli.ts). Keeping
 * plugins/options in one place stops the generated schema from drifting out of
 * sync with what the running app actually uses.
 */
export const sharedAuthConfig = {
  emailAndPassword: { enabled: true },
  plugins: [apiKey()],
};
