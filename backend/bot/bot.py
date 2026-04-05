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
MINI_APP_URL = "https://prime-challenge.vercel.app"
TIMEZONE = pytz.timezone('Europe/Moscow')

# Список Админов
admin_env = os.getenv("ADMIN_ID", "360269274,5159283334")
try:
    ADMIN_IDS = [int(x.strip()) for x in admin_env.split(",")]
except ValueError:
    ADMIN_IDS = [360269274]

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

# 1. Рассылка
class BroadcastState(StatesGroup):
    waiting_for_content = State()
    waiting_for_confirm = State()
    waiting_for_time = State()

# 2. Турнирный прогноз
class EditPickState(StatesGroup):
    waiting_for_tour_id = State()
    waiting_for_user_id = State()
    waiting_for_round = State()
    waiting_for_old_name = State()
    waiting_for_new_name = State()
    waiting_for_final_confirm = State()

# 3. Замена игрока (массовая)
class ReplacePlayerState(StatesGroup):
    waiting_for_tour_id = State()
    waiting_for_old_name = State()
    waiting_for_new_name = State()
    waiting_for_confirm = State()

# 4. Daily Challenge (НОВОЕ)
class EditDailyPickState(StatesGroup):
    waiting_for_match_id = State()
    waiting_for_user_id = State()
    waiting_for_winner = State()

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
    for admin in ADMIN_IDS:
        try: await bot.send_message(admin, f"🚀 Рассылка началась ({len(users)} чел.)...")
        except: pass
        
    count_ok = 0
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👉 Войти в игру", web_app=WebAppInfo(url=MINI_APP_URL))]
    ])
    for uid in users:
        try:
            await bot.copy_message(chat_id=uid, from_chat_id=chat_id, message_id=message_id, reply_markup=kb)
            count_ok += 1
            await asyncio.sleep(0.05)
        except Exception as e:
            logger.error(f"❌ Failed to send to {uid}: {e}")
            pass
            
    for admin in ADMIN_IDS:
        try: await bot.send_message(admin, f"✅ Рассылка завершена. Дошло: {count_ok}")
        except: pass

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

# --- ГЛАВНОЕ МЕНЮ АДМИНА ---

@dp.message(Command("admin"))
async def cmd_admin(message: types.Message):
    if message.from_user.id not in ADMIN_IDS: return
    
    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="📢 Новая рассылка")],
        [KeyboardButton(text="✏️ Изменить прогноз"), KeyboardButton(text="🔁 Замена игрока")],
        [KeyboardButton(text="🎲 Daily: Изменить"), KeyboardButton(text="❌ Отмена")]
    ], resize_keyboard=True)
    
    await message.answer(f"Админ-панель открыта. (ID: {message.from_user.id})", reply_markup=kb)


# ==========================================
# 4. DAILY CHALLENGE: ИЗМЕНЕНИЕ ПРОГНОЗА (НОВОЕ)
# ==========================================

@dp.message(F.text == "🎲 Daily: Изменить")
async def start_edit_daily(message: types.Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS: return
    await message.answer(
        "Введите **ID матча** (например: `12104107`).\n"
        "Его можно взять из Гугл Таблицы (первая колонка).", 
        reply_markup=ReplyKeyboardRemove()
    )
    await state.set_state(EditDailyPickState.waiting_for_match_id)

@dp.message(EditDailyPickState.waiting_for_match_id)
async def process_daily_match_id(message: types.Message, state: FSMContext):
    await state.update_data(match_id=message.text.strip())
    await message.answer("Введите **ID Юзера** (User ID):")
    await state.set_state(EditDailyPickState.waiting_for_user_id)

@dp.message(EditDailyPickState.waiting_for_user_id)
async def process_daily_user_id(message: types.Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❌ ID Юзера должен быть числом.")
        return
    await state.update_data(user_id=int(message.text))
    
    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="1"), KeyboardButton(text="2")],
        [KeyboardButton(text="❌ Отмена")]
    ], resize_keyboard=True)
    
    await message.answer("Выберите победителя (**1** или **2**):", reply_markup=kb)
    await state.set_state(EditDailyPickState.waiting_for_winner)

@dp.message(EditDailyPickState.waiting_for_winner)
async def execute_daily_change(message: types.Message, state: FSMContext):
    if message.text == "❌ Отмена":
        await message.answer("Отменено.", reply_markup=ReplyKeyboardRemove())
        await state.clear()
        return

    if message.text not in ["1", "2"]:
        await message.answer("❌ Выберите 1 или 2.")
        return

    new_pick = int(message.text)
    data = await state.get_data()
    
    try:
        with engine.connect() as conn:
            # 1. Пытаемся обновить существующий
            update_query = text("""
                UPDATE daily_picks
                SET predicted_winner = :pick
                WHERE user_id = :uid AND match_id = :mid
            """)
            result = conn.execute(update_query, {
                "pick": new_pick,
                "uid": data['user_id'],
                "mid": data['match_id']
            })
            
            action = "Обновлено"
            
            # 2. Если обновлять нечего (0 строк) - создаем новый!
            if result.rowcount == 0:
                insert_query = text("""
                    INSERT INTO daily_picks (user_id, match_id, predicted_winner, created_at)
                    VALUES (:uid, :mid, :pick, NOW())
                """)
                conn.execute(insert_query, {
                    "pick": new_pick,
                    "uid": data['user_id'],
                    "mid": data['match_id']
                })
                action = "🆕 Создано"
            
            conn.commit()
            
            await message.answer(
                f"✅ **Успешно!**\n"
                f"Действие: {action}\n"
                f"Матч: `{data['match_id']}`\n"
                f"Юзер: `{data['user_id']}`\n"
                f"Выбор: **{new_pick}**",
                reply_markup=ReplyKeyboardRemove()
            )
            
    except Exception as e:
        await message.answer(f"❌ Ошибка БД: {e}")
    
    await state.clear()


# ==========================================
# 1. МАССОВАЯ ЗАМЕНА ИГРОКА (BRACKET)
# ==========================================

@dp.message(F.text == "🔁 Замена игрока")
async def start_replace_player(message: types.Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS: return
    await message.answer("Введите **ID Турнира** (например: 11):", reply_markup=ReplyKeyboardRemove())
    await state.set_state(ReplacePlayerState.waiting_for_tour_id)

@dp.message(ReplacePlayerState.waiting_for_tour_id)
async def process_replace_tour_id(message: types.Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❌ Введите ID цифрами.")
        return
    await state.update_data(tour_id=int(message.text))
    await message.answer("Введите **СТАРОЕ имя** (или часть имени).\n\nНапример, если написать `Казо`, бот найдет всех, у кого есть `Казо` в прогнозе.")
    await state.set_state(ReplacePlayerState.waiting_for_old_name)

@dp.message(ReplacePlayerState.waiting_for_old_name)
async def process_replace_old_name(message: types.Message, state: FSMContext):
    await state.update_data(old_name=message.text.strip())
    await message.answer("Введите **НОВОЕ имя** (точное, как в Гугл Таблице):")
    await state.set_state(ReplacePlayerState.waiting_for_new_name)

@dp.message(ReplacePlayerState.waiting_for_new_name)
async def process_replace_new_name(message: types.Message, state: FSMContext):
    await state.update_data(new_name=message.text.strip())
    data = await state.get_data()
    
    msg = (
        "⚠️ **МАССОВАЯ ЗАМЕНА! ПРОВЕРЬ!**\n\n"
        f"🏆 Турнир ID: `{data['tour_id']}`\n"
        f"🔍 Ищем: `% {data['old_name']} %`\n"
        f"✏️ Меняем на: `{data['new_name']}`\n\n"
        "Это изменит прогнозы у **ВСЕХ** пользователей в этом турнире."
    )
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 ВЫПОЛНИТЬ ЗАМЕНУ", callback_data="exec_replace")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_replace")]
    ])
    
    await message.answer(msg, reply_markup=kb)
    await state.set_state(ReplacePlayerState.waiting_for_confirm)

@dp.callback_query(ReplacePlayerState.waiting_for_confirm)
async def execute_replace(callback: types.CallbackQuery, state: FSMContext):
    if callback.data == "cancel_replace":
        await callback.message.edit_text("❌ Отменено.")
        await state.clear()
        return

    data = await state.get_data()
    
    try:
        with engine.connect() as conn:
            query = text("""
                UPDATE user_picks
                SET predicted_winner = :new_name
                WHERE tournament_id = :tid
                  AND predicted_winner ILIKE :old_pattern
            """)
            old_pattern = f"%{data['old_name']}%"
            result = conn.execute(query, {
                "new_name": data['new_name'],
                "tid": data['tour_id'],
                "old_pattern": old_pattern
            })
            conn.commit()
            
            await callback.message.edit_text(f"✅ **Готово!**\n\nОбновлено записей: **{result.rowcount}**")
    except Exception as e:
        await callback.message.edit_text(f"❌ Ошибка БД: {e}")
    
    await state.clear()


# ==========================================
# 2. ЛОГИКА ИЗМЕНЕНИЯ ОДНОГО ПРОГНОЗА (BRACKET)
# ==========================================

@dp.message(F.text == "✏️ Изменить прогноз")
async def start_edit_pick(message: types.Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS: return
    await message.answer("Введите **ID Турнира**:", reply_markup=ReplyKeyboardRemove())
    await state.set_state(EditPickState.waiting_for_tour_id)

@dp.message(EditPickState.waiting_for_tour_id)
async def process_tour_id(message: types.Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❌ Цифрами, пожалуйста.")
        return
    await state.update_data(tour_id=int(message.text))
    await message.answer("Введите **ID Пользователя**:")
    await state.set_state(EditPickState.waiting_for_user_id)

@dp.message(EditPickState.waiting_for_user_id)
async def process_user_id(message: types.Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❌ Цифрами.")
        return
    await state.update_data(user_id=int(message.text))
    
    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="R128"), KeyboardButton(text="R64"), KeyboardButton(text="R32")],
        [KeyboardButton(text="R16"), KeyboardButton(text="QF"), KeyboardButton(text="SF")],
        [KeyboardButton(text="F"), KeyboardButton(text="Champion")],
        [KeyboardButton(text="❌ Отмена")]
    ], resize_keyboard=True)
    
    await message.answer("Выберите **Раунд**:", reply_markup=kb)
    await state.set_state(EditPickState.waiting_for_round)

@dp.message(EditPickState.waiting_for_round)
async def process_round(message: types.Message, state: FSMContext):
    if message.text == "❌ Отмена":
        await message.answer("Отменено.", reply_markup=ReplyKeyboardRemove())
        await state.clear()
        return

    await state.update_data(round_name=message.text)
    await message.answer("Введите **СТАРОЕ имя** (точное):", reply_markup=ReplyKeyboardRemove())
    await state.set_state(EditPickState.waiting_for_old_name)

@dp.message(EditPickState.waiting_for_old_name)
async def process_old_name(message: types.Message, state: FSMContext):
    await state.update_data(old_name=message.text.strip())
    await message.answer("Введите **НОВОЕ имя**:")
    await state.set_state(EditPickState.waiting_for_new_name)

@dp.message(EditPickState.waiting_for_new_name)
async def process_new_name(message: types.Message, state: FSMContext):
    await state.update_data(new_name=message.text.strip())
    data = await state.get_data()
    
    msg = (
        "⚠️ **ИЗМЕНЕНИЕ ОДНОГО ЮЗЕРА**\n"
        f"🏆 Турнир: `{data['tour_id']}`\n"
        f"👤 Юзер: `{data['user_id']}`\n"
        f"🎾 Раунд: `{data['round_name']}`\n"
        f"❌ Было: `{data['old_name']}`\n"
        f"✅ Станет: `{data['new_name']}`"
    )
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Подтвердить", callback_data="confirm_edit_pick")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_edit_pick")]
    ])
    
    await message.answer(msg, reply_markup=kb)
    await state.set_state(EditPickState.waiting_for_final_confirm)

@dp.callback_query(EditPickState.waiting_for_final_confirm)
async def execute_edit_pick(callback: types.CallbackQuery, state: FSMContext):
    if callback.data == "cancel_edit_pick":
        await callback.message.edit_text("❌ Отменено.")
        await state.clear()
        return
        
    data = await state.get_data()
    try:
        with engine.connect() as conn:
            query = text("""
                UPDATE user_picks SET predicted_winner = :new_name 
                WHERE tournament_id = :tid AND user_id = :uid
                  AND round = :rnd AND predicted_winner = :old_name
            """)
            result = conn.execute(query, {
                "new_name": data['new_name'], "tid": data['tour_id'], 
                "uid": data['user_id'], "rnd": data['round_name'], "old_name": data['old_name']
            })
            conn.commit()
            
            if result.rowcount > 0:
                await callback.message.edit_text("✅ Данные обновлены.")
            else:
                await callback.message.edit_text("❌ Запись не найдена. Проверь старое имя.")
    except Exception as e:
        await callback.message.edit_text(f"❌ Ошибка БД: {e}")
    
    await state.clear()


# ==========================================
# ЛОГИКА РАССЫЛКИ (С ЛОГАМИ)
# ==========================================

@dp.message(F.text == "📢 Новая рассылка")
async def start_broadcast_flow(message: types.Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS: return
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
