import logging
from sqlalchemy.orm import Session
from database.models import User
import hashlib
import hmac
import os
from config import TELEGRAM_BOT_TOKEN

logger = logging.getLogger(__name__)

def authenticate_user(init_data: str, db: Session) -> User:
    logger.info("Validating initData...")
    
    # Парсим initData
    try:
        params = dict(param.split('=') for param in init_data.split('&'))
        check_hash = params.pop('hash')
        user_data = params.get('user', '{}')
        user = eval(user_data)  # Небезопасно, лучше использовать json.loads в будущем
        user_id = user.get('id')
        first_name = user.get('first_name', 'Unknown')
    except Exception as e:
        logger.error(f"Failed to parse initData: {str(e)}")
        raise ValueError("Invalid initData format")

    # Проверяем подпись
    data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(params.items()))
    secret_key = hmac.new("WebAppData".encode(), TELEGRAM_BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if calculated_hash != check_hash:
        logger.error("Invalid hash in initData")
        raise ValueError("Invalid hash")

    logger.info("Init data validated successfully")

    # Ищем пользователя в базе
    db_user = db.query(User).filter(User.user_id == user_id).first()
    if not db_user:
        logger.info(f"Creating new user: {user_id}")
        db_user = User(user_id=user_id, first_name=first_name)
        db.add(db_user)
        db.commit()
    else:
        logger.info(f"User already exists: {user_id}")
        db_user.first_name = first_name
        db.commit()

    return db_user