import logging
import requests
import re
import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

API_KEY = os.getenv("TENNIS_API_KEY") 
API_URL = "https://api.api-tennis.com/tennis/"

PLAYER_DICT = {}

ROUND_MAP = {
    "1/32-finals": "R64", "1/16-finals": "R32", "1/8-finals": "R16",
    "Quarter-finals": "QF", "Semi-finals": "SF", "Final": "F",
    "Qualification": "Q", "Preliminary": "Q"
}

INVALID_TYPES = ["Doubles", "Challenger", "ITF", "Boys", "Girls", "Juniors"]

# === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

def get_google_client():
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds_json = os.getenv("GOOGLE_CREDENTIALS") or os.getenv("GOOGLE_SHEETS_CREDENTIALS")
        if not creds_json:
            if os.path.exists("google-credentials.json"):
                return ServiceAccountCredentials.from_json_keyfile_name("google-credentials.json", scope)
            return None
        if isinstance(creds_json, str): creds_dict = json.loads(creds_json)
        else: creds_dict = creds_json
        return gspread.authorize(ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope))
    except Exception as e:
        logger.error(f"Google Auth Error: {e}")
        return None

def load_dictionary_from_sheets():
    global PLAYER_DICT
    client = get_google_client()
    if not client: return
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        ws = client.open_by_key(sheet_id).worksheet("DICTIONARY")
        rows = ws.get_all_values()
        new_dict = {}
        for row in rows[1:]:
            if len(row) <= 8: continue
            full = row[0].strip(); short = row[3].strip(); flag = row[5].strip(); rus = row[8].strip()
            if rus:
                res = f"{flag} {rus}".strip()
                if full: new_dict[full.lower()] = res
                if short: new_dict[short.lower()] = res
        PLAYER_DICT = new_dict
        logger.info(f"📚 Dictionary loaded: {len(PLAYER_DICT)}")
    except: pass

def translate(name: str) -> str:
    if not name: return "TBD"
    return PLAYER_DICT.get(name.strip().lower(), name.strip())

def clean_round(raw: str) -> str:
    if not raw: return ""
    temp = raw.split(" - ")[-1].strip()
    return ROUND_MAP.get(temp, temp) if temp in ROUND_MAP else temp

def format_set_score(val):
    if val is None: return ""
    v_str = str(val).strip()
    if "." in v_str:
        parts = v_str.split(".")
        if len(parts) > 1 and parts[1] != "0": return f"{parts[0]}({parts[1]})"
        return parts[0]
    return v_str

def build_score(match):
    sets = []
    scores_arr = match.get("scores", [])
    if scores_arr:
        for s in scores_arr:
            s1 = format_set_score(s.get("score_first"))
            s2 = format_set_score(s.get("score_second"))
            if s1 and s2: sets.append(f"{s1}-{s2}")
    if not sets:
        txt = match.get("event_live_result") or match.get("event_final_result")
        if txt and txt not in ["2 - 0", "2 - 1", "0 - 2", "1 - 2"]:
            parts = txt.replace(" - ", "-").split(" ")
            for p in parts:
                if "-" in p:
                    sub = p.split("-")
                    if len(sub) == 2:
                        sp1 = format_set_score(sub[0])
                        sp2 = format_set_score(sub[1])
                        sets.append(f"{sp1}-{sp2}")
    res = ", ".join(sets)
    game = str(match.get("event_game_result", ""))
    if game and game not in ["-", "None"]:
        res += f" ({game.replace(' - ', ':').replace('-', ':').replace(' : ', ':')})"
    return res

def fetch_from_api(date_str):
    if not API_KEY: return []
    params = {"method": "get_fixtures", "APIkey": API_KEY, "date_start": date_str, "date_stop": date_str, "timezone": "Europe/Moscow"}
    try:
        resp = requests.get(API_URL, params=params, timeout=10)
        data = resp.json()
        if isinstance(data, dict) and "result" in data: return data["result"]
        if isinstance(data, list): return data
        return []
    except Exception as e:
        logger.error(f"API Error: {e}")
        return []

def process_matches(matches):
    processed = []
    seen = set()
    for m in matches:
        m_id = str(m.get("event_key"))
        
        # --- ФИЛЬТРЫ ---
        # 1. Квалификация (Строго: если поле true/1 ИЛИ в названии раунда есть qual/prelim)
        q_field = str(m.get("event_qualification", "")).lower()
        if q_field in ["true", "1"]: continue
        
        r_raw = str(m.get("tournament_round", "")).lower()
        if "qual" in r_raw or "prelim" in r_raw: continue

        # 2. Тип
        etype = str(m.get("event_type_type", "")).title()
        if any(b in etype for b in INVALID_TYPES): continue
        is_singles = "Singles" in etype or "United Cup" in etype
        is_major = any(x in etype for x in ["Atp", "Wta", "Open", "Slam", "Cup"])
        if not (is_singles and is_major): continue
        
        p1_raw = m.get("event_first_player", "")
        if "/" in p1_raw: continue # Пары
        
        if m_id in seen: continue
        seen.add(m_id)

        # --- СБОР ---
        t_clean = (m.get("tournament_name") or "").replace(" Singles", "").strip()
        if "Wta" in etype and "WTA" not in t_clean: t_clean = f"WTA {t_clean}"
        elif "Atp" in etype and "ATP" not in t_clean: t_clean = f"ATP {t_clean}"
        
        st_raw = str(m.get("event_status", "")).lower()
        status = "PLANNED"
        is_api_live = str(m.get("event_live", "0")) == "1"
        
        if any(x in st_raw for x in ["can", "int", "walk", "w/o"]): status = "CANCELLED"
        elif any(x in st_raw for x in ["fin", "aft", "ret"]): status = "COMPLETED"
        elif is_api_live or any(x in st_raw for x in ["live", "set", "game", "break"]): status = "LIVE"
        
        # Проверка счета для лайва
        score_str = build_score(m)
        if status == "PLANNED" and score_str and any(c.isdigit() for c in score_str):
            status = "LIVE"

        winner = None
        if status == "COMPLETED":
            w = m.get("event_winner", "")
            if "First" in w or "Home" in w: winner = 1
            elif "Second" in w or "Away" in w: winner = 2

        d_part = m.get("event_date", "")
        t_part = m.get("event_time", "")
        time_str = f"{d_part} {t_part}"
        try:
            dt = datetime.strptime(f"{d_part} {t_part}", "%Y-%m-%d %H:%M")
            time_str = dt.strftime("%d.%m.%Y %H:%M")
        except: pass

        processed.append([m_id, t_clean, status, clean_round(m.get("tournament_round")), time_str, translate(p1_raw), translate(m.get("event_second_player")), score_str, winner])
    return processed

# =========================================================
# ГЛАВНАЯ ФУНКЦИЯ: SMART MERGE (История + Очистка мусора)
# =========================================================
def update_google_sheet_from_api():
    if not PLAYER_DICT: load_dictionary_from_sheets()

    # 1. API: Качаем Вчера, Сегодня, Завтра
    # Это наше "Окно Активности". Все, что попадает в эти даты, должно соответствовать API.
    # Всё, чего нет в API за эти даты -> УДАЛЯЕТСЯ (мусор).
    
    dates = [
        (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
        datetime.now().strftime("%Y-%m-%d"),
        (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    ]
    
    raw_matches = []
    for d in dates:
        raw_matches += fetch_from_api(d)
        
    if not raw_matches:
        logger.warning("API Empty. Skipping update.")
        return

    # Готовим словарь свежих данных {ID: Data}
    api_processed = process_matches(raw_matches)
    api_map = {item[0]: item for item in api_processed} # item[0] это ID

    # 2. Читаем Гугл Таблицу (Текущее состояние)
    client = get_google_client()
    if not client: return
    
    try:
        ws = client.open_by_key(os.getenv("GOOGLE_SHEET_ID")).worksheet("DAILY_MATCHES")
        existing_data = ws.get_all_values()
        
        header = ["ID", "Tournament", "Status", "Round", "Time", "Player 1", "Player 2", "Score", "Winner", "Manual Block"]
        final_rows = []
        
        # Определяем границы "Окна Активности" (для фильтрации мусора)
        # Матчи старше window_start считаем Историей (не трогаем).
        # Матчи внутри окна, которых нет в API, считаем Мусором.
        now = datetime.now()
        window_start = now - timedelta(days=1, hours=12) # Вчерашнее утро
        window_end = now + timedelta(days=2) # Послезавтра
        
        # 3. ПРОХОДИМ ПО СУЩЕСТВУЮЩИМ СТРОКАМ
        if existing_data:
            for row in existing_data[1:]: # Пропуск хедера
                if not row or len(row) < 5: continue
                
                m_id = str(row[0]).strip()
                match_time_str = row[4].strip()
                
                # Парсим дату матча из таблицы
                try:
                    m_date = datetime.strptime(match_time_str, "%d.%m.%Y %H:%M")
                except:
                    # Если дата битая, считаем матч "Архивным" и оставляем как есть, чтобы не потерять
                    final_rows.append(row)
                    continue

                # --- ЛОГИКА ---
                if m_id in api_map:
                    # А. Матч ЕСТЬ в API -> Обновляем (Merge)
                    # Берем свежие данные
                    new_data = api_map[m_id]
                    # Сохраняем ручной блок (X), если был
                    manual_block = row[9] if len(row) > 9 else ""
                    # Добавляем в список
                    final_rows.append(new_data + [manual_block])
                    # Удаляем из api_map, чтобы потом знать, какие НОВЫЕ остались
                    del api_map[m_id]
                    
                elif window_start <= m_date <= window_end:
                    # Б. Матча НЕТ в API, но дата внутри "Окна Активности"
                    # ЗНАЧИТ ЭТО МУСОР (Отмена, Квал, Ошибка расписания)
                    # -> ПРОПУСКАЕМ (Удаляем из таблицы)
                    # logger.info(f"🗑️ Garbage Match Removed: {m_id}")
                    continue
                    
                else:
                    # В. Матч СТАРЫЙ (вне окна) или БУДУЩИЙ (далеко)
                    # -> ОСТАВЛЯЕМ КАК ЕСТЬ (История)
                    final_rows.append(row)

        # 4. ДОБАВЛЯЕМ ОСТАВШИЕСЯ НОВЫЕ ИЗ API
        for new_match in api_map.values():
            final_rows.append(new_match + [""])

        # 5. СОРТИРОВКА И ЗАПИСЬ
        def parse_sort(r):
            try: return datetime.strptime(r[4], "%d.%m.%Y %H:%M")
            except: return datetime.min
        final_rows.sort(key=parse_sort)
        
        all_data = [header] + final_rows
        
        ws.update(range_name=f"A1:J{len(all_data)}", values=all_data)
        
        # Чистим хвост (если мусора было много и таблица уменьшилась)
        if len(all_data) < len(existing_data):
             ws.batch_clear([f"A{len(all_data)+1}:J{len(existing_data)+20}"])
             
        logger.info(f"✅ Sync Complete. Total rows: {len(final_rows)}")

    except Exception as e:
        logger.error(f"Sheet Update Error: {e}")

# Функцию update_daily_matches_direct можно удалить или оставить пустой,
# так как теперь мы используем цепочку: API -> Sheet -> DB (через sync_service)
def update_daily_matches_direct():
    pass