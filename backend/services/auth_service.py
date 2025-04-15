from fastapi import HTTPException
import logging
from init_data_py import InitData
from config import TELEGRAM_BOT_TOKEN

logger = logging.getLogger(__name__)

def authenticate_user(init_data_raw: str):
    logger.info("Validating initData...")
    try:
        init_data = InitData.parse(init_data_raw)
        init_data.validate(TELEGRAM_BOT_TOKEN, lifetime=3600)
        logger.info("Init data validated successfully")
    except Exception as e:
        logger.error(f"Init data validation failed: {e}")
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")

    user_data = init_data.user
    if not user_data:
        logger.error("User not found in initData")
        raise HTTPException(status_code=400, detail="User not found")

    return user_data