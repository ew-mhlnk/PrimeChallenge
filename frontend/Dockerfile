# ЭТАП 1: Сборка (Builder)
FROM node:20-alpine AS builder
WORKDIR /app

# Ставим совместимость (нужна для некоторых библиотек)
RUN apk add --no-cache libc6-compat

# Копируем файлы зависимостей
COPY package.json package-lock.json* yarn.lock* ./

# ВАЖНО: Ограничиваем память Node.js (4GB)
ENV NODE_OPTIONS="--max-old-space-size=4096"

# ВАЖНО: Используем YARN вместо NPM
# --network-timeout спасает при медленной работе диска/сети
# --production=false гарантирует установку devDependencies (нужны для сборки)
RUN yarn install --network-timeout 1000000 --production=false

# Копируем код
COPY . .

# Аргументы сборки
ARG NEXT_PUBLIC_YANDEX_METRICA_ID
ENV NEXT_PUBLIC_YANDEX_METRICA_ID=$NEXT_PUBLIC_YANDEX_METRICA_ID

# Отключаем телеметрию и проверки
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_IGNORE_ESLINT=1
ENV NEXT_IGNORE_TYPE_CHECKS=1

# Билдим через Yarn
RUN yarn build

# ЭТАП 2: Запуск (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем статику
COPY --from=builder /app/public ./public

# Копируем Standalone сборку
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

# Запуск
CMD ["node", "server.js"]