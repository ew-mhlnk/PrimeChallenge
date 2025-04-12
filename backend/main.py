from fastapi import FastAPI, Depends, HTTPException, Request
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

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Backend работает!"}

@app.post("/auth")
async def auth(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    init_data_raw = body.get("initData")
    if not init_data_raw:
        raise HTTPException(status_code=400, detail="No initData provided")

    try:
        init_data = InitData.parse(init_data_raw)
        init_data.validate(BOT_TOKEN, lifetime=3600)  # Validate with 1 hour lifetime
    except Exception as e:
        logger.error(f"Init data validation failed: {e}")
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")

    user_data = init_data.user
    if not user_data:
        raise HTTPException(status_code=400, detail="User not found")

    user_id = user_data.id
    first_name = user_data.first_name

    existing = db.query(User).filter(User.user_id == user_id).first()
    if not existing:
        db_user = User(user_id=user_id, first_name=first_name)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    return {"status": "ok", "user_id": user_id}