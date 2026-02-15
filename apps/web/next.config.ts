import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  reactCompiler: true,
  async rewrites() {
    const serverUrl = process.env.SERVER_URL || "http://server:3000";
    return [
      { source: "/trpc/:path*", destination: `${serverUrl}/trpc/:path*` },
      { source: "/api/auth/:path*", destination: `${serverUrl}/api/auth/:path*` },
    ];
  },
};

export default nextConfig;
