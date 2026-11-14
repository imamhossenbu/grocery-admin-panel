import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Admin reads (src/lib/cached-queries.ts): served from cache, refreshed
    // in the background after 10 s; admin writes invalidate immediately.
    admin: { stale: 30, revalidate: 10, expire: 600 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
