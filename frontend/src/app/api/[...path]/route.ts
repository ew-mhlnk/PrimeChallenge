import { NextRequest, NextResponse } from 'next/server';

// Адрес бэкенда
const BACKEND_URL = 'https://primechallenge.onrender.com';

// В Next.js 15 второй аргумент (context) содержит params как Promise
export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, params);
}

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, params);
}

// Общая функция для обработки (чтобы не дублировать код)
async function handleRequest(req: NextRequest, paramsPromise: Promise<{ path: string[] }>) {
  try {
    // 1. Ждем параметры (Next.js 15 requirement)
    const resolvedParams = await paramsPromise;
    const pathArray = resolvedParams.path;
    let path = pathArray.join('/');

    // 2. Логика слешей (FastAPI требует слеш для tournaments и auth)
    if (path === 'tournaments' || path === 'auth' || path === 'leaderboard') {
       path += '/';
    }

    const url = `${BACKEND_URL}/${path}`;
    console.log(`[PROXY] ${req.method} -> ${url}`);

    // 3. Тело запроса
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        try {
            const jsonBody = await req.json();
            body = JSON.stringify(jsonBody);
        } catch {
            // Игнорируем, если тела нет
        }
    }

    // 4. Заголовки
    const headers = new Headers(req.headers);
    headers.delete('host');
    if (req.method === 'POST' && body) {
        headers.set('Content-Type', 'application/json');
    }

    // 5. Запрос к Render
    const backendResponse = await fetch(url, {
      method: req.method,
      headers: headers,
      body: body,
      cache: 'no-store',
    });

    // 6. Ответ
    const contentType = backendResponse.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
        data = await backendResponse.json();
    } else {
        const text = await backendResponse.text();
        try { data = JSON.parse(text); } catch { data = text; }
    }

    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    console.error('[PROXY ERROR]', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}