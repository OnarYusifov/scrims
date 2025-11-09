/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Transpile packages from the monorepo
  transpilePackages: [],

  // Development indicators
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },

  // Performance optimizations (swcMinify is enabled by default in Next.js 16)
  compress: true,
  
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // Cache images for 24 hours
  },

  // Experimental features for performance
  experimental: {
    optimizeCss: true,
  },

  // Standalone output for production (Railpack/Nixpacks)
  output: 'standalone',
};

module.exports = nextConfig;
