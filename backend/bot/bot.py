import os
import asyncio
import logging
from datetime import datetime, timedelta
import pytz

from aiogram import Bot, Dispatcher, types, F
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
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
MINI_APP_URL = "https://tennischallenge.online" # Обновил на новый домен
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

# Инициализация
bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
storage = MemoryStorage()
dp = Dispatcher(storage=storage)
scheduler = AsyncIOScheduler(timezone=TIMEZONE)

# --- СОСТОЯНИЯ ---

# 1. Для Рассылки
class BroadcastState(StatesGroup):
    waiting_for_content = State()
    waiting_for_confirm = State()
    waiting_for_time = State()

# 2. Для Редактирования Прогноза (НОВОЕ)
class EditPickState(StatesGroup):
    waiting_for_tour_id = State()
    waiting_for_user_id = State()
    waiting_for_round = State()
    waiting_for_old_name = State()
    waiting_for_new_name = State()
    waiting_for_final_confirm = State()

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
    users = get_all_user_ids()
    await bot.send_message(ADMIN_ID, f"🚀 Рассылка началась ({len(users)} чел.)...")
    count_ok = 0
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👉 Войти в игру", web_app=WebAppInfo(url=MINI_APP_URL))]
    ])
    for uid in users:
        try:
            await bot.copy_message(chat_id=uid, from_chat_id=chat_id, message_id=message_id, reply_markup=kb)
            count_ok += 1
            await asyncio.sleep(0.05)
        except Exception:
            pass
    await bot.send_message(ADMIN_ID, f"✅ Рассылка завершена. Дошло: {count_ok}")

# --- ХАНДЛЕРЫ ---

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎾 Играть", web_app=WebAppInfo(url=MINI_APP_URL))]
    ])
    await message.answer(
        f"Привет, <b>{message.from_user.first_name}</b>! 👋\n\n"
        "🎾 Tennis Challenge в самом разгаре!\n"
        "Жми кнопку ниже, чтобы войти 👇",
        reply_markup=kb
    )

# --- АДМИНКА ---

@dp.message(Command("admin"))
async def cmd_admin(message: types.Message):
    if message.from_user.id != ADMIN_ID: return
    
    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="📢 Новая рассылка"), KeyboardButton(text="✏️ Изменить прогноз")],
        [KeyboardButton(text="❌ Отмена")]
    ], resize_keyboard=True)
    
    await message.answer("Админ-панель открыта.", reply_markup=kb)

# ==========================================
# ЛОГИКА ИЗМЕНЕНИЯ ПРОГНОЗА (ПОСТРОЧНО)
# ==========================================

# 1. Старт
@dp.message(F.text == "✏️ Изменить прогноз")
async def start_edit_pick(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID: return
    await message.answer("Введите **ID Турнира** (например: 16):", reply_markup=ReplyKeyboardRemove())
    await state.set_state(EditPickState.waiting_for_tour_id)

# 2. Получили ID Турнира -> Просим ID Юзера
@dp.message(EditPickState.waiting_for_tour_id)
async def process_tour_id(message: types.Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❌ Это не число. Введите ID турнира цифрами.")
        return
    await state.update_data(tour_id=int(message.text))
    await message.answer("Введите **ID Пользователя** (User ID):")
    await state.set_state(EditPickState.waiting_for_user_id)

# 3. Получили ID Юзера -> Просим Раунд (с кнопками)
@dp.message(EditPickState.waiting_for_user_id)
async def process_user_id(message: types.Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❌ Это не число. Введите User ID цифрами.")
        return
    await state.update_data(user_id=int(message.text))
    
    # Кнопки для раундов
    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="R128"), KeyboardButton(text="R64"), KeyboardButton(text="R32")],
        [KeyboardButton(text="R16"), KeyboardButton(text="QF"), KeyboardButton(text="SF")],
        [KeyboardButton(text="F"), KeyboardButton(text="Champion")],
        [KeyboardButton(text="❌ Отмена")]
    ], resize_keyboard=True)
    
    await message.answer("Выберите **Раунд**:", reply_markup=kb)
    await state.set_state(EditPickState.waiting_for_round)

# 4. Получили Раунд -> Просим Старое имя
@dp.message(EditPickState.waiting_for_round)
async def process_round(message: types.Message, state: FSMContext):
    if message.text == "❌ Отмена":
        await message.answer("Отменено.", reply_markup=ReplyKeyboardRemove())
        await state.clear()
        return

    await state.update_data(round_name=message.text)
    await message.answer("Введите **СТАРОЕ имя** (которое сейчас в базе, точь-в-точь):", reply_markup=ReplyKeyboardRemove())
    await state.set_state(EditPickState.waiting_for_old_name)

# 5. Получили Старое имя -> Просим Новое имя
@dp.message(EditPickState.waiting_for_old_name)
async def process_old_name(message: types.Message, state: FSMContext):
    await state.update_data(old_name=message.text.strip())
    await message.answer("Введите **НОВОЕ имя** (на которое меняем):")
    await state.set_state(EditPickState.waiting_for_new_name)

# 6. Получили Новое имя -> Подтверждение
@dp.message(EditPickState.waiting_for_new_name)
async def process_new_name(message: types.Message, state: FSMContext):
    await state.update_data(new_name=message.text.strip())
    data = await state.get_data()
    
    msg = (
        "⚠️ **Проверь данные:**\n\n"
        f"🏆 Турнир: `{data['tour_id']}`\n"
        f"👤 Юзер: `{data['user_id']}`\n"
        f"🎾 Раунд: `{data['round_name']}`\n"
        f"❌ Было: `{data['old_name']}`\n"
        f"✅ Станет: `{data['new_name']}`\n"
    )
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Подтвердить замену", callback_data="confirm_edit_pick")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_edit_pick")]
    ])
    
    await message.answer(msg, reply_markup=kb)
    await state.set_state(EditPickState.waiting_for_final_confirm)

# 7. Финал -> Выполнение SQL
@dp.callback_query(EditPickState.waiting_for_final_confirm)
async def execute_edit_pick(callback: types.CallbackQuery, state: FSMContext):
    if callback.data == "cancel_edit_pick":
        await callback.message.edit_text("❌ Замена отменена.")
        await state.clear()
        return
        
    data = await state.get_data()
    
    try:
        with engine.connect() as conn:
            query = text("""
                UPDATE user_picks 
                SET predicted_winner = :new_name 
                WHERE tournament_id = :tid 
                  AND user_id = :uid
                  AND round = :rnd
                  AND predicted_winner = :old_name
            """)
            
            result = conn.execute(query, {
                "new_name": data['new_name'], 
                "tid": data['tour_id'], 
                "uid": data['user_id'],
                "rnd": data['round_name'],
                "old_name": data['old_name']
            })
            conn.commit()
            
            if result.rowcount > 0:
                await callback.message.edit_text("✅ **Успешно!** Данные обновлены.")
            else:
                await callback.message.edit_text(
                    "❌ **Не найдено.**\n"
                    "База данных не нашла запись с такими параметрами.\n"
                    "Проверь ID, раунд или старое имя."
                )
    except Exception as e:
        await callback.message.edit_text(f"❌ Ошибка БД: {e}")
    
    await state.clear()


# ==========================================
# ЛОГИКА РАССЫЛКИ (Как былаd)
# ==========================================

@dp.message(F.text == "📢 Новая рассылка")
async def start_broadcast_flow(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID: return
    await message.answer("Отправь сообщение для рассылки.", reply_markup=ReplyKeyboardRemove())
    await state.set_state(BroadcastState.waiting_for_content)

@dp.message(BroadcastState.waiting_for_content)
async def process_content(message: types.Message, state: FSMContext):
    await state.update_data(msg_id=message.message_id, chat_id=message.chat.id)
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Отправить СЕЙЧАС", callback_data="send_now")],
        [InlineKeyboardButton(text="⏰ Отложить", callback_data="send_later")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_broad")]
    ])
    await message.copy_to(chat_id=message.chat.id)
    await message.answer("👆 Превью. Отправляем?", reply_markup=kb)
    await state.set_state(BroadcastState.waiting_for_confirm)

@dp.callback_query(BroadcastState.waiting_for_confirm)
async def process_confirm(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    action = callback.data
    
    if action == "cancel_broad":
        await callback.message.edit_text("Отменено.")
        await state.clear()
    elif action == "send_now":
        await callback.message.edit_text("Запускаю...")
        await run_broadcast(data['chat_id'], data['msg_id'])
        await state.clear()
    elif action == "send_later":
        await callback.message.edit_text("Введи время (ЧЧ:ММ по Москве):")
        await state.set_state(BroadcastState.waiting_for_time)

@dp.message(BroadcastState.waiting_for_time)
async def process_time(message: types.Message, state: FSMContext):
    try:
        hour, minute = map(int, message.text.split(':'))
        now = datetime.now(TIMEZONE)
        run_date = now.replace(hour=hour, minute=minute, second=0)
        if run_date < now: run_date += timedelta(days=1)
        data = await state.get_data()
        scheduler.add_job(run_broadcast, 'date', run_date=run_date, kwargs={'chat_id': data['chat_id'], 'message_id': data['msg_id']})
        await message.answer(f"✅ Запланировано на {run_date.strftime('%d.%m %H:%M')}")
        await state.clear()
    except:
        await message.answer("❌ Ошибка времени. Формат ЧЧ:ММ")

@dp.message(F.text == "❌ Отмена")
async def cancel_all(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer("Отменено.", reply_markup=ReplyKeyboardRemove())

async def main():
    print("Bot is running...")
    scheduler.start()
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())