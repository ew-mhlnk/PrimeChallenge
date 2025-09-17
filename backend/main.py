from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database.db import init_db
from routers import auth, picks, tournaments, sync_service
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import asyncio
from config import settings

app = FastAPI()
scheduler = AsyncIOScheduler()

# Логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Middleware для CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware для логирования запросов
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response

# Подключение роутеров
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])
app.include_router(tournaments.router, prefix="/tournaments", tags=["tournaments"])
app.include_router(sync_service.router, prefix="/sync", tags=["sync"])

# Инициализация БД при старте
@app.on_event("startup")
async def startup_event():
    init_db()
    logger.info("Database initialized")
    scheduler.add_job(
        sync_service.sync_all_tournaments,
        trigger=IntervalTrigger(minutes=5),
        args=[app],
        id="sync_tournaments",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    logger.info("Scheduler shutdown")

# Обработка ошибок
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"message": f"An error occurred: {str(exc)}"},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)