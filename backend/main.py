from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import asyncio
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

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://prime-challenge.vercel.app",
        "https://primechallenge.onrender.com",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Логирование запросов для отладки
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Received request: {request.method} {request.url}")
    logger.info(f"Origin: {request.headers.get('origin')}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

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
    await sync_google_sheets_with_db(engine)
    logger.info("Initial sync completed on startup")

@app.get("/sync")
@app.post("/sync")
async def manual_sync():
    await sync_google_sheets_with_db(engine)
    return {"message": "Sync completed successfully"}