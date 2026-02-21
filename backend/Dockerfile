# Используем легкий Python 3.11
FROM python:3.11-slim

# Отключаем создание .pyc файлов и буферизацию
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Рабочая папка
WORKDIR /app

# === ИСПРАВЛЕНИЕ: Устанавливаем Git ===
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Копируем зависимости
COPY requirements.txt .

# Устанавливаем библиотеки
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код
COPY . .

# Открываем порт
EXPOSE 8000

# Запуск
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]