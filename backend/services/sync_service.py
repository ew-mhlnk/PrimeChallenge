import asyncio
from functools import partial
import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import re
import pytz 

from database.db import SessionLocal
from database.models import (
    DailyMatch, DailyPick, DailyLeaderboard 
)
from utils.score_calculator import update_tournament_leaderboard
from utils.daily_calculator import process_match_results

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ==========================================

def clean_sheet_value(value):
    if not value: return None
    v = str(value).strip()
    upper_v = v.upper()
    BAD_WORDS = ["#ERROR", "#N/A", "#REF", "#NAME", "LOADING", "ЗАГРУЗКА", "ВЫЧИСЛЕНИЕ", "#DIV/0", "ERROR"]
    for bad in BAD_WORDS:
        if v.startswith("#") or bad in upper_v:
            return None
    return v

def get_google_sheets_client():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    credentials_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    if not credentials_json:
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS missing")
    credentials = ServiceAccountCredentials.from_json_keyfile_dict(json.loads(credentials_json), scope)
    return gspread.authorize(credentials)

def parse_datetime(date_str: str):
    if not date_str: return None
    date_str = str(date_str).strip()
    formats = ["%d.%m.%Y %H:%M:%S", "%d.%m.%Y %H:%M", "%d.%m.%Y", "%Y-%m-%d %H:%M:%S"]
    msk_tz = pytz.timezone('Europe/Moscow')
    for fmt in formats:
        try:
            dt_naive = datetime.strptime(date_str, fmt)
            dt_msk = msk_tz.localize(dt_naive)
            return dt_msk.astimezone(pytz.UTC)
        except ValueError:
            continue
    return None

def normalize_name(name: str) -> str:
    if not name: return ""
    name = re.sub(r'\s*\(.*?\)', '', str(name))
    clean = re.sub(r'[^\w]', '', name).strip().lower()
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
        base_map = {
            "R64": (1, 4), 
            "R32": (3, 8), 
            "R16": (7, 16), 
            "QF": (15, 32), 
            # ИСПРАВЛЕНО: Было 33, стало 31 (строки 32/33 в таблице)
            "SF": (31, 64), 
            "F": (63, 128)
        }

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
    for i in range(count): indices.append(start_idx + (i * step))
    return indices

# ==========================================
# 1. СИНХРОНИЗАЦИЯ ТУРНИРОВ (BRACKET)
# ==========================================

def _sync_tournaments_logic(engine: Engine) -> None:
    # logger.info("--- STARTING TOURNAMENTS SYNC (THREAD) ---")
    try:
        client = get_google_sheets_client()
        sheet = client.open_by_key(os.getenv("GOOGLE_SHEET_ID"))
    except Exception as e:
        logger.error(f"Sheet connect error: {e}")
        return

    with engine.connect() as conn:
        try:
            rows = sheet.worksheet("tournaments").get_all_values()
        except: return

        tournaments_to_sync = []
        now = datetime.now(pytz.UTC)

        for row in rows[1:]:
            if len(row) < 1: continue
            tid_str = str(row[0]).strip()
            if not tid_str.isdigit(): continue
            row += [""] * (16 - len(row))

            with conn.begin_nested():
                try:
                    tid = int(tid_str)
                    name = row[1]
                    dates = row[2]
                    status_raw = str(row[3]).upper().strip()
                    sheet_name = row[4]
                    s_round = row[5]
                    t_type = row[6]
                    start = row[7]
                    close = row[8]
                    tag = row[9]
                    surface = row[10]
                    defending = row[11]
                    info = row[12]
                    matches_count = row[13]
                    month_val = row[14]
                    img_url = row[15]

                    status = status_raw
                    start_dt = parse_datetime(start)
                    close_dt = parse_datetime(close)
                    
                    if status in ["COMPLETED", "CLOSED"]: pass 
                    elif close_dt and now >= close_dt: status = "CLOSED"
                    elif start_dt and now >= start_dt and sheet_name and sheet_name.strip(): status = "ACTIVE"
                    else: status = "PLANNED"

                    conn.execute(text("""
                        INSERT INTO tournaments (
                            id, name, dates, status, sheet_name, starting_round, type, start, close, tag,
                            surface, defending_champion, description, matches_count, month, image_url
                        )
                        VALUES (:id, :name, :dates, :status, :sheet, :sr, :type, :start, :close, :tag,
                                :surf, :defend, :desc, :mc, :month, :img)
                        ON CONFLICT (id) DO UPDATE SET 
                        name=EXCLUDED.name, dates=EXCLUDED.dates, status=EXCLUDED.status, 
                        sheet_name=EXCLUDED.sheet_name, starting_round=EXCLUDED.starting_round,
                        type=EXCLUDED.type, start=EXCLUDED.start, close=EXCLUDED.close, tag=EXCLUDED.tag,
                        surface=EXCLUDED.surface, defending_champion=EXCLUDED.defending_champion,
                        description=EXCLUDED.description, matches_count=EXCLUDED.matches_count,
                        month=EXCLUDED.month, image_url=EXCLUDED.image_url
                    """), {
                        "id": tid, "name": name, "dates": dates, "status": status, 
                        "sheet": sheet_name, "sr": s_round, "type": t_type, 
                        "start": start, "close": close, "tag": tag,
                        "surf": surface, "defend": defending, "desc": info, 
                        "mc": matches_count, "month": month_val, "img": img_url
                    })
                    
                    draw_size = 32
                    s_round_clean = s_round.strip().upper()
                    if s_round_clean == "R128": draw_size = 128
                    elif s_round_clean == "R64": draw_size = 64
                    elif s_round_clean == "R32": draw_size = 32
                    else:
                        t_type_lower = t_type.lower()
                        if "1000" in t_type_lower: draw_size = 64
                        elif "slam" in t_type_lower or "тбш" in tag.lower(): draw_size = 128
                    
                    # === ОПТИМИЗАЦИЯ ===
                    # ACTIVE: Прием прогнозов
                    # CLOSED: Идет прямо сейчас (нужен пересчет очков!)
                    if status in ["ACTIVE", "CLOSED"]:
                        tournaments_to_sync.append((tid, sheet_name, draw_size))
                        
                except Exception as e:
                    logger.error(f"Row parsing error ID={tid_str}: {e}")
        conn.commit()

        for tid, sheet_name, draw_size in tournaments_to_sync:
             try:
                try:
                    ws = sheet.worksheet(sheet_name)
                    data = ws.get_all_values()
                except: 
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
                            if val: champion = val; break
                
                with conn.begin_nested():
                    for round_name in rounds_order:
                        if round_name not in cols: continue
                        col_idx = cols[round_name]
                        row_indices = get_match_rows(round_name, draw_size)
                        
                        for i, r_idx in enumerate(row_indices):
                            match_number = i + 1
                            if r_idx + 1 >= len(data): continue
                            row1 = data[r_idx]; row2 = data[r_idx+1]
                            
                            raw_p1 = row1[col_idx] if col_idx < len(row1) else ""
                            raw_p2 = row2[col_idx] if col_idx < len(row2) else ""
                            p1 = clean_sheet_value(raw_p1) or ""
                            p2 = clean_sheet_value(raw_p2) or ""
                            winner = None
                            
                            if p1 and p2:
                                if p2.lower() == "bye": winner = p1
                                elif p1.lower() == "bye": winner = p2
                                elif round_name != "F":
                                    curr_r_idx_list = rounds_order.index(round_name)
                                    next_round_name = None
                                    for k in range(curr_r_idx_list + 1, len(rounds_order)):
                                        if rounds_order[k] in cols: next_round_name = rounds_order[k]; break
                                    
                                    if next_round_name:
                                        next_col = cols[next_round_name]
                                        next_round_indices = get_match_rows(next_round_name, draw_size)
                                        target_match_idx = i // 2
                                        if target_match_idx < len(next_round_indices):
                                            next_r_start = next_round_indices[target_match_idx]
                                            candidates = []
                                            if next_r_start < len(data) and next_col < len(data[next_r_start]): 
                                                candidates.append(clean_sheet_value(data[next_r_start][next_col]))
                                            if next_r_start + 1 < len(data) and next_col < len(data[next_r_start+1]): 
                                                candidates.append(clean_sheet_value(data[next_r_start+1][next_col]))
                                            for cand in candidates:
                                                if not cand: continue
                                                if is_same_player(p1, cand): winner = p1; break
                                                elif is_same_player(p2, cand): winner = p2; break
                            
                            if round_name == "F" and champion:
                                if p1 and is_same_player(p1, champion): winner = p1
                                elif p2 and is_same_player(p2, champion): winner = p2
                            
                            scores = []
                            for s_off in range(1, 6):
                                sc_idx = col_idx + s_off
                                if sc_idx >= len(row1): scores.append(None); continue
                                if sc_idx < len(headers) and headers[sc_idx].strip() in rounds_order: scores.append(None); continue
                                s1_val = clean_sheet_value(row1[sc_idx])
                                s2_val = clean_sheet_value(row2[sc_idx])
                                if s1_val and s2_val: scores.append(f"{s1_val}-{s2_val}")
                                else: scores.append(None)
                            s1, s2, s3, s4, s5 = (scores + [None]*5)[:5]
                            
                            conn.execute(text("""
                                INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner, set1, set2, set3, set4, set5)
                                VALUES (:tid, :rnd, :mn, :p1, :p2, :win, :s1, :s2, :s3, :s4, :s5)
                                ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                                SET player1=EXCLUDED.player1, player2=EXCLUDED.player2, winner=EXCLUDED.winner,
                                    set1=EXCLUDED.set1, set2=EXCLUDED.set2, set3=EXCLUDED.set3, set4=EXCLUDED.set4, set5=EXCLUDED.set5
                            """), {
                                "tid": tid, "rnd": round_name, "mn": match_number, 
                                "p1": p1, "p2": p2, "win": winner, 
                                "s1": s1, "s2": s2, "s3": s3, "s4": s4, "s5": s5
                            })
                    if champion:
                        conn.execute(text("""
                            INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner)
                            VALUES (:tid, 'Champion', 1, :name, NULL, :name)
                            ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                            SET winner=EXCLUDED.winner, player1=EXCLUDED.player1
                        """), {"tid": tid, "name": champion})
                        
                        # === АВТО-ЗАКРЫТИЕ ОТКЛЮЧЕНО ===
                        # Турнир остается ACTIVE/CLOSED, чтобы мы могли проверить очки.
                        # Статус COMPLETED ставится вручную в Гугл Таблице.
                        # conn.execute(text("UPDATE tournaments SET status='COMPLETED' WHERE id=:id"), {"id": tid})
                
                conn.commit()
                db_session = SessionLocal()
                try: update_tournament_leaderboard(tid, db_session)
                except Exception as ex: logger.error(str(ex))
                finally: db_session.close()
             except Exception as e: logger.error(f"Sync error T{tid}: {e}")
        conn.commit()

async def sync_google_sheets_with_db(engine: Engine) -> None:
    """
    Асинхронная обертка для синхронизации турниров.
    """
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _sync_tournaments_logic, engine)

# ==========================================
# 2. СИНХРОНИЗАЦИЯ DAILY CHALLENGE
# ==========================================

def _sync_daily_logic(engine: Engine) -> None:
    # logger.info("--- STARTING DAILY SYNC (THREAD) ---")
    try:
        client = get_google_sheets_client()
        sheet = client.open_by_key(os.getenv("GOOGLE_SHEET_ID"))
        try:
            ws = sheet.worksheet("DAILY_MATCHES")
        except:
            return
        rows = ws.get_all_values()
    except Exception as e:
        logger.error(f"Google Sheet error: {e}")
        return

    if len(rows) < 2: return
    session = SessionLocal()
    
    try:
        valid_sheet_ids = set()
        ids_to_delete = set()
        
        # 1. UPSERT (Вставка/Обновление)
        for row in rows[1:]:
            while len(row) < 10: row.append("")
            
            m_id = str(row[0]).strip()
            if not m_id: continue
            
            # --- ПРОВЕРКА РУЧНОГО БЛОКА (X) ---
            manual_block = str(row[9]).strip().upper()
            if manual_block == "X":
                ids_to_delete.add(m_id)
                continue # Не добавляем в БД
            
            valid_sheet_ids.add(m_id)
            
            tour_name = row[1].strip()
            status_raw = row[2].strip().upper()
            round_name = row[3].strip()
            time_str = row[4].strip()
            p1 = row[5].strip()
            p2 = row[6].strip()
            score_text = row[7].strip()
            winner_raw = row[8].strip()

            match_date = None
            if time_str:
                try: match_date = datetime.strptime(time_str, "%d.%m.%Y %H:%M")
                except: pass
            
            winner_val = None
            if winner_raw == "1": winner_val = 1
            elif winner_raw == "2": winner_val = 2
            
            # === ФИКС LIVE СТАТУСА ===
            # Если написано LIVE, игнорируем победителя (это баг API или ошибка ввода)
            if status_raw == "LIVE":
                winner_val = None
            # Если не LIVE, но есть победитель -> значит матч завершен
            elif winner_val is not None:
                status_raw = "COMPLETED"

            match = session.query(DailyMatch).filter(DailyMatch.id == m_id).first()
            if not match:
                match = DailyMatch(
                    id=m_id, tournament=tour_name, status=status_raw, round=round_name,
                    start_time=match_date, player1=p1, player2=p2, score=score_text, winner=winner_val
                )
                session.add(match)
            else:
                match.tournament = tour_name
                match.status = status_raw
                match.round = round_name
                match.start_time = match_date
                match.player1 = p1
                match.player2 = p2
                match.score = score_text
                match.winner = winner_val
            
            session.flush()
            
            if match.status == "COMPLETED" and match.winner is not None:
                process_match_results(match.id, session)

        # 2. CLEANUP (Чистка мусора и заблокированных)
        db_matches = session.query(DailyMatch).all()
        matches_to_remove = []
        
        for db_m in db_matches:
            # Удаляем, если стоит X в таблице ИЛИ если матча вообще нет в таблице
            if db_m.id in ids_to_delete or db_m.id not in valid_sheet_ids:
                matches_to_remove.append(db_m.id)
        
        if matches_to_remove:
            # logger.info(f"Cleaning up {len(matches_to_remove)} matches from DB...")
            
            # А. Удаляем пики
            session.execute(
                text("DELETE FROM daily_picks WHERE match_id IN :ids"),
                {"ids": tuple(matches_to_remove)}
            )
            
            # Б. Удаляем матчи
            session.execute(
                text("DELETE FROM daily_matches WHERE id IN :ids"),
                {"ids": tuple(matches_to_remove)}
            )
            
            # В. Пересчитываем лидерборд
            session.execute(text("DELETE FROM daily_leaderboard"))
            session.execute(text("""
                INSERT INTO daily_leaderboard (user_id, total_points, correct_picks, total_picks)
                SELECT 
                    user_id, 
                    COALESCE(SUM(points), 0),
                    COUNT(CASE WHEN is_correct = true THEN 1 END),
                    COUNT(*)
                FROM daily_picks
                GROUP BY user_id
            """))
            
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Daily Sync DB Error: {e}")
    finally:
        session.close()

async def sync_daily_challenge(engine: Engine) -> None:
    """
    Асинхронная обертка для синхронизации Daily Challenge.
    """
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _sync_daily_logic, engine)