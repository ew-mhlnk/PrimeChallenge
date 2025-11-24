/** @type {import('next').NextConfig} */
const nextConfig = {
  // Важно: FastAPI (твой бэкенд) требует слеши в конце (например /tournaments/).
  // Этот параметр помогает Next.js не удалять их при перенаправлении.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      {
        // Перехватываем всё, что начинается с /api/
        source: '/api/:path*',
        // Отправляем на Render. 
        // Важно: :path* переносит и "хвост", и параметры запроса
        destination: 'https://primechallenge.onrender.com/:path*',
      },
    ];
  },
};

export default nextConfig;