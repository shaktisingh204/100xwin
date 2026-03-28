import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_PROXY_URL || 'https://zeero.bet/api'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
