import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config: JustAPI is a client-rendered canvas with no ISR/SSG caching
// to persist, so no incremental cache override is needed.
export default defineCloudflareConfig({});
