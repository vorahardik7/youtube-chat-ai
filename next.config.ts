import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '', // Usually empty for standard https port 443
        pathname: '/a/**', // Allows any path starting with /a/ which Google uses
      },
      // Add other domains if needed
    ],
  },
};

export default nextConfig;
