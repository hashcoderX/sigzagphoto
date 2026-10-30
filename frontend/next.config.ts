import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow optimized remote images from Unsplash used across the app
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8005",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8005",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "sigzagphoto.com",
        port: "8005",
        pathname: "/storage/**",
      },
      {
        protocol: "https",
        hostname: "sigzagphoto.com",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
