/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://primechallenge.onrender.com/:path*', // Прокси на Бэкенд
      },
    ];
  },
};

export default nextConfig;