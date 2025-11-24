import { NextRequest, NextResponse } from 'next/server';

// Адрес твоего бэкенда
const BACKEND_URL = 'https://primechallenge.onrender.com';

async function proxyHandler(req: NextRequest, { params }: { params: { path: string[] } }) {
  // 1. Получаем путь из URL
  const pathArray = params.path;
  let path = pathArray.join('/');

  // 2. ЛОГИКА СЛЕШЕЙ
  // Добавляем слеш в конце только для определенных роутов, где FastAPI это требует
  if (path === 'tournaments' || path === 'auth') {
     path += '/';
  }

  const url = `${BACKEND_URL}/${path}`;
  
  console.log(`[PROXY] Пересылаю ${req.method} на: ${url}`);

  try {
    // 3. Подготовка тела запроса (если это POST)
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        try {
            const jsonBody = await req.json();
            body = JSON.stringify(jsonBody);
        } catch {
            // ИСПРАВЛЕНО: убрали (e), чтобы линтер не ругался.
            // Если тела нет или оно не JSON, просто игнорируем ошибку.
        }
    }

    // 4. Пересылка запроса
    const headers = new Headers(req.headers);
    headers.delete('host'); // Убираем хост Vercel
    
    // ВАЖНО: Принудительно ставим Content-Type для POST с JSON
    if (req.method === 'POST' && body) {
        headers.set('Content-Type', 'application/json');
    }

    const backendResponse = await fetch(url, {
      method: req.method,
      headers: headers,
      body: body,
      cache: 'no-store', // Не кэшировать API запросы
    });

    // 5. Возврат ответа фронтенду
    // Проверяем, есть ли контент в ответе, прежде чем парсить JSON
    const contentType = backendResponse.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
        data = await backendResponse.json();
    } else {
        data = await backendResponse.text();
        try {
             data = JSON.parse(data);
        } catch {
             // Если это не JSON, возвращаем как есть или пустой объект
             // data остается текстом
        }
    }

    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    console.error('[PROXY ERROR]', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export { proxyHandler as GET, proxyHandler as POST };