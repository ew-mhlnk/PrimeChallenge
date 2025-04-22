import logging
from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from database.db import engine, SessionLocal, init_db
from routers import tournaments, picks, results, auth
from services.sync_service import sync_google_sheets_with_db

app = FastAPI()
scheduler = AsyncIOScheduler()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация базы данных
init_db()

# Подключаем маршруты
app.include_router(tournaments.router, prefix="/tournaments")
app.include_router(picks.router, prefix="/picks")
app.include_router(results.router, prefix="/results")
app.include_router(auth.router, prefix="/auth")

# Dependency для получения сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    await sync_google_sheets_with_db(engine)  # Немедленный вызов при старте
    scheduler.add_job(sync_google_sheets_with_db, 'interval', hours=24, args=[engine])
    scheduler.start()
    logger.info("Initial sync completed on startup")

@app.on_event("shutdown")
def shutdown_event():
    logger.info("Application shutdown")
    scheduler.shutdown()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/sync")
async def manual_sync(db: Session = Depends(get_db)):
    """
    Эндпоинт для ручного запуска синхронизации Google Sheets с базой данных.
    """
    logger.info("Manual sync triggered via /sync endpoint")
    try:
        await sync_google_sheets_with_db(engine)
        return JSONResponse(status_code=200, content={"message": "Sync completed successfully"})
    except Exception as e:
        logger.error(f"Error during manual sync: {str(e)}")
        return JSONResponse(status_code=500, content={"message": f"Sync failed: {str(e)}"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)