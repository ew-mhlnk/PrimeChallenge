import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Проверяем, начинается ли путь с /api/
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/api/')) {
    // 2. Убираем префикс /api
    // Например: /api/tournaments -> /tournaments
    let targetPath = pathname.replace('/api', '');

    // 3. ХАК ДЛЯ СЛЕШЕЙ (FastAPI)
    // Если путь заканчивается не на слеш, и это tournaments/auth/leaderboard -> добавляем слеш
    const pathWithoutSlash = targetPath.replace(/^\//, ''); // убираем начальный слеш для проверки
    
    if (
      (pathWithoutSlash === 'tournaments' || 
       pathWithoutSlash === 'auth' || 
       pathWithoutSlash === 'leaderboard') && 
       !targetPath.endsWith('/')
    ) {
      targetPath += '/';
    }

    // 4. Формируем URL на Render
    const targetUrl = new URL(targetPath, 'https://primechallenge.onrender.com');
    
    // Переносим параметры запроса (например ?limit=10)
    targetUrl.search = request.nextUrl.search;

    console.log(`[Middleware] Proxy: ${pathname} -> ${targetUrl.toString()}`);

    // 5. Делаем Rewrite (Подмена адреса, браузер не заметит)
    return NextResponse.rewrite(targetUrl);
  }

  // Если это не API запрос, просто продолжаем
  return NextResponse.next();
}

// Настройка: Middleware будет срабатывать только на путях, начинающихся с /api/
export const config = {
  matcher: '/api/:path*',
};