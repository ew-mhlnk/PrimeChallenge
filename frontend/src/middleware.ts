import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/api/')) {
    // 1. Убираем префикс /api
    // Например: /api/tournaments -> /tournaments
    const targetPath = pathname.replace('/api', '');

    // 2. Формируем URL на Render
    const targetUrl = new URL(targetPath, 'https://primechallenge.onrender.com');
    
    // Переносим параметры запроса
    targetUrl.search = request.nextUrl.search;

    console.log(`[Middleware] Proxy: ${pathname} -> ${targetUrl.toString()}`);

    return NextResponse.rewrite(targetUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};