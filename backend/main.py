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
if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN not set in environment variables")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_telegram_auth(init_data: str):
    try:
        parsed = parse_qs(init_data)
        hash_ = parsed.pop("hash")[0]

        data_check_string = '\n'.join(
            f"{k}={v[0]}" for k, v in sorted(parsed.items())
        )
        secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
        hmac_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        return hmac_hash == hash_, parsed
    except Exception as e:
        print(f"Auth check error: {e}")
        return False, {}

@app.get("/")
def read_root():
    return {"message": "Backend работает!"}

@app.post("/auth")
async def auth(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    init_data = body.get("initData")
    if not init_data:
        raise HTTPException(status_code=400, detail="No initData provided")

    is_valid, parsed = check_telegram_auth(init_data)
    if not is_valid:
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")

    user_data_json = parsed.get("user")
    if not user_data_json:
        raise HTTPException(status_code=400, detail="User not found in initData")

    try:
        user_data = json.loads(user_data_json[0])
        user_id = user_data["id"]
        first_name = user_data.get("first_name", "")
        last_name = user_data.get("last_name", "")
        username = user_data.get("username", "")

        existing_user = db.query(User).filter(User.user_id == user_id).first()
        if not existing_user:
            new_user = User(
                user_id=user_id,
                first_name=first_name,
                last_name=last_name,
                username=username
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)

        return {"status": "ok", "user_id": user_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing user data: {str(e)}")
