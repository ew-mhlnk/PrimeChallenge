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

INVALID_TYPES = ["Doubles", "Challenger", "ITF", "Boys", "Girls", "Juniors"]

# === ГУГЛ КЛИЕНТ ===
def get_google_client():
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        
        if GOOGLE_CREDENTIALS:
            try:
                if isinstance(GOOGLE_CREDENTIALS, str):
                    creds_dict = json.loads(GOOGLE_CREDENTIALS)
                else:
                    creds_dict = GOOGLE_CREDENTIALS
                return gspread.authorize(ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope))
            except Exception:
                pass
        
        if os.path.exists("google-credentials.json"):
            return gspread.authorize(ServiceAccountCredentials.from_json_keyfile_name("google-credentials.json", scope))
            
        return None
    except Exception as e:
        logger.error(f"Google Auth Error: {e}")
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
    if not TENNIS_API_KEY: return []
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

# 2. Запрос LIVE (НОВОЕ)
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
        
        # Строгие фильтры
        q_field = str(m.get("event_qualification", "")).lower()
        if q_field in ["true", "1"]: continue
        r_raw = str(m.get("tournament_round", "")).lower()
        if "qual" in r_raw or "prelim" in r_raw: continue

        etype = str(m.get("event_type_type", "")).title()
        if any(b in etype for b in INVALID_TYPES): continue
        is_singles = "Singles" in etype or "United Cup" in etype
        is_major = any(x in etype for x in ["Atp", "Wta", "Open", "Slam", "Cup"])
        if not (is_singles and is_major): continue
        p1_raw = m.get("event_first_player", "")
        if "/" in p1_raw: continue

        if m_id in seen: continue
        seen.add(m_id)

        t_clean = (m.get("tournament_name") or "").replace(" Singles", "").strip()
        if "Wta" in etype and "WTA" not in t_clean: t_clean = f"WTA {t_clean}"
        elif "Atp" in etype and "ATP" not in t_clean: t_clean = f"ATP {t_clean}"
        
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
# ГЛАВНАЯ ФУНКЦИЯ (v13.0 - Live Interceptor)
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
    
    # 2. Фильтр по дате (Только >= 17.01.2026, чтобы не тянуть старое)
    limit_date = datetime(2026, 1, 17).date()
    dates = []
    for d_str in raw_dates:
        d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
        if d_obj >= limit_date:
            dates.append(d_str)

    api_map = {}
    dates_with_data = set() 
    
    # 3. Сначала грузим РАСПИСАНИЕ (Base Layer)
    for d in dates:
        raw = fetch_from_api(d)
        if raw:
            processed = process_matches(raw)
            if processed:
                dates_with_data.add(d) 
                for item in processed:
                    api_map[str(item[0])] = item

    # 4. 🔥 ЗАТЕМ ГРУЗИМ LIVE (Live Layer) 🔥
    # Переписываем данные из расписания актуальными лайв-данными
    try:
        live_raw = fetch_live_data()
        if live_raw:
            live_processed = process_matches(live_raw)
            if live_processed:
                logger.info(f"⚡ Live Interceptor: Found {len(live_processed)} active matches")
                for item in live_processed:
                    # item[0] - это ID матча. Мы перезаписываем его в карте.
                    api_map[str(item[0])] = item
    except Exception as e:
        logger.error(f"Live fetch error (skipping): {e}")

    if not api_map: return

    client = get_google_client()
    if not client: return
    
    try:
        ws = client.open_by_key(GOOGLE_SHEET_ID).worksheet("DAILY_MATCHES")
        existing_data = ws.get_all_values()
        
        header = ["ID", "Tournament", "Status", "Round", "Time", "Player 1", "Player 2", "Score", "Winner", "Manual Block"]
        final_rows = []
        
        if existing_data:
            for row in existing_data[1:]:
                if not row or len(row) < 5: continue
                
                m_id = str(row[0]).strip()
                match_time_str = row[4].strip()
                
                m_date_str = ""
                try:
                    m_date = datetime.strptime(match_time_str, "%d.%m.%Y %H:%M")
                    m_date_str = m_date.strftime("%Y-%m-%d")
                except: pass

                if m_id in api_map:
                    new_data = api_map[m_id]
                    manual_block = row[9] if len(row) > 9 else ""
                    final_rows.append(new_data + [manual_block])
                    del api_map[m_id]
                    
                elif m_date_str in dates_with_data:
                    # Safe Clean: удаляем только если дата была в ответе API, но матча нет
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