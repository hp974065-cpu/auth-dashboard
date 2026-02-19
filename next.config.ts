import type { NextConfig } from "next";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  serverExternalPackages: ["pdf-parse", "@mendable/firecrawl-js", "youtube-transcript"],

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
