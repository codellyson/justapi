/**
 * Secrets the Worker expects at runtime, set with `wrangler secret put`.
 *
 * `cf-typegen` only learns these from `.dev.vars`, which is gitignored, so a
 * clean checkout (CI) would otherwise typecheck against a CloudflareEnv that
 * has none of them. Declared here so the contract survives without the file —
 * types must stay `string` to merge with the generated declaration locally.
 */
interface CloudflareEnv {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}
