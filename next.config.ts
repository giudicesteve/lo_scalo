/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  redirects: async () => [
    {
      source: "/admin/gift-card-templates",
      destination: "/admin/shop",
      permanent: true,
    },
    {
      source: "/admin/orders/daily-report",
      destination: "/admin/accounting",
      permanent: true,
    },
  ],
  productionBrowserSourceMaps: true,
  webpack: (config: { devtool: string }, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    if (dev && isServer) {
      config.devtool = "source-map";
    }
    return config;
  },
};

export default nextConfig;
