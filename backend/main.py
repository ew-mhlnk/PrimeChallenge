from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from database.db import init_db, engine
from routers import auth, tournaments, picks
from services.sync_service import sync_google_sheets_with_db
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from routers import users # Импорт

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()

# === ЖЕЛЕЗОБЕТОННЫЙ СПИСОК DOMAINS ===
# Мы указываем конкретные адреса, которым можно стучаться к нам.
origins = [
    "http://localhost:3000",
    "https://prime-challenge.vercel.app",        # Твой фронт без слэша
    "https://prime-challenge.vercel.app/",       # Твой фронт со слэшем (на всякий случай)
    "https://primechallenge.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,    # Явный список
    allow_credentials=True,   # Разрешаем куки и заголовки авторизации
    allow_methods=["*"],      # Разрешаем все методы (GET, POST, OPTIONS...)
    allow_headers=["*"],      # Разрешаем все заголовки (Authorization и т.д.)
)

# Middleware для логирования
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Логируем origin, чтобы понять, кто стучится
    origin = request.headers.get("origin")
    logger.info(f"Request from Origin: {origin} -> {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Request failed: {e}")
        raise e

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tournaments.router, prefix="", tags=["tournaments"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup - CORS FIXED VERSION") # Метка в логах
    init_db()
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])
    scheduler.start()
    logger.info("Scheduler started")

@app.get("/sync")
@app.post("/sync")
async def manual_sync():
    await sync_google_sheets_with_db(engine)
    return {"message": "Sync completed successfully"}

# Тестовый роут, чтобы проверить, что деплой прошел
@app.get("/ping")
async def ping():
    return {"message": "pong", "cors": "fixed"}

app.include_router(users.router, prefix="/users", tags=["users"]) # Подключение