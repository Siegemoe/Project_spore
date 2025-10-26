/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Image optimization
  images: {
    // Supabase storage CDN for Project_Spore (us-east-1)
    domains: ["aehiqptugvakjtlvuixb.supabase.co"],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Enable experimental features
  experimental: {
    typedRoutes: true,
  },
  
  // Headers for caching and security
  async headers() {
    return [
      {
        // Apply to static assets
        source: '/:path*.{jpg,jpeg,png,gif,webp,svg,ico,woff,woff2}',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Apply to API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=30, stale-while-revalidate=60',
          },
        ],
      },
    ];
  },
  
  // Exclude legacy supabase template directory from build
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/supabase/**']
    };
    return config;
  }
};

module.exports = nextConfig;
