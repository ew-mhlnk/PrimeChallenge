import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pytz
import re

# === НОВЫЕ ИМПОРТЫ ДЛЯ РАСЧЕТА ОЧКОВ ===
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

def parse_datetime(date_str: str) -> datetime:
    if not date_str: return None
    try:
        return datetime.strptime(date_str, "%d.%m.%Y %H:%M:%S").replace(tzinfo=pytz.UTC)
    except ValueError:
        try:
            return datetime.strptime(date_str, "%d.%m.%Y %H:%M").replace(tzinfo=pytz.UTC)
        except ValueError:
            return None

# === УМНОЕ СРАВНЕНИЕ ИМЕН ===
def normalize_name(name: str) -> str:
    """Очищает имя: '🇪🇸 A. Zverev (1)' -> 'zverev'"""
    if not name: return ""
    # Убираем содержимое скобок в конце
    name = re.sub(r'\s*\(.*?\)$', '', name)
    # Оставляем только буквы
    clean = re.sub(r'[^\w\s]', '', name).strip().lower()
    parts = clean.split()
    # Возвращаем последнее слово (Фамилия)
    return parts[-1] if parts else ""

def is_same_player(p1_raw, p2_raw):
    n1 = normalize_name(p1_raw)
    n2 = normalize_name(p2_raw)
    if not n1 or not n2: return False
    return n1 == n2 or n1 in n2 or n2 in n1

async def sync_google_sheets_with_db(engine: Engine) -> None:
    print("--- STARTING FULL SYNC (MATCHES + SCORES) ---")
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
            if len(row) < 10: continue
            with conn.begin_nested():
                try:
                    tid, name, dates, status, sheet_name, s_round, t_type, start, close, tag = row[:10]
                    tid = int(tid)
                    status = status.upper().strip()

                    if start:
                        start_dt = parse_datetime(start)
                        if start_dt and status == "ACTIVE" and now > start_dt:
                            status = "CLOSED"

                    conn.execute(text("""
                        INSERT INTO tournaments (id, name, dates, status, sheet_name, starting_round, type, start, close, tag)
                        VALUES (:id, :name, :dates, :status, :sheet, :sr, :type, :start, :close, :tag)
                        ON CONFLICT (id) DO UPDATE SET 
                        name=EXCLUDED.name, dates=EXCLUDED.dates, status=EXCLUDED.status, 
                        sheet_name=EXCLUDED.sheet_name, starting_round=EXCLUDED.starting_round,
                        type=EXCLUDED.type, start=EXCLUDED.start, close=EXCLUDED.close, tag=EXCLUDED.tag
                    """), {"id": tid, "name": name, "dates": dates, "status": status, "sheet": sheet_name, 
                           "sr": s_round, "type": t_type, "start": start, "close": close, "tag": tag})
                    
                    tournaments_to_sync.append((tid, sheet_name))
                except Exception as e:
                    logger.error(f"Row error: {e}")
        conn.commit()

        # 2. MATCHES
        for tid, sheet_name in tournaments_to_sync:
            print(f"Syncing T{tid}...")
            try:
                # Используем begin_nested для транзакции SQL
                with conn.begin_nested():
                    try:
                        ws = sheet.worksheet(sheet_name)
                        data = ws.get_all_values()
                    except: continue
                    
                    if len(data) < 2: continue
                    headers = data[0]
                    cols = {h: i for i, h in enumerate(headers)}
                    rounds = ["R128", "R64", "R32", "R16", "QF", "SF", "F"]
                    
                    champion = None
                    if "Champion" in cols and len(data) > 1:
                        val = data[1][cols["Champion"]].strip()
                        if val: champion = val

                    row_idx = 1
                    while row_idx < len(data) - 1:
                        r1, r2 = data[row_idx], data[row_idx+1]
                        
                        for round_name in rounds:
                            if round_name not in cols: continue
                            idx = cols[round_name]
                            
                            p1 = r1[idx].strip() if idx < len(r1) else ""
                            p2 = r2[idx].strip() if idx < len(r2) else ""
                            
                            if not p1 or not p2: continue

                            m_num = 1
                            for i in range(1, row_idx, 2):
                                if idx < len(data[i]) and data[i][idx].strip(): m_num += 1
                            
                            winner = None
                            
                            # 1. BYE Logic
                            if p2.lower() == "bye": winner = p1
                            elif p1.lower() == "bye": winner = p2
                            
                            # 2. Regular Match Logic
                            elif round_name != "F":
                                curr_r_idx = rounds.index(round_name)
                                if curr_r_idx < len(rounds) - 1:
                                    next_r = rounds[curr_r_idx + 1]
                                    if next_r in cols:
                                        n_idx = cols[next_r]
                                        
                                        # === DEEP SEARCH ===
                                        candidates = []
                                        search_start = max(0, row_idx - 5)
                                        search_end = min(len(data), row_idx + 40) 
                                        
                                        for s_row in range(search_start, search_end):
                                            if n_idx < len(data[s_row]):
                                                val = data[s_row][n_idx].strip()
                                                if val: candidates.append(val)
                                        
                                        for cand in candidates:
                                            if is_same_player(p1, cand):
                                                winner = p1
                                                break
                                            elif is_same_player(p2, cand):
                                                winner = p2
                                                break

                            # 3. Final Logic
                            if round_name == "F" and champion:
                                if is_same_player(p1, champion): winner = p1
                                elif is_same_player(p2, champion): winner = p2

                            # SCORES
                            scores = []
                            for s_off in range(1, 6):
                                sc_idx = idx + s_off
                                if sc_idx >= len(r1): 
                                    scores.append(None); continue
                                s1_val = r1[sc_idx].strip()
                                s2_val = r2[sc_idx].strip()
                                if s1_val and s2_val and s1_val not in rounds:
                                     scores.append(f"{s1_val}-{s2_val}")
                                else:
                                     scores.append(None)
                            
                            s1, s2, s3, s4, s5 = (scores + [None]*5)[:5]

                            conn.execute(text("""
                                INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner, set1, set2, set3, set4, set5)
                                VALUES (:tid, :rnd, :mn, :p1, :p2, :win, :s1, :s2, :s3, :s4, :s5)
                                ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                                SET player1=EXCLUDED.player1, player2=EXCLUDED.player2, winner=EXCLUDED.winner,
                                    set1=EXCLUDED.set1, set2=EXCLUDED.set2, set3=EXCLUDED.set3, set4=EXCLUDED.set4, set5=EXCLUDED.set5
                            """), {
                                "tid": tid, "rnd": round_name, "mn": m_num, "p1": p1, "p2": p2, "win": winner,
                                "s1": s1, "s2": s2, "s3": s3, "s4": s4, "s5": s5
                            })

                        row_idx += 2

                    if champion:
                        conn.execute(text("""
                            INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner)
                            VALUES (:tid, 'Champion', 1, :name, NULL, :name)
                            ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                            SET winner=EXCLUDED.winner, player1=EXCLUDED.player1
                        """), {"tid": tid, "name": champion})
                        
                        conn.execute(text("UPDATE tournaments SET status='COMPLETED' WHERE id=:id"), {"id": tid})

                # === ВАЖНО: КОММИТИМ ДАННЫЕ МАТЧЕЙ, ЧТОБЫ КАЛЬКУЛЯТОР ИХ ВИДЕЛ ===
                conn.commit()
                
                # === ПЕРЕСЧЕТ ОЧКОВ (LEADERBOARD) ===
                print(f"Recalculating scores for T{tid}...")
                db_session = SessionLocal()
                try:
                    update_tournament_leaderboard(tid, db_session)
                except Exception as calc_error:
                    logger.error(f"Score calc error T{tid}: {calc_error}")
                finally:
                    db_session.close()

            except Exception as e:
                logger.error(f"Sync error T{tid}: {e}")
                continue
        
        # Финальный коммит на всякий случай (хотя мы уже коммитили внутри цикла)
        conn.commit()
        print("--- SYNC FINISHED ---")