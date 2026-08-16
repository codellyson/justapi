import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "../db/app-schema";

/**
 * Drizzle client for app-owned tables. Like getAuth(), it's built per request
 * because the D1 binding is only available per request on Workers.
 */
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}
