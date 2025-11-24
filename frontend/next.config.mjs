/** @type {import('next').NextConfig} */
const nextConfig = {
  // === ВАЖНО: Эта настройка заставляет Next.js всегда добавлять "/" в конце ===
  // Это критично для FastAPI, который ждет /tournaments/, а не /tournaments
  trailingSlash: true,

  async rewrites() {
    return [
      {
        // Ловим всё, что начинается с /api/
        source: '/api/:path*',
        // Пересылаем на Render.
        // Vercel сам разберется с параметрами, благодаря trailingSlash
        destination: 'https://primechallenge.onrender.com/:path*',
      },
    ];
  },
};

export default nextConfig;