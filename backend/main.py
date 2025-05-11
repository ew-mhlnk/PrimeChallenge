from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import asyncio
from database.db import init_db, engine
from routers import auth, tournaments, picks, results
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

# Временный middleware для отладки CORS
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    logger.info(f"Processing request from origin: {request.headers.get('origin')}")
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "https://prime-challenge.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    logger.info(f"CORS headers added: {response.headers}")
    return response

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tournaments.router, prefix="", tags=["tournaments"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])
app.include_router(results.router, prefix="/results", tags=["results"])

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