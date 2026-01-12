import os
from dotenv import load_dotenv

# Загружаем .env если запускаем локально
load_dotenv()

# Читаем переменные окружения
TENNIS_API_KEY = os.getenv("TENNIS_API_KEY")
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
GOOGLE_CREDENTIALS = os.getenv("GOOGLE_CREDENTIALS")

# Проверяем, что ключи на месте
if not TENNIS_API_KEY:
    print("WARNING: TENNIS_API_KEY is missing!")

if not GOOGLE_SHEET_ID:
    print("WARNING: GOOGLE_SHEET_ID is missing!")
    
if not GOOGLE_CREDENTIALS:
    print("WARNING: GOOGLE_CREDENTIALS is missing!")