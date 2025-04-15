from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from routers import auth, tournaments, picks, results
from services.sync_service import sync_google_sheets_with_db
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://prime-challenge.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роуты
app.include_router(auth.router, prefix="/auth")
app.include_router(tournaments.router, prefix="/tournaments")
app.include_router(picks.router, prefix="/picks")
app.include_router(results.router, prefix="/results")

# Настройка планировщика задач
scheduler = BackgroundScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the application and scheduler")
    # Запускаем синхронизацию сразу при старте
    sync_google_sheets_with_db()
    # Настраиваем задачу на выполнение каждый час
    scheduler.add_job(
        sync_google_sheets_with_db,
        trigger=IntervalTrigger(hours=1),
        id="sync_google_sheets",
        replace_existing=True
    )
    scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the application and scheduler")
    scheduler.shutdown()

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "Backend работает!"}