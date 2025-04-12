from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from urllib.parse import parse_qs
import hashlib
import hmac
import os
import json
import logging
from database.db import SessionLocal, engine
from database.models import Base, User

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_telegram_auth(init_data: str):
    logger.info("Checking Telegram auth...")
    parsed = parse_qs(init_data)
    hash_ = parsed.pop("hash")[0]
    data_check_string = '\n'.join(f"{k}={v[0]}" for k, v in sorted(parsed.items()))
    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
    hmac_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    logger.info(f"Auth valid: {hmac_hash == hash_}")
    return hmac_hash == hash_, parsed

@app.get("/")
def read_root():
    return {"message": "Backend работает!"}

@app.post("/auth")
async def auth(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    init_data = body.get("initData")
    logger.info(f"Received initData: {init_data}")
    if not init_data:
        logger.error("No initData provided")
        raise HTTPException(status_code=400, detail="No initData provided")

    valid, parsed = check_telegram_auth(init_data)
    if not valid:
        logger.error("Invalid Telegram auth")
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")

    user_data = parsed.get("user")
    if not user_data:
        logger.error("User not found")
        raise HTTPException(status_code=400, detail="User not found")

    user = json.loads(user_data[0])
    user_id = user["id"]
    first_name = user["first_name"]
    logger.info(f"Authenticated user: {user_id}, {first_name}")

    existing = db.query(User).filter(User.user_id == user_id).first()
    if not existing:
        db_user = User(user_id=user_id, first_name=first_name)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"Created new user: {user_id}")

    return {"status": "ok", "user_id": user_id}