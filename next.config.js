/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Supabase storage CDN for Project_Spore (us-east-1)
    domains: ["aehiqptugvakjtlvuixb.supabase.co"]
  },
  experimental: {
    typedRoutes: true
  }
};
module.exports = nextConfig;
