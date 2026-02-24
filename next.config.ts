import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Abilita source maps per il debugging
  productionBrowserSourceMaps: true,
  webpack: (config, { isServer, dev }) => {
    if (dev && isServer) {
      config.devtool = 'source-map'
    }
    return config
  },
};

export default nextConfig;
