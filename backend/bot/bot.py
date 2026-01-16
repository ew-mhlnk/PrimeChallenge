import os
import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# --- КОНФИГУРАЦИЯ ---
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")
ADMIN_ID = int(os.getenv("ADMIN_ID", "360269274"))
MINI_APP_URL = "https://prime-challenge.vercel.app/"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Подключение к БД
if not DATABASE_URL:
    logger.error("DATABASE_URL is missing!")
else:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    engine = create_engine(DATABASE_URL)
except Exception as e:
    logger.error(f"DB Connection failed: {e}")
    engine = None

bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()

# --- ХЕЛПЕРЫ ---
def get_all_user_ids():
    if not engine: return []
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT user_id FROM users"))
            return [row[0] for row in result]
    except Exception as e:
        logger.error(f"DB Error: {e}")
        return []

# --- ХАНДЛЕРЫ ---

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🎾 Играть в Prime Bracket", web_app=WebAppInfo(url=MINI_APP_URL))]
        ]
    )
    
    user_name = message.from_user.first_name
    
    await message.answer(
        f"Привет, <b>{user_name}</b>! 👋\n\n"
        "🎾 Australian Open в самом разгаре!\n"
        "👉 Делай прогнозы, соревнуйся с друзьями и поднимайся в рейтинге.\n\n"
        "Жми кнопку ниже, чтобы войти 👇",
        reply_markup=keyboard
    )

@dp.message(Command("send"))
async def cmd_broadcast(message: types.Message):
    # Защита: только ты
    if message.from_user.id != ADMIN_ID:
        return

    parts = message.text.split(maxsplit=1)
    if len(parts) < 2:
        await message.answer("⚠️ Пиши так: <code>/send Текст сообщения</code>")
        return
    
    text_to_send = parts[1]
    user_ids = get_all_user_ids()
    
    if not user_ids:
        await message.answer("🤷‍♂️ Пользователей не найдено или ошибка БД.")
        return

    await message.answer(f"🚀 Рассылка на {len(user_ids)} человек началась...")

    count_ok = 0
    count_fail = 0
    
    for uid in user_ids:
        try:
            # Кнопка под каждым сообщением
            kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="👉 Войти", web_app=WebAppInfo(url=MINI_APP_URL))]
            ])
            await bot.send_message(chat_id=uid, text=text_to_send, reply_markup=kb)
            count_ok += 1
            await asyncio.sleep(0.1) # Анти-спам
        except Exception as e:
            count_fail += 1
            pass

    await message.answer(
        f"✅ <b>Рассылка завершена!</b>\n"
        f"Успешно: {count_ok}\n"
        f"Не дошло (блок): {count_fail}"
    )

async def main():
    print("Bot is running...")
    # УБРАЛИ background task для описания, так как теперь счетчик будет от Телеграма
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())