import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Игнорировать ошибки TS при сборке
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*', // Если фронт просит /api/что-то...
        destination: 'https://primechallenge.onrender.com/:path*', // ...отправляем это на бэкенд
      },
    ];
  },
};

export default nextConfig;