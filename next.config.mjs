/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to this repo; a stray package-lock.json in the
  // home dir otherwise makes Next infer the wrong workspace root, which throws
  // off the opennextjs build's file tracing.
  outputFileTracingRoot: import.meta.dirname,
  async redirects() {
    // The canvas lives at /app now (/ is the landing page). Old entry points
    // land there, and legacy /?s=ID share links carry their id across.
    return [
      { source: '/playground', destination: '/app', permanent: false },
      { source: '/canvas', destination: '/app', permanent: false },
      { source: '/expand', destination: '/app', permanent: false },
      {
        source: '/',
        // `.+`, not `.*`: an empty match still satisfies the condition, and the
        // destination then fails to compile with a blank :s — which 500s every
        // plain `/` request.
        has: [{ type: 'query', key: 's', value: '(?<s>.+)' }],
        destination: '/app?s=:s',
        permanent: false,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;

// Injects the Cloudflare bindings (D1, R2, …) into `next dev` via a local
// miniflare instance, so getCloudflareContext() works the same in dev as on
// the deployed Worker. Dev-only: during `next build` there is no dev server to
// attach to, and starting miniflare there crashes the build.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}
