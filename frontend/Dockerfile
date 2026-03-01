FROM node:20-alpine

WORKDIR /app

# --- ВАЖНОЕ ДОПОЛНЕНИЕ ---
# 1. Объявляем аргумент (он придет из Coolify)
ARG NEXT_PUBLIC_YANDEX_METRICA_ID
# 2. Превращаем его в ENV, чтобы Next.js использовал его при 'npm run build'
ENV NEXT_PUBLIC_YANDEX_METRICA_ID=$NEXT_PUBLIC_YANDEX_METRICA_ID
# ------------------------

COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --ignore-scripts
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]