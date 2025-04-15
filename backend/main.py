from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from routers import auth, tournaments, picks, results
from database.models import Base
from database.db import engine
from services.sync_service import sync_google_sheets_with_db
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все источники для теста
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(tournaments.router, prefix="/tournaments")
app.include_router(picks.router, prefix="/picks")
app.include_router(results.router, prefix="/results")

scheduler = BackgroundScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the application and scheduler")
    sync_google_sheets_with_db()
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

@app.get("/sync")
async def manual_sync():
    logger.info("Manual sync triggered")
    sync_google_sheets_with_db()
    return {"message": "Sync completed"}