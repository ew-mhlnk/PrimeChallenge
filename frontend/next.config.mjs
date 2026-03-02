/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  
  // ОТКЛЮЧАЕМ ПРОВЕРКИ ДЛЯ ЭКОНОМИИ ПАМЯТИ
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', 
      },
    ],
  },
};

export default nextConfig;