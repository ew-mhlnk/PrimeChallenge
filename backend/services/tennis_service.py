import logging
import requests
import re
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database.db import SessionLocal
from database.models import DailyMatch
from utils.daily_calculator import process_match_results

logger = logging.getLogger(__name__)

# Берем ключ из переменных окружения Render
API_KEY = os.getenv("TENNIS_API_KEY") 
API_URL = "https://api.api-tennis.com/tennis/"

# Словарь для перевода (Можно расширять тут или вынести в json)
# Пока базовый, чтобы не усложнять
PLAYER_DICT = {
    "Novak Djokovic": "🇷🇸 Н. Джокович",
    "Daniil Medvedev": "🇷🇺 Д. Медведев",
    "Carlos Alcaraz": "🇪🇸 К. Алькарас",
    "Jannik Sinner": "🇮🇹 Я. Синнер",
    "Aryna Sabalenka": "🇧🇾 А. Соболенко",
    "Iga Swiatek": "🇵🇱 И. Швентек",
    "Elena Rybakina": "🇰🇿 Е. Рыбакина",
    "Coco Gauff": "🇺🇸 К. Гауфф"
}

ROUND_MAP = {
    "1/32-finals": "R64", "1/16-finals": "R32", "1/8-finals": "R16",
    "Quarter-finals": "QF", "Semi-finals": "SF", "Final": "F"
}

INVALID_TYPES = ["Doubles", "Challenger", "ITF", "Boys", "Girls", "Juniors"]

def translate(name: str) -> str:
    if not name: return "TBD"
    # Простой поиск по словарю
    return PLAYER_DICT.get(name.strip(), name.strip())

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
    
    # Fallback string
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

def fetch_from_api(date_str):
    if not API_KEY:
        logger.error("No TENNIS_API_KEY found in environment variables!")
        return []
    
    params = {
        "method": "get_fixtures",
        "APIkey": API_KEY,
        "date_start": date_str,
        "date_stop": date_str,
        "timezone": "Europe/Moscow"
    }
    try:
        resp = requests.get(API_URL, params=params, timeout=10)
        data = resp.json()
        if isinstance(data, dict) and "result" in data: return data["result"]
        if isinstance(data, list): return data
        return []
    except Exception as e:
        logger.error(f"API Request failed: {e}")
        return []

def update_daily_matches_direct():
    """
    Эта функция запускается Шедулером раз в минуту.
    """
    session = SessionLocal()
    try:
        # Берем ВЧЕРА, СЕГОДНЯ, ЗАВТРА (чтобы закрывать старые лайвы)
        dates = [
            (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            datetime.now().strftime("%Y-%m-%d"),
            (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        ]
        
        raw_matches = []
        for d in dates:
            raw_matches += fetch_from_api(d)
            
        if not raw_matches:
            return # API молчит, ничего не делаем

        for m in raw_matches:
            # 1. Фильтр Квалификации (Строгий)
            qual_val = str(m.get("event_qualification", "")).lower()
            if qual_val in ["true", "1"]: continue
            
            r_raw = str(m.get("tournament_round", "")).lower()
            if "qual" in r_raw or "prelim" in r_raw: continue

            # 2. Фильтр Типов
            etype = str(m.get("event_type_type", "")).title()
            if any(b in etype for b in INVALID_TYPES): continue
            
            is_singles = "Singles" in etype or "United Cup" in etype
            is_major = any(x in etype for x in ["Atp", "Wta", "Open", "Slam", "Cup"])
            if not (is_singles and is_major): continue
            
            p1_raw = m.get("event_first_player", "")
            if "/" in p1_raw: continue

            # 3. Данные
            m_id = str(m.get("event_key"))
            t_raw = m.get("tournament_name") or ""
            t_clean = t_raw.replace(" Singles", "").strip()
            
            st_raw = str(m.get("event_status", "")).lower()
            status = "PLANNED"
            is_api_live = str(m.get("event_live", "0")) == "1"
            
            if any(x in st_raw for x in ["can", "int", "walk", "w/o"]): status = "CANCELLED"
            elif any(x in st_raw for x in ["fin", "aft", "ret"]): status = "COMPLETED"
            elif is_api_live or any(x in st_raw for x in ["live", "set", "game"]): status = "LIVE"
            
            score_str = build_score(m)
            
            # Проверка на LIVE по счету (только если есть цифры)
            if status == "PLANNED" and score_str and any(c.isdigit() for c in score_str):
                status = "LIVE"

            winner = None
            if status == "COMPLETED":
                w = m.get("event_winner", "")
                if "First" in w or "Home" in w: winner = 1
                elif "Second" in w or "Away" in w: winner = 2

            # Время
            d_part = m.get("event_date", "")
            t_part = m.get("event_time", "")
            start_dt = None
            try:
                start_dt = datetime.strptime(f"{d_part} {t_part}", "%Y-%m-%d %H:%M")
            except: pass

            # --- ЗАПИСЬ В БД ---
            existing = session.query(DailyMatch).filter(DailyMatch.id == m_id).first()
            
            if not existing:
                # Создаем новый
                new_match = DailyMatch(
                    id=m_id,
                    tournament=t_clean,
                    status=status,
                    round=clean_round(m.get("tournament_round")),
                    start_time=start_dt,
                    player1=translate(p1_raw),
                    player2=translate(m.get("event_second_player")),
                    score=score_str,
                    winner=winner
                )
                session.add(new_match)
            else:
                # Обновляем существующий
                existing.status = status
                existing.score = score_str
                existing.winner = winner
                # Время и имена тоже можно обновить, вдруг поменялись
                if start_dt: existing.start_time = start_dt
            
            session.flush()
            
            # Если завершен - считаем очки
            if status == "COMPLETED" and winner is not None:
                process_match_results(m_id, session)

        session.commit()
        
    except Exception as e:
        logger.error(f"Direct Sync Error: {e}")
        session.rollback()
    finally:
        session.close()