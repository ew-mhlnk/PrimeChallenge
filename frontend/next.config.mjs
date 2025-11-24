/** @type {import('next').NextConfig} */
const nextConfig = {
  // Отключаем автоматические слеши, мы настроим их вручную ниже
  trailingSlash: false,

  async rewrites() {
    return [
      // 1. Турниры (FastAPI требует слеш в конце /)
      {
        source: '/api/tournaments',
        destination: 'https://primechallenge.onrender.com/tournaments/',
      },
      // 2. Авторизация (FastAPI требует слеш в конце /)
      {
        source: '/api/auth',
        destination: 'https://primechallenge.onrender.com/auth/',
      },
      // 3. Лидерборд (FastAPI требует слеш в конце /)
      {
        source: '/api/leaderboard',
        destination: 'https://primechallenge.onrender.com/leaderboard/',
      },
      // 4. Получение конкретного турнира (обычно слеш не нужен, но на всякий случай пересылаем ID)
      {
        source: '/api/tournament/:id',
        destination: 'https://primechallenge.onrender.com/tournament/:id',
      },
      // 5. Всё остальное (например, picks/bulk)
      // Здесь слеш НЕ добавляется, что идеально для picks/bulk
      {
        source: '/api/:path*',
        destination: 'https://primechallenge.onrender.com/:path*',
      },
    ];
  },
};

export default nextConfig;