from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import logging
from init_data_py import InitData
from database.db import SessionLocal, engine
from database.models import Base, User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://prime-challenge.vercel.app"],  # Разрешаем запросы только с фронтенда
    allow_credentials=True,  # Разрешаем куки и заголовки авторизации
    allow_methods=["*"],     # Разрешаем все методы (GET, POST и т.д.)
    allow_headers=["*"],     # Разрешаем все заголовки
)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    logger.error("TELEGRAM_BOT_TOKEN not set in environment variables")
    raise RuntimeError("TELEGRAM_BOT_TOKEN is required")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "Backend работает!"}

@app.post("/auth")
async def auth(request: Request, db: Session = Depends(get_db)):
    logger.info("Auth endpoint accessed")
    try:
        body = await request.json()
        logger.debug(f"Request body: {body}")
        init_data_raw = body.get("initData")
        if not init_data_raw:
            logger.error("No initData provided in request")
            raise HTTPException(status_code=400, detail="No initData provided")

        logger.info("Validating initData...")
        try:
            init_data = InitData.parse(init_data_raw)
            init_data.validate(BOT_TOKEN, lifetime=3600)  # Проверка подписи с токеном
            logger.info("Init data validated successfully")
        except Exception as e:
            logger.error(f"Init data validation failed: {e}")
            raise HTTPException(status_code=403, detail="Invalid Telegram auth")

        user_data = init_data.user
        if not user_data:
            logger.error("User not found in initData")
            raise HTTPException(status_code=400, detail="User not found")

        user_id = user_data.id
        first_name = user_data.first_name
        logger.info(f"Authenticated user: {user_id}, {first_name}")

        existing = db.query(User).filter(User.user_id == user_id).first()
        if not existing:
            logger.info(f"Creating new user: {user_id}, {first_name}")
            db_user = User(user_id=user_id, first_name=first_name)
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            logger.info(f"User created: {user_id}")
        else:
            logger.info(f"User already exists: {user_id}")

        return {"status": "ok", "user_id": user_id}
    except Exception as e:
        logger.error(f"Unexpected error in auth endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")