import logging
import requests
import re
import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime, timedelta
import pytz

# Настройка логгера
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Импортируем конфиги
try:
    from config import TENNIS_API_KEY, GOOGLE_SHEET_ID, GOOGLE_CREDENTIALS
except ImportError:
    TENNIS_API_KEY = os.getenv("TENNIS_API_KEY")
    GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
    GOOGLE_CREDENTIALS = os.getenv("GOOGLE_CREDENTIALS")

API_URL = "https://api.api-tennis.com/tennis/"

PLAYER_DICT = {}

ROUND_MAP = {
    "1/32-finals": "R64", "1/16-finals": "R32", "1/8-finals": "R16",
    "Quarter-finals": "QF", "Semi-finals": "SF", "Final": "F",
    "Qualification": "Q", "Preliminary": "Q"
}

# Типы, которые мы игнорируем
INVALID_TYPES = ["Doubles", "Challenger", "ITF", "Boys", "Girls", "Juniors"]

# Турниры, которые мы игнорируем (Командные)
EXCLUDED_TOURNAMENTS = ["davis cup", "billie jean king cup", "world group"]

# === ГУГЛ КЛИЕНТ ===
def get_google_client():
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        
        creds_json = GOOGLE_CREDENTIALS
        
        if not creds_json and os.path.exists("google-credentials.json"):
             return gspread.authorize(ServiceAccountCredentials.from_json_keyfile_name("google-credentials.json", scope))
        
        if not creds_json:
            logger.error("❌ GOOGLE_CREDENTIALS not found in env vars!")
            return None

        if isinstance(creds_json, str):
            creds_dict = json.loads(creds_json)
        else:
            creds_dict = creds_json
            
        return gspread.authorize(ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope))
    except Exception as e:
        logger.error(f"❌ Google Auth Error: {e}")
        return None

def load_dictionary_from_sheets():
    global PLAYER_DICT
    client = get_google_client()
    if not client: return

    try:
        ws = client.open_by_key(GOOGLE_SHEET_ID).worksheet("DICTIONARY")
        rows = ws.get_all_values()
        new_dict = {}
        for row in rows[1:]:
            if len(row) <= 9: continue
            
            full_eng = row[0].strip()
            short_eng = row[3].strip()
            flag = row[5].strip()
            rus_name = row[9].strip() 
            
            if rus_name:
                final_str = f"{flag} {rus_name}".strip()
                if full_eng: new_dict[full_eng.lower()] = final_str
                if short_eng: new_dict[short_eng.lower()] = final_str
                
        PLAYER_DICT = new_dict
        logger.info(f"📚 Dictionary loaded: {len(PLAYER_DICT)}")
    except Exception as e:
        logger.error(f"Dict load error: {e}")

# === ХЕЛПЕРЫ ===
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
        clean_game = game.replace(" - ", ":").replace("-", ":").replace(" : ", ":")
        res += f" ({clean_game})"
    return res

# 1. Запрос РАСПИСАНИЯ
def fetch_from_api(date_str):
    if not TENNIS_API_KEY: 
        logger.error("❌ API Key missing!")
        return []
    params = {"method": "get_fixtures", "APIkey": TENNIS_API_KEY, "date_start": date_str, "date_stop": date_str, "timezone": "Europe/Moscow"}
    try:
        resp = requests.get(API_URL, params=params, timeout=10)
        data = resp.json()
        if isinstance(data, dict) and "result" in data: return data["result"]
        if isinstance(data, list): return data
        return []
    except Exception as e:
        logger.error(f"API Request failed: {e}")
        return []

# 2. Запрос LIVE
def fetch_live_data():
    if not TENNIS_API_KEY: return []
    params = {"method": "get_livescore", "APIkey": TENNIS_API_KEY, "timezone": "Europe/Moscow"}
    try:
        resp = requests.get(API_URL, params=params, timeout=10)
        data = resp.json()
        if isinstance(data, dict) and "result" in data: return data["result"]
        if isinstance(data, list): return data
        return []
    except Exception as e:
        logger.error(f"Live API Request failed: {e}")
        return []

def process_matches(matches):
    processed = []
    seen = set()
    for m in matches:
        m_id = str(m.get("event_key"))
        
        # 1. Фильтр квалификаций
        q_field = str(m.get("event_qualification", "")).lower()
        if q_field in ["true", "1"]: continue
        r_raw = str(m.get("tournament_round", "")).lower()
        if "qual" in r_raw or "prelim" in r_raw: continue

        # 2. Фильтр по НАЗВАНИЮ и ТИПУ (Усиленный)
        t_raw_name = str(m.get("tournament_name", "")).lower()
        e_type_raw = str(m.get("event_type_type", "")).lower()
        
        if any(ex in t_raw_name for ex in EXCLUDED_TOURNAMENTS): continue
        if any(ex in e_type_raw for ex in EXCLUDED_TOURNAMENTS): continue

        # 3. Фильтр по ТИПУ
        etype_title = str(m.get("event_type_type", "")).title()
        if any(b in etype_title for b in INVALID_TYPES): continue
        
        # 4. Проверка на одиночный разряд
        is_singles = "Singles" in etype_title or "United Cup" in etype_title
        is_major = any(x in etype_title for x in ["Atp", "Wta", "Open", "Slam", "Cup"])
        if not (is_singles and is_major): continue
        
        # 5. Проверка на парный разряд
        p1_raw = m.get("event_first_player", "")
        if "/" in p1_raw: continue

        if m_id in seen: continue
        seen.add(m_id)

        t_clean = (m.get("tournament_name") or "").replace(" Singles", "").strip()
        if "Wta" in etype_title and "WTA" not in t_clean: t_clean = f"WTA {t_clean}"
        elif "Atp" in etype_title and "ATP" not in t_clean: t_clean = f"ATP {t_clean}"
        
        st_raw = str(m.get("event_status", "")).lower()
        status = "PLANNED"
        is_api_live = str(m.get("event_live", "0")) == "1"
        
        if any(x in st_raw for x in ["can", "int", "walk", "w/o"]): status = "CANCELLED"
        elif any(x in st_raw for x in ["fin", "aft", "ret"]): status = "COMPLETED"
        elif is_api_live or any(x in st_raw for x in ["live", "set", "game"]): status = "LIVE"
        
        score_str = build_score(m)
        
        # Детектор лайва
        if status == "PLANNED" and score_str:
            has_digits = any(c.isdigit() for c in score_str)
            is_not_zero = score_str.strip() != "0-0"
            if has_digits and is_not_zero:
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
# ГЛАВНАЯ ФУНКЦИЯ (v15.0 - Adjusted Safety Brake)
# =========================================================
def update_google_sheet_from_api():
    if not PLAYER_DICT: load_dictionary_from_sheets()

    # 1. Генерируем даты
    raw_dates = [
        (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
        (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"), 
        datetime.now().strftime("%Y-%m-%d"),                       
        (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")  
    ]
    
    # 2. Фильтр по дате (>= 17.01.2026)
    limit_date = datetime(2026, 1, 17).date()
    dates = []
    for d_str in raw_dates:
        d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
        if d_obj >= limit_date:
            dates.append(d_str)

    api_map = {}
    dates_with_data = set() 
    
    # 3. FIXTURES
    logger.info(f"⏳ Syncing Fixtures for {dates}")
    for d in dates:
        raw = fetch_from_api(d)
        if raw:
            processed = process_matches(raw)
            if processed:
                dates_with_data.add(d) 
                for item in processed:
                    api_map[str(item[0])] = item

    # 4. LIVE
    try:
        live_raw = fetch_live_data()
        if live_raw:
            live_processed = process_matches(live_raw)
            if live_processed:
                logger.info(f"⚡ Live Interceptor: Found {len(live_processed)} active matches")
                for item in live_processed:
                    api_map[str(item[0])] = item
    except Exception as e:
        logger.error(f"Live fetch error: {e}")

    logger.info(f"📊 Total matches found: {len(api_map)}")

    # Разрешаем пустоту, если дат нет в принципе
    if not api_map and not dates:
        return

    client = get_google_client()
    if not client: return
    
    try:
        ws = client.open_by_key(GOOGLE_SHEET_ID).worksheet("DAILY_MATCHES")
        existing_data = ws.get_all_values()
        
        # === 🛡️ SAFETY BRAKE (ИСПРАВЛЕНО) ===
        # Теперь мы проверяем не проценты, а абсолютное число.
        # Если API вернуло меньше 5 матчей, а в таблице их больше 20 -> считаем это сбоем.
        existing_count = len(existing_data)
        new_count = len(api_map)
        
        if existing_count > 20 and new_count < 5:
            logger.warning(f"🛑 SAFETY BRAKE ACTIVATED! Existing: {existing_count}, New: {new_count}. Update aborted.")
            return
        # ====================================
        
        header = ["ID", "Tournament", "Status", "Round", "Time", "Player 1", "Player 2", "Score", "Winner", "Manual Block"]
        final_rows = []
        
        if existing_data:
            for row in existing_data[1:]:
                while len(row) < 10: row.append("")
                
                m_id = str(row[0]).strip()
                manual_block = str(row[9]).strip().upper() 
                
                match_time_str = row[4].strip()
                m_date_str = ""
                try:
                    m_date = datetime.strptime(match_time_str, "%d.%m.%Y %H:%M")
                    m_date_str = m_date.strftime("%Y-%m-%d")
                except: pass

                # Manual Mode
                if manual_block == "M":
                    final_rows.append(row)
                    if m_id in api_map: del api_map[m_id]
                    continue

                if m_id in api_map:
                    new_data = api_map[m_id]
                    final_rows.append(new_data + [manual_block])
                    del api_map[m_id]
                    
                elif m_date_str in dates_with_data:
                    logger.info(f"🗑️ Safe Clean: {m_id} on {m_date_str}")
                    continue
                    
                else:
                    final_rows.append(row)

        for data in api_map.values():
            final_rows.append(data + [""])

        def parse_sort(r):
            try: return datetime.strptime(r[4], "%d.%m.%Y %H:%M")
            except: return datetime.min
        final_rows.sort(key=parse_sort)
        
        all_data = [header] + final_rows
        
        ws.update(range_name=f"A1:J{len(all_data)}", values=all_data)
        
        if len(all_data) < len(existing_data):
             ws.batch_clear([f"A{len(all_data)+1}:J{len(existing_data)+50}"])
             
        logger.info(f"✅ Safe Sync Complete. Rows: {len(final_rows)}")

    except Exception as e:
        logger.error(f"Sheet Update Error: {e}")