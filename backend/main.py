from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from routers import tournaments, auth, picks, sync  # Убрали matches
import logging

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.include_router(tournaments.router, prefix="/tournaments")
app.include_router(auth.router, prefix="/auth")
app.include_router(picks.router, prefix="/picks")
app.include_router(sync.router, prefix="/sync")

scheduler = AsyncIOScheduler()
scheduler.start()

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    from services.sync_service import sync_google_sheets_with_db
    scheduler.add_job(sync_google_sheets_with_db, 'interval', days=1)

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the application and scheduler")
    scheduler.shutdown()