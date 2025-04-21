import os
from init_data_py import InitData

def verify_telegram_data(init_data_raw: str) -> dict:
    """
    Проверяет подпись Telegram initData с помощью библиотеки init-data-py.
    Возвращает данные пользователя, если подпись верна, иначе None.
    """
    # Получаем токен бота из переменной окружения
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN environment variable is not set")

    try:
        # Парсим и валидируем initData
        init_data = InitData.parse(init_data_raw)
        init_data.validate(bot_token, lifetime=3600)  # Проверяем подпись, срок жизни 1 час
        user_data = init_data.user
        if not user_data:
            return None
        # Возвращаем данные пользователя в виде словаря
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
    except Exception:
        return None