/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Ottimizzazione immagini abilitata (Vercel Image Optimization)
    // Rispetto a 'unoptimized: true', riduce banda del 30-50%
    minimumCacheTTL: 2678400, // 31 giorni cache
    formats: ["image/webp", "image/avif"], // Formati moderni
    remotePatterns: [
      // Dominio per logo email (imgbb)
      {
        protocol: "https",
        hostname: "i.ibb.co",
        pathname: "/**",
      },
      // Immagini profilo Google (per admin/auth)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Content Security Policy e altri header di sicurezza
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Content Security Policy - protegge da XSS e injection
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' blob: data: https://*.stripe.com https://lh3.googleusercontent.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://api.stripe.com https://accounts.google.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
              "form-action 'self' https://hooks.stripe.com",
              "base-uri 'self'",
              "object-src 'none'",
            ].join("; "),
          },
          // Previene clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Previene MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Controlla quante informazioni mandare ai referrer
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Abilita protezioni XSS del browser
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // HTTPS Strict Transport Security (solo in produzione)
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
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
