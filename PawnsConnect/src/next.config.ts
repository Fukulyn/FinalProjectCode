import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
  },
  // The rewrite rule is no longer needed with the new architecture.
  allowedDevOrigins: [
    '6000-firebase-studio-1750221808565.cluster-fkltigo73ncaixtmokrzxhwsfc.cloudworkstations.dev',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'doghealth.east.org.tw',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/photos/**',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'attach.mobile01.com',
        port: '',
        pathname: '/attach/**',
      },
      // 這是更新後的設定，使用更通用的路徑來涵蓋所有 googleusercontent.com 的圖片
      {
        protocol: 'http',
        hostname: 'googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      // 新增 pikbest.com 網域
      {
        protocol: 'https',
        hostname: 'img.pikbest.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;