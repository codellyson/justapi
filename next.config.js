/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // The canvas is the app now; old entry points (and their share links,
    // query strings are preserved) land on the root.
    return [
      { source: '/playground', destination: '/', permanent: false },
      { source: '/canvas', destination: '/', permanent: false },
      { source: '/expand', destination: '/', permanent: false },
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

module.exports = nextConfig;

