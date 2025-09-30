/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Supabase storage CDN for Project_Spore (us-east-1)
    domains: ["aehiqptugvakjtlvuixb.supabase.co"]
  },
  experimental: {
    typedRoutes: true
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
