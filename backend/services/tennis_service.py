import logging
import requests
import re
import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database.db import SessionLocal
from database.models import DailyMatch
from utils.daily_calculator import process_match_results

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

def get_google_client():
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds_json = os.getenv("GOOGLE_CREDENTIALS") or os.getenv("GOOGLE_SHEETS_CREDENTIALS")
        if not creds_json:
            return None
        creds = ServiceAccountCredentials.from_json_keyfile_dict(json.loads(creds_json), scope)
        return gspread.authorize(creds)
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
            full_eng = row[0].strip()
            short_eng = row[3].strip()
            flag = row[5].strip()
            rus_name = row[8].strip()
            if rus_name:
                final_str = f"{flag} {rus_name}".strip()
                if full_eng: new_dict[full_eng.lower()] = final_str
                if short_eng: new_dict[short_eng.lower()] = final_str
        PLAYER_DICT = new_dict
        logger.info(f"📚 Dict loaded: {len(PLAYER_DICT)}")
    except Exception as e:
        logger.error(f"Dict load error: {e}")

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

def fetch_from_api(date_str):
    if not API_KEY: return []
    params = {
        "method": "get_fixtures", "APIkey": API_KEY,
        "date_start": date_str, "date_stop": date_str, "timezone": "Europe/Moscow"
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
    if not PLAYER_DICT:
        load_dictionary_from_sheets()

    session = SessionLocal()
    try:
        dates = [
            (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            datetime.now().strftime("%Y-%m-%d"),
            (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        ]
        
        raw_matches = []
        for d in dates:
            raw_matches += fetch_from_api(d)
            
        if not raw_matches: return

        for m in raw_matches:
            qual_val = str(m.get("event_qualification", "")).lower()
            if qual_val in ["true", "1"]: continue
            r_raw = str(m.get("tournament_round", "")).lower()
            if "qual" in r_raw or "prelim" in r_raw: continue

            etype = str(m.get("event_type_type", "")).title()
            if any(b in etype for b in INVALID_TYPES): continue
            is_singles = "Singles" in etype or "United Cup" in etype
            is_major = any(x in etype for x in ["Atp", "Wta", "Open", "Slam", "Cup"])
            if not (is_singles and is_major): continue
            p1_raw = m.get("event_first_player", "")
            if "/" in p1_raw: continue

            m_id = str(m.get("event_key"))
            t_raw = m.get("tournament_name") or ""
            t_clean = t_raw.replace(" Singles", "").strip()
            if "Wta" in etype and "WTA" not in t_clean: t_clean = f"WTA {t_clean}"
            elif "Atp" in etype and "ATP" not in t_clean: t_clean = f"ATP {t_clean}"
            
            st_raw = str(m.get("event_status", "")).lower()
            status = "PLANNED"
            is_api_live = str(m.get("event_live", "0")) == "1"
            
            if any(x in st_raw for x in ["can", "int", "walk", "w/o"]): status = "CANCELLED"
            elif any(x in st_raw for x in ["fin", "aft", "ret"]): status = "COMPLETED"
            elif is_api_live or any(x in st_raw for x in ["live", "set", "game"]): status = "LIVE"
            
            score_str = build_score(m)
            
            winner = None
            if status == "COMPLETED":
                w = m.get("event_winner", "")
                if "First" in w or "Home" in w: winner = 1
                elif "Second" in w or "Away" in w: winner = 2

            d_part = m.get("event_date", "")
            t_part = m.get("event_time", "")
            start_dt = None
            try:
                start_dt = datetime.strptime(f"{d_part} {t_part}", "%Y-%m-%d %H:%M")
            except: pass

            existing = session.query(DailyMatch).filter(DailyMatch.id == m_id).first()
            
            p1_ru = translate(p1_raw)
            p2_ru = translate(m.get("event_second_player"))
            
            if not existing:
                new_match = DailyMatch(
                    id=m_id, tournament=t_clean, status=status,
                    round=clean_round(m.get("tournament_round")),
                    start_time=start_dt,
                    player1=p1_ru, player2=p2_ru,
                    score=score_str, winner=winner
                )
                session.add(new_match)
            else:
                existing.status = status
                existing.score = score_str
                existing.winner = winner
                if start_dt: existing.start_time = start_dt
                existing.player1 = p1_ru
                existing.player2 = p2_ru
            
            session.flush()
            if status == "COMPLETED" and winner is not None:
                process_match_results(m_id, session)

        session.commit()
    except Exception as e:
        logger.error(f"Direct Sync Error: {e}")
        session.rollback()
    finally:
        session.close()