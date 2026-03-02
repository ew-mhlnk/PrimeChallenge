# 1. Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Ставим совместимость
RUN apk add --no-cache libc6-compat

# Копируем зависимости
COPY package.json package-lock.json* ./

# Устанавливаем зависимости (чисто и надежно)
RUN npm ci

# Копируем код
COPY . .

# Переменные (ВАЖНО! Без них сборка может быть кривой)
ARG NEXT_PUBLIC_YANDEX_METRICA_ID
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_YANDEX_METRICA_ID=$NEXT_PUBLIC_YANDEX_METRICA_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Отключаем телеметрию
ENV NEXT_TELEMETRY_DISABLED=1

# Билдим
RUN npm run build

# 2. Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем Standalone сборку
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]