import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  typedRoutes: true,
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
};

export default nextConfig;
