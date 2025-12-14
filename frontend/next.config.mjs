/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Разрешаем загрузку картинок с любых HTTPS сайтов
      },
    ],
  },
};

export default nextConfig;