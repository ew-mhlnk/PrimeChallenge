import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Игнорировать ошибки TS при сборке
  },
};

export default nextConfig;