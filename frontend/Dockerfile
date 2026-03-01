# ЭТАП 1: Сборка
FROM node:20-alpine AS builder
WORKDIR /app

# Ставим зависимости для сборки (иногда нужны для alpine)
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./

# ВАЖНО: Ограничиваем память для Node.js до 4GB, чтобы он не сходил с ума
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Увеличиваем таймаут npm, чтобы не падал на медленном интернете/диске
RUN npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-retries 5 \
    && npm install

COPY . .

ARG NEXT_PUBLIC_YANDEX_METRICA_ID
ENV NEXT_PUBLIC_YANDEX_METRICA_ID=$NEXT_PUBLIC_YANDEX_METRICA_ID
ENV NEXT_TELEMETRY_DISABLED=1

# Сборка
RUN npm run build

# ЭТАП 2: Запуск
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]