import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pytz

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

async def sync_google_sheets_with_db(engine: Engine) -> None:
    logger.info("Starting sync...")
    try:
        client = get_google_sheets_client()
        sheet = client.open_by_key(os.getenv("GOOGLE_SHEET_ID"))
    except Exception as e:
        logger.error(f"Sheet connect error: {e}")
        return

    with engine.connect() as conn:
        # 1. ТУРНИРЫ
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

                    # Auto-close logic
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

        # 2. МАТЧИ
        for tid, sheet_name in tournaments_to_sync:
            try:
                with conn.begin_nested():
                    try:
                        ws = sheet.worksheet(sheet_name)
                        data = ws.get_all_values()
                    except: continue
                    
                    if len(data) < 2: continue
                    headers = data[0]
                    
                    # Карта колонок раундов
                    # R128 - col A (0), R64 - col G (6), R32 - col M (12) ... (шаг 6)
                    cols = {h: i for i, h in enumerate(headers)}
                    rounds = ["R128", "R64", "R32", "R16", "QF", "SF", "F"]
                    
                    # Чемпион
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
                            
                            # 1. BYE Logic (Automatic win)
                            if p2.lower() == "bye": winner = p1
                            elif p1.lower() == "bye": winner = p2
                            
                            # 2. Regular Match Logic
                            elif round_name != "F":
                                curr_r_idx = rounds.index(round_name)
                                if curr_r_idx < len(rounds) - 1:
                                    next_r = rounds[curr_r_idx + 1]
                                    if next_r in cols:
                                        n_idx = cols[next_r]
                                        # Проверяем следующую колонку
                                        np1 = r1[n_idx].strip() if n_idx < len(r1) else ""
                                        np2 = r2[n_idx].strip() if n_idx < len(r2) else ""
                                        if np1 in [p1, p2]: winner = np1
                                        elif np2 in [p1, p2]: winner = np2
                            
                            # 3. Final Logic
                            if round_name == "F" and champion and champion in [p1, p2]:
                                winner = champion

                            # === СЧЕТ (SCORES) ===
                            # Структура: Имя | S1 | S2 | S3 | S4 | S5 | СледующийРаунд
                            # Индексы:   idx | +1 | +2 | +3 | +4 | +5
                            scores = []
                            for s_off in range(1, 6):
                                sc_idx = idx + s_off
                                if sc_idx >= len(r1): break
                                
                                s1_val = r1[sc_idx].strip()
                                s2_val = r2[sc_idx].strip()
                                
                                if s1_val and s2_val:
                                    scores.append(f"{s1_val}-{s2_val}")
                                else:
                                    scores.append(None)
                            
                            # Дополняем до 5
                            while len(scores) < 5: scores.append(None)
                            s1, s2, s3, s4, s5 = scores

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

                    # Чемпион
                    if champion:
                        conn.execute(text("""
                            INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner)
                            VALUES (:tid, 'Champion', 1, :name, NULL, :name)
                            ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                            SET winner=EXCLUDED.winner, player1=EXCLUDED.player1
                        """), {"tid": tid, "name": champion})
                        
                        # Ставим COMPLETED
                        conn.execute(text("UPDATE tournaments SET status='COMPLETED' WHERE id=:id"), {"id": tid})

            except Exception as e:
                logger.error(f"Sync error T{tid}: {e}")
                continue
        conn.commit()