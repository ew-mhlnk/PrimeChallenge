import logging
import os
from fastapi import Header, HTTPException, status
from init_data_py import validate_by_hash

logger = logging.getLogger(__name__)

def verify_telegram_data(init_data_raw: str) -> dict:
    """
    Проверяет подпись Telegram initData.
    """
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN environment variable is not set")

    try:
        # 24 часа жизни токена
        init_data = validate_by_hash(init_data_raw, bot_token, expires_in=86400)
        
        user_data = init_data.user
        if not user_data:
            return None
            
        return {
            "id": user_data.id,
            "first_name": user_data.first_name or "Unknown",
            "last_name": user_data.last_name or "",
            "username": user_data.username or "",
            "language_code": user_data.language_code or "",
            "is_premium": user_data.is_premium or False,
            "allows_write_to_pm": user_data.allows_write_to_pm or False,
            "photo_url": user_data.photo_url or ""
        }
    except Exception as e:
        logger.warning(f"Telegram auth rejected: {type(e).__name__}: {e}")
        return None

async def get_current_user(authorization: str = Header(default=None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    init_data_raw = authorization
    user_data = verify_telegram_data(init_data_raw)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Telegram auth",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_data