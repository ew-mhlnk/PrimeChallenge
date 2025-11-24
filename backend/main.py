from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from database.db import init_db, engine
from routers import auth, tournaments, picks
from services.sync_service import sync_google_sheets_with_db
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()

# === ИСПРАВЛЕННЫЙ CORS (МАКСИМАЛЬНО РАЗРЕШАЮЩИЙ) ===
app.add_middleware(
    CORSMiddleware,
    # Вместо списка origins используем regex, который разрешает ВСЁ
    # Это решит проблему, если ты заходишь с www или без, или с http/https
    allow_origin_regex="https?://.*", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Received request: {request.method} {request.url}")
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
    logger.info("Application startup")
    init_db()
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])
    scheduler.start()
    logger.info("Scheduler started")

@app.get("/sync")
@app.post("/sync")
async def manual_sync():
    await sync_google_sheets_with_db(engine)
    return {"message": "Sync completed successfully"}