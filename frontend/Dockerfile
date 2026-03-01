# ЭТАП 1: Сборка (Builder)
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем только файлы зависимостей
# Используем package-lock.json*, звездочка нужна, чтобы не падало, если его нет
COPY package.json package-lock.json* ./

# ВАЖНО: Используем npm install вместо npm ci
# Это помогает избежать ошибок с памятью и отсутствующим lock-файлом
RUN npm install

# Копируем остальной код
COPY . .

# Аргументы и Переменные
ARG NEXT_PUBLIC_YANDEX_METRICA_ID
ENV NEXT_PUBLIC_YANDEX_METRICA_ID=$NEXT_PUBLIC_YANDEX_METRICA_ID

# Отключаем телеметрию Next.js для ускорения
ENV NEXT_TELEMETRY_DISABLED=1

# Билдим проект
RUN npm run build

# ЭТАП 2: Запуск (Runner) — Легкий образ
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Создаем пользователя, чтобы не запускать от root (безопасность)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем публичные файлы и статику
COPY --from=builder /app/public ./public

# Копируем собранное приложение (режим standalone)
# ВАЖНО: Для работы этого режима нужно настроить next.config.mjs (см. Шаг 2)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# Запускаем server.js (он создается автоматически в standalone режиме)
CMD ["node", "server.js"]