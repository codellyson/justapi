import { copyFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * next/og's Node build reads `noto-sans-v27-latin-regular.ttf` at import time
 * with a bare readFileSync, but next 15.5.22 only ships that font under the
 * `.ttf.bin` name its edge build expects. Any route using ImageResponse then
 * dies with ENOENT during prerender. Nothing in the ImageResponse API can avoid
 * the read, so restore the name the Node build asks for.
 *
 * Drop this once upstream ships both names.
 */
const require = createRequire(import.meta.url);
const ogDir = join(
  dirname(require.resolve("next/package.json")),
  "dist/compiled/@vercel/og"
);
const expected = join(ogDir, "noto-sans-v27-latin-regular.ttf");
const shipped = `${expected}.bin`;

if (existsSync(expected)) {
  process.exit(0);
}
if (!existsSync(shipped)) {
  console.warn(`[fix-og-font] no font to copy at ${shipped}; skipping`);
  process.exit(0);
}
copyFileSync(shipped, expected);
console.log("[fix-og-font] restored noto-sans-v27-latin-regular.ttf");
