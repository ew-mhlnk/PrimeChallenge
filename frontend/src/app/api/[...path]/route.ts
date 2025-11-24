import { NextRequest, NextResponse } from 'next/server';

// Адрес твоего бэкенда
const BACKEND_URL = 'https://primechallenge.onrender.com';

// В Next.js 15 params — это Promise. Нужно обновить тип и добавить await.
async function proxyHandler(
  req: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  // 1. Ждем разрешения Promise и получаем путь
  const resolvedParams = await params;
  const pathArray = resolvedParams.path;
  let path = pathArray.join('/');

  // 2. ЛОГИКА СЛЕШЕЙ
  // Добавляем слеш в конце только для определенных роутов, где FastAPI этого требует
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
            // Игнорируем ошибки парсинга JSON (если тело пустое)
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
    const contentType = backendResponse.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
        data = await backendResponse.json();
    } else {
        // Если вернулся не JSON (например, текст ошибки), читаем как текст
        const textData = await backendResponse.text();
        try {
             data = JSON.parse(textData);
        } catch {
             data = textData; // Возвращаем просто текст, если это не JSON
        }
    }

    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    console.error('[PROXY ERROR]', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export { proxyHandler as GET, proxyHandler as POST };