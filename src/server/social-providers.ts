import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface SocialProviderFlags {
  google: boolean;
  github: boolean;
}

/** Which OAuth providers have credentials set — drives which buttons the auth
 *  form shows, so a provider is never offered before it's configured. */
export async function enabledSocialProviders(): Promise<SocialProviderFlags> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return {
      google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    };
  } catch {
    return { google: false, github: false };
  }
}
