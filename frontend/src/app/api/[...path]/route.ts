import { NextRequest, NextResponse } from 'next/server';

// Адрес бэкенда
const BACKEND_URL = 'https://primechallenge.onrender.com';

// === GET запрос ===
export async function GET(
  req: NextRequest, 
  props: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, props.params);
}

// === POST запрос ===
export async function POST(
  req: NextRequest, 
  props: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, props.params);
}

// === Логика пересылки ===
async function handleRequest(req: NextRequest, paramsPromise: Promise<{ path: string[] }>) {
  try {
    // 1. Ждем параметры (Next.js 15)
    const resolvedParams = await paramsPromise;
    const pathArray = resolvedParams.path;
    
    let path = pathArray.join('/');

    // 2. ХАК ДЛЯ СЛЕШЕЙ:
    if (path === 'tournaments' || path === 'auth' || path === 'leaderboard') {
       path += '/';
    }

    const url = `${BACKEND_URL}/${path}`;
    console.log(`[PROXY] ${req.method} запрос на: ${url}`);

    // 3. Обработка тела запроса
    let body;
    if (req.method === 'POST') {
        try {
            const jsonBody = await req.json();
            body = JSON.stringify(jsonBody);
        } catch {
            // Игнорируем отсутствие тела
        }
    }

    // 4. Подготовка заголовков
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('connection');
    
    if (req.method === 'POST' && body) {
        headers.set('Content-Type', 'application/json');
    }

    // 5. Отправляем запрос на Render
    const backendResponse = await fetch(url, {
      method: req.method,
      headers: headers,
      body: body,
      cache: 'no-store',
    });

    // 6. Читаем ответ
    // (Мы убрали переменную contentType, чтобы линтер не ругался)
    let data;
    const textData = await backendResponse.text();
    
    try {
        // Пробуем превратить в JSON
        data = JSON.parse(textData);
    } catch {
        // Если не вышло (например, пришла HTML ошибка), оставляем как текст
        data = textData;
    }

    // 7. Возвращаем ответ
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    console.error('[PROXY ERROR]', error);
    return NextResponse.json({ error: 'Proxy internal error' }, { status: 500 });
  }
}