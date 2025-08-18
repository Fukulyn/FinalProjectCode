import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // ... other config options
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
        hostname: 'www.hartz.com',
        port: '',
        pathname: '/**',
      },
      // Add the new pattern for the vidavetcare.com domain
      {
        protocol: 'https',
        hostname: 'www.vidavetcare.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.britannica.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'doghealth.east.org.tw',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;