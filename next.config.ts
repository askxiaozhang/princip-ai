import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // youtubei.js uses some node-specific features that need to be external
  serverExternalPackages: ["youtubei.js"],
  // Enable experimental features if needed
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
