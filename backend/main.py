from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging
from database.db import Base, engine
from routers import auth, tournaments, picks, results
from services.sync_service import sync_google_sheets_with_db

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

Base.metadata.create_all(bind=engine)

scheduler = AsyncIOScheduler()
scheduler.start()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tournaments.router, prefix="/tournaments", tags=["tournaments"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])
app.include_router(results.router, prefix="/results", tags=["results"])

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    scheduler.add_job(sync_google_sheets_with_db, 'interval', hours=24, args=[engine])
    logger.info("Initial sync completed on startup")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the application and scheduler")
    scheduler.shutdown()
    logger.info("Application shutdown complete")

@app.get("/")
async def root():
    return {"message": "Hello World"}