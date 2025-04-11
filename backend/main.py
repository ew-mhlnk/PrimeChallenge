from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from urllib.parse import parse_qs
import hashlib
import hmac
import os
import json
from database.db import SessionLocal, engine
from database.models import Base, User

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
    parsed = parse_qs(init_data)
    hash_ = parsed.pop("hash")[0]
    data_check_string = '\n'.join(f"{k}={v[0]}" for k, v in sorted(parsed.items()))
    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
    hmac_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return hmac_hash == hash_, parsed

@app.post("/auth")
async def auth(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    init_data = body.get("initData")
    if not init_data:
        raise HTTPException(status_code=400, detail="No initData provided")

    valid, parsed = check_telegram_auth(init_data)
    if not valid:
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")

    user_data = parsed.get("user")
    if not user_data:
        raise HTTPException(status_code=400, detail="User not found")

    user = json.loads(user_data[0])
    user_id = user["id"]
    first_name = user["first_name"]

    existing = db.query(User).filter(User.user_id == user_id).first()
    if not existing:
        db_user = User(user_id=user_id, first_name=first_name)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    return {"status": "ok", "user_id": user_id}