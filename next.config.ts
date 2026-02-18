import type { NextConfig } from "next";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  serverExternalPackages: ["pdf-parse", "@mendable/firecrawl-js"],
};

export default nextConfig;
