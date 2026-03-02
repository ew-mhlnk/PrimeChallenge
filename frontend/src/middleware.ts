import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Перехватываем все запросы на /api/
  if (pathname.startsWith('/api/')) {
    // Убираем префикс /api
    const targetPath = pathname.replace('/api', '');
    
    // БЕРЕМ АДРЕС ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
    // Если переменной нет, фоллбек на локалхост (для разработки)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Создаем URL
    const targetUrl = new URL(targetPath + search, backendUrl);

    console.log(`[Middleware] Proxying: ${pathname} -> ${targetUrl.toString()}`);

    return NextResponse.rewrite(targetUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};