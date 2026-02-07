import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // Optimize for production
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
