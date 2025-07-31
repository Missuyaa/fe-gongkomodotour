import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'api.gongkomodotour.com',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      }
    ],
    domains: ['localhost', 'lh3.googleusercontent.com'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Tambahkan konfigurasi untuk menangani error
    minimumCacheTTL: 60,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // eslint: {
  //   // Menonaktifkan ESLint saat proses `yarn build`
  //   ignoreDuringBuilds: true,
  // },
  // typescript: {
  //   // Menonaktifkan pengecekan tipe TypeScript saat `yarn build`
  //   ignoreBuildErrors: true,
  // },

  // experimental: {
  //   workerThreads: false,
  //   cpus: 4,
  // }
};

export default nextConfig;
