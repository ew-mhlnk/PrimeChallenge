import os
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.filters import Command
from aiogram import Router
from dotenv import load_dotenv

# Загружаем переменные из .env
load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
MINI_APP_URL = "https://prime-challenge.vercel.app/"

# Создаём хранилище состояний и роутер
storage = MemoryStorage()
router = Router()

# Обработчик команды /start
@router.message(Command("start"))
async def send_welcome(message: types.Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Играть 🎾",
                    web_app=WebAppInfo(url=MINI_APP_URL)
                )
            ]
        ]
    )
    await message.answer(
        "Привет! Попробуй угадать победителя теннисного турнира!",
        reply_markup=keyboard
    )

# Запуск бота
async def main():
    bot = Bot(token=TOKEN)
    dp = Dispatcher(storage=storage)
    dp.include_router(router)

    print("Bot is starting...")
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())