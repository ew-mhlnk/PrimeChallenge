import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pytz
import re

from utils.score_calculator import update_tournament_leaderboard
from database.db import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_google_sheets_client():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    credentials_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    if not credentials_json:
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS missing")
    credentials = ServiceAccountCredentials.from_json_keyfile_dict(json.loads(credentials_json), scope)
    return gspread.authorize(credentials)

def parse_datetime(date_str: str):
    if not date_str: return None
    date_str = date_str.strip()
    formats = ["%d.%m.%Y %H:%M:%S", "%d.%m.%Y %H:%M", "%d.%m.%Y", "%Y-%m-%d %H:%M:%S"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).replace(tzinfo=pytz.UTC)
        except ValueError:
            continue
    return None

def normalize_name(name: str) -> str:
    if not name: return ""
    name = re.sub(r'\s*\(.*?\)', '', name)
    clean = re.sub(r'[^a-zA-Z]', '', name).strip().lower()
    return clean

def is_same_player(p1_raw, p2_raw):
    n1 = normalize_name(p1_raw)
    n2 = normalize_name(p2_raw)
    if not n1 or not n2: return False
    if n1 == n2: return True
    if len(n1) > 3 and len(n2) > 3:
        if n1 in n2 or n2 in n1: return True
    return False

def get_match_rows(round_name: str, draw_size: int):
    rounds_order = ["F", "SF", "QF", "R16", "R32", "R64", "R128"]
    if round_name not in rounds_order: return []
    if draw_size == 128:
        base_map = {"R128": (1, 4), "R64": (3, 8), "R32": (7, 16), "R16": (15, 32), "QF": (31, 64), "SF": (63, 128), "F": (127, 256)}
    elif draw_size == 64:
        base_map = {"R64": (1, 4), "R32": (3, 8), "R16": (7, 16), "QF": (15, 32), "SF": (31, 64), "F": (63, 128)}
    else: 
        base_map = {"R32": (1, 4), "R16": (3, 8), "QF": (7, 16), "SF": (15, 32), "F": (31, 64)}
    if round_name not in base_map: return []
    start_idx, step = base_map[round_name]
    if round_name == "F": count = 1
    elif round_name == "SF": count = 2
    elif round_name == "QF": count = 4
    elif round_name == "R16": count = 8
    elif round_name == "R32": count = 16
    elif round_name == "R64": count = 32
    elif round_name == "R128": count = 64
    else: count = 0
    indices = []
    for i in range(count):
        indices.append(start_idx + (i * step))
    return indices

async def sync_google_sheets_with_db(engine: Engine) -> None:
    print("--- STARTING SYNC (FULL LOGIC) ---")
    try:
        client = get_google_sheets_client()
        sheet = client.open_by_key(os.getenv("GOOGLE_SHEET_ID"))
    except Exception as e:
        logger.error(f"Sheet connect error: {e}")
        return

    with engine.connect() as conn:
        # 1. TOURNAMENTS
        try:
            rows = sheet.worksheet("tournaments").get_all_values()
        except: return

        tournaments_to_sync = []
        now = datetime.now(pytz.UTC)

        for row in rows[1:]:
            if len(row) < 1: continue 
            row += [""] * (15 - len(row)) # Дополняем до 15 колонок

            with conn.begin_nested():
                try:
                    # РАСПАКОВКА: 15 полей
                    tid_str, name, dates, status_raw, sheet_name, s_round, t_type, start, close, tag, surface, defending, info, matches_count, month_val = row[:15]
                    
                    tid = int(tid_str)
                    status = status_raw.upper().strip()
                    
                    # --- НОВАЯ ЛОГИКА СТАТУСОВ ---
                    start_dt = parse_datetime(start) # Открытие прогнозов
                    close_dt = parse_datetime(close) # Закрытие (начало матчей)
                    
                    # 1. Ручной COMPLETED
                    if status == "COMPLETED":
                        pass
                    
                    # 2. Если дедлайн наступил -> CLOSED
                    elif close_dt and now >= close_dt:
                        status = "CLOSED"
                        
                    # 3. Если открытие наступило И дедлайн НЕ наступил И сетка есть -> ACTIVE
                    elif start_dt and now >= start_dt and sheet_name and sheet_name.strip():
                        status = "ACTIVE"
                        
                    # 4. Иначе (будущее, или нет сетки) -> PLANNED
                    else:
                        status = "PLANNED"
                    # -----------------------------

                    conn.execute(text("""
                        INSERT INTO tournaments (
                            id, name, dates, status, sheet_name, starting_round, type, start, close, tag,
                            surface, defending_champion, description, matches_count, month
                        )
                        VALUES (
                            :id, :name, :dates, :status, :sheet, :sr, :type, :start, :close, :tag,
                            :surf, :defend, :desc, :mc, :month
                        )
                        ON CONFLICT (id) DO UPDATE SET 
                        name=EXCLUDED.name, 
                        dates=EXCLUDED.dates, 
                        status=EXCLUDED.status, 
                        sheet_name=EXCLUDED.sheet_name, 
                        starting_round=EXCLUDED.starting_round,
                        type=EXCLUDED.type, 
                        start=EXCLUDED.start, 
                        close=EXCLUDED.close, 
                        tag=EXCLUDED.tag,
                        surface=EXCLUDED.surface,
                        defending_champion=EXCLUDED.defending_champion,
                        description=EXCLUDED.description,
                        matches_count=EXCLUDED.matches_count,
                        month=EXCLUDED.month
                    """), {
                        "id": tid, "name": name, "dates": dates, "status": status, 
                        "sheet": sheet_name, "sr": s_round, "type": t_type, 
                        "start": start, "close": close, "tag": tag,
                        "surf": surface, "defend": defending, "desc": info, "mc": matches_count, "month": month_val
                    })
                    
                    draw_size = 32
                    t_type_lower = t_type.lower()
                    if "1000" in t_type_lower: draw_size = 64
                    elif "slam" in t_type_lower or "тбш" in tag.lower(): draw_size = 128
                    
                    # Синхронизируем матчи, если это НЕ PLANNED
                    if status != "PLANNED":
                        tournaments_to_sync.append((tid, sheet_name, draw_size))
                        
                except Exception as e:
                    logger.error(f"Row parsing error ID={row[0] if row else '?'}: {e}")
        conn.commit()

        # 2. MATCHES
        for tid, sheet_name, draw_size in tournaments_to_sync:
             print(f"Syncing Matches for T{tid} ({sheet_name}) - Draw {draw_size}...")
             try:
                with conn.begin_nested():
                    try:
                        ws = sheet.worksheet(sheet_name)
                        data = ws.get_all_values()
                    except: 
                        print(f"Sheet {sheet_name} not found")
                        continue
                    
                    if len(data) < 2: continue
                    headers = data[0]
                    cols = {h.strip(): i for i, h in enumerate(headers) if h.strip()}
                    
                    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F"]
                    
                    champion = None
                    if "Champion" in cols and len(data) > 1:
                        champ_col = cols["Champion"]
                        for r_idx in range(1, len(data)):
                            if champ_col < len(data[r_idx]):
                                val = data[r_idx][champ_col].strip()
                                if val: 
                                    champion = val
                                    break

                    for round_name in rounds_order:
                        if round_name not in cols: continue
                        col_idx = cols[round_name]
                        row_indices = get_match_rows(round_name, draw_size)
                        
                        for i, r_idx in enumerate(row_indices):
                            match_number = i + 1
                            if r_idx + 1 >= len(data): continue
                            row1 = data[r_idx]
                            row2 = data[r_idx+1]
                            p1 = row1[col_idx].strip() if col_idx < len(row1) else ""
                            p2 = row2[col_idx].strip() if col_idx < len(row2) else ""
                            if not p1 and not p2: continue

                            winner = None
                            if p2.lower() == "bye": winner = p1
                            elif p1.lower() == "bye": winner = p2
                            elif round_name != "F":
                                curr_r_idx_list = rounds_order.index(round_name)
                                next_round_name = None
                                for k in range(curr_r_idx_list + 1, len(rounds_order)):
                                    if rounds_order[k] in cols:
                                        next_round_name = rounds_order[k]; break
                                if next_round_name:
                                    next_col = cols[next_round_name]
                                    next_round_indices = get_match_rows(next_round_name, draw_size)
                                    target_match_idx = i // 2
                                    if target_match_idx < len(next_round_indices):
                                        next_r_start = next_round_indices[target_match_idx]
                                        candidates = []
                                        if next_r_start < len(data): candidates.append(data[next_r_start][next_col].strip())
                                        if next_r_start + 1 < len(data): candidates.append(data[next_r_start+1][next_col].strip())
                                        for cand in candidates:
                                            if not cand: continue
                                            if is_same_player(p1, cand): winner = p1; break
                                            elif is_same_player(p2, cand): winner = p2; break
                            if round_name == "F" and champion:
                                if is_same_player(p1, champion): winner = p1
                                elif is_same_player(p2, champion): winner = p2

                            scores = []
                            for s_off in range(1, 6):
                                sc_idx = col_idx + s_off
                                if sc_idx >= len(row1): scores.append(None); continue
                                if sc_idx < len(headers) and headers[sc_idx].strip() in rounds_order: scores.append(None); continue
                                s1_val = row1[sc_idx].strip(); s2_val = row2[sc_idx].strip()
                                if s1_val and s2_val: scores.append(f"{s1_val}-{s2_val}")
                                else: scores.append(None)
                            s1, s2, s3, s4, s5 = (scores + [None]*5)[:5]

                            conn.execute(text("""
                                INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner, set1, set2, set3, set4, set5)
                                VALUES (:tid, :rnd, :mn, :p1, :p2, :win, :s1, :s2, :s3, :s4, :s5)
                                ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                                SET player1=EXCLUDED.player1, player2=EXCLUDED.player2, winner=EXCLUDED.winner,
                                    set1=EXCLUDED.set1, set2=EXCLUDED.set2, set3=EXCLUDED.set3, set4=EXCLUDED.set4, set5=EXCLUDED.set5
                            """), {"tid": tid, "rnd": round_name, "mn": match_number, "p1": p1, "p2": p2, "win": winner, "s1": s1, "s2": s2, "s3": s3, "s4": s4, "s5": s5})

                    if champion:
                        conn.execute(text("""
                            INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner)
                            VALUES (:tid, 'Champion', 1, :name, NULL, :name)
                            ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                            SET winner=EXCLUDED.winner, player1=EXCLUDED.player1
                        """), {"tid": tid, "name": champion})
                        conn.execute(text("UPDATE tournaments SET status='COMPLETED' WHERE id=:id"), {"id": tid})
                conn.commit()
                # Recalculate logic...
                db_session = SessionLocal()
                try: update_tournament_leaderboard(tid, db_session)
                except Exception as ex: logger.error(str(ex))
                finally: db_session.close()
             except Exception as e: logger.error(f"Sync error T{tid}: {e}")
        conn.commit()
        print("--- SYNC FINISHED ---")