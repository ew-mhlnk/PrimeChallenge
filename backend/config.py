import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")

# === ВАЖНЫЙ ФИКС ===
# Пытаемся прочитать под разными именами, чтобы не падало
GOOGLE_CREDENTIALS = os.getenv("GOOGLE_SHEETS_CREDENTIALS") or os.getenv("GOOGLE_CREDENTIALS")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TENNIS_API_KEY = os.getenv("TENNIS_API_KEY")

if not TELEGRAM_BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is required")
if not GOOGLE_SHEET_ID:
    raise RuntimeError("GOOGLE_SHEET_ID is required")

if not GOOGLE_CREDENTIALS:
    # Выводим подсказку, что именно не найдено
    raise RuntimeError("GOOGLE_CREDENTIALS (or GOOGLE_SHEETS_CREDENTIALS) is required in Environment Variables")