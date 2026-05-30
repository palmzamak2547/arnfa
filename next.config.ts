import type { NextConfig } from "next";

/**
 * Security headers live in middleware.ts (not here): an async headers() in
 * next.config conflicts with next/font under Next 16 Turbopack and 500s dev.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
