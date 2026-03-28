import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'spribe.co',
      },
      {
        protocol: 'https',
        hostname: 'ezugi.com',
      },
      {
        protocol: 'https',
        hostname: 'files.worldcasinoonline.com', // Added based on user SQL dump request
      },
      {
        protocol: 'https',
        hostname: 'kuberexchange.com',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net', // Cloudflare Images CDN
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_PROXY_URL || 'https://zeero.bet/api'}/:path*`, // Proxy to Backend
      },
      {
        source: '/api/auth/:path*',
        destination: 'https://zeero.bet/api/auth/:path*',
      },
      {
        source: '/api/seamless-casino/:path*',
        destination: 'https://zeero.bet/api/seamless-casino/:path*',
      },
      {
        source: '/api/bets/:path*',
        destination: 'https://zeero.bet/api/bets/:path*',
      },
    ];
  },
};

export default nextConfig;
