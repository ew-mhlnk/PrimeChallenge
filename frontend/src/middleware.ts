import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Перехватываем все запросы на /api/
  if (pathname.startsWith('/api/')) {
    // Убираем префикс /api
    // Было: /api/tournaments -> Стало: /tournaments
    const targetPath = pathname.replace('/api', '');
    
    // Формируем полный URL на Render
    // search - это параметры запроса (?id=1&sort=date)
    const targetUrl = new URL(targetPath + search, 'https://primechallenge.onrender.com');

    console.log(`[Middleware] Proxying: ${pathname} -> ${targetUrl.toString()}`);

    // Делаем Rewrite (подмена адреса "под капотом")
    return NextResponse.rewrite(targetUrl);
  }

  return NextResponse.next();
}

// Настройка: применять только для путей, начинающихся с /api/
export const config = {
  matcher: '/api/:path*',
};