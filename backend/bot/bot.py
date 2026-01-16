import os
import asyncio
import logging
from datetime import datetime, timedelta
import pytz

from aiogram import Bot, Dispatcher, types, F
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler

load_dotenv()

# --- КОНФИГУРАЦИЯ ---
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")
ADMIN_ID = int(os.getenv("ADMIN_ID", "360269274"))
MINI_APP_URL = "https://prime-challenge.vercel.app/"
TIMEZONE = pytz.timezone('Europe/Moscow')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# БД
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    engine = create_engine(DATABASE_URL) if DATABASE_URL else None
except:
    engine = None

# Инициализация (Добавили Storage для состояний)
bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
storage = MemoryStorage()
dp = Dispatcher(storage=storage)
scheduler = AsyncIOScheduler(timezone=TIMEZONE)

# --- СОСТОЯНИЯ (Этапы диалога) ---
class BroadcastState(StatesGroup):
    waiting_for_content = State() # Ждем сам пост
    waiting_for_confirm = State() # Ждем подтверждения
    waiting_for_time = State()    # Ждем время (если отложка)

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

async def run_broadcast(chat_id: int, message_id: int):
    """Рассылает КОПИЮ сообщения всем юзерам"""
    users = get_all_user_ids()
    await bot.send_message(ADMIN_ID, f"🚀 Рассылка началась ({len(users)} чел.)...")
    
    count_ok = 0
    # Кнопка под постом
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👉 Войти в игру", web_app=WebAppInfo(url=MINI_APP_URL))]
    ])

    for uid in users:
        try:
            # copy_message умеет копировать фото, видео и текст!
            await bot.copy_message(chat_id=uid, from_chat_id=chat_id, message_id=message_id, reply_markup=kb)
            count_ok += 1
            await asyncio.sleep(0.05) # Быстро, но безопасно
        except Exception:
            pass
            
    await bot.send_message(ADMIN_ID, f"✅ Рассылка завершена. Дошло: {count_ok}")

# --- ОБЫЧНЫЕ ХАНДЛЕРЫ ---

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎾 Играть", web_app=WebAppInfo(url=MINI_APP_URL))]
    ])
    await message.answer(
        f"Привет, <b>{message.from_user.first_name}</b>! 👋\n\n"
        "🎾 Australian Open в самом разгаре!\n"
        "Жми кнопку ниже, чтобы войти 👇",
        reply_markup=kb
    )

# --- АДМИНКА ---

@dp.message(Command("admin"))
async def cmd_admin(message: types.Message):
    if message.from_user.id != ADMIN_ID: return
    
    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="📢 Новая рассылка")],
        [KeyboardButton(text="❌ Отмена")]
    ], resize_keyboard=True)
    
    await message.answer("Админ-панель открыта.", reply_markup=kb)

# 1. Нажали "Новая рассылка"
@dp.message(F.text == "📢 Новая рассылка")
async def start_broadcast_flow(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID: return
    
    await message.answer("Отправь мне сообщение (текст, фото или видео), которое нужно разослать.", reply_markup=types.ReplyKeyboardRemove())
    await state.set_state(BroadcastState.waiting_for_content)

# 2. Админ прислал контент (Текст/Фото/Видео)
@dp.message(BroadcastState.waiting_for_content)
async def process_content(message: types.Message, state: FSMContext):
    # Сохраняем ID сообщения, чтобы потом его скопировать
    await state.update_data(msg_id=message.message_id, chat_id=message.chat.id)
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Отправить СЕЙЧАС", callback_data="send_now")],
        [InlineKeyboardButton(text="⏰ Отложить", callback_data="send_later")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_broad")]
    ])
    
    await message.copy_to(chat_id=message.chat.id) # Показываем превью
    await message.answer("👆 Вот так это будет выглядеть. Отправляем?", reply_markup=kb)
    await state.set_state(BroadcastState.waiting_for_confirm)

# 3. Обработка кнопок
@dp.callback_query(BroadcastState.waiting_for_confirm)
async def process_confirm(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    action = callback.data
    
    if action == "cancel_broad":
        await callback.message.edit_text("Рассылка отменена.")
        await state.clear()
        
    elif action == "send_now":
        await callback.message.edit_text("Запускаю...")
        await run_broadcast(data['chat_id'], data['msg_id'])
        await state.clear()
        
    elif action == "send_later":
        await callback.message.edit_text("Введи время в формате ЧЧ:ММ (по Москве). Например: 18:30")
        await state.set_state(BroadcastState.waiting_for_time)

# 4. Если выбрали отложку - ждем время
@dp.message(BroadcastState.waiting_for_time)
async def process_time(message: types.Message, state: FSMContext):
    try:
        hour, minute = map(int, message.text.split(':'))
        now = datetime.now(TIMEZONE)
        run_date = now.replace(hour=hour, minute=minute, second=0)
        if run_date < now: run_date += timedelta(days=1)
        
        data = await state.get_data()
        
        scheduler.add_job(
            run_broadcast, 
            'date', 
            run_date=run_date, 
            kwargs={'chat_id': data['chat_id'], 'message_id': data['msg_id']}
        )
        
        await message.answer(f"✅ Запланировано на {run_date.strftime('%d.%m %H:%M')}")
        await state.clear()
        
    except Exception:
        await message.answer("❌ Неверный формат. Попробуй еще раз (ЧЧ:ММ):")

# Кнопка Отмена в меню
@dp.message(F.text == "❌ Отмена")
async def cancel_all(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer("Действие отменено.", reply_markup=types.ReplyKeyboardRemove())

async def main():
    print("Bot is running...")
    scheduler.start()
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())