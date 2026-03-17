import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep dev-server output separate so a production build cannot corrupt a live dev session.
  distDir: isDevelopment ? ".next-dev" : ".next",
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
