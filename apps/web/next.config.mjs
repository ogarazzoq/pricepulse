import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'fakestoreapi.com' },
      { protocol: 'https', hostname: 'cdn.dummyjson.com' },
      { protocol: 'https', hostname: 'i.dummyjson.com' },
      { protocol: 'https', hostname: 'dummyjson.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Kuai / Alicdn / Poizon
      { protocol: 'https', hostname: 'img.alicdn.com' },
      { protocol: 'https', hostname: 'cdn.poizon.com' },
      { protocol: 'https', hostname: 'cdn.u-code.io' },
      { protocol: 'https', hostname: '*.alicdn.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Webpack alias is registered explicitly so resolution does NOT depend on
  // tsconfig.paths being correctly picked up by the next/typescript plugin.
  // This is critical on Vercel monorepo builds where tsconfig path resolution
  // can be inconsistent if any path entry points outside the project root.
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
