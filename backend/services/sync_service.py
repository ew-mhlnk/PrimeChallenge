import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pytz
import re

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

# === УЛУЧШЕННАЯ ОЧИСТКА ИМЕНИ ===
def normalize_name(name: str) -> str:
    if not name: return ""
    # 1. Убираем содержимое скобок в конце: "A. Zverev (1)" -> "A. Zverev "
    name = re.sub(r'\s*\(.*?\)$', '', name)
    # 2. Убираем флаги (любые символы, не являющиеся буквами, цифрами, точкой, пробелом или дефисом)
    # Внимание: это удалит эмодзи.
    # Если имена на латинице:
    name_clean = re.sub(r'[^\w\s\.\-]', '', name)
    return name_clean.strip().lower()

def is_same_player(p1_raw, p2_raw):
    n1 = normalize_name(p1_raw)
    n2 = normalize_name(p2_raw)
    if not n1 or not n2: return False
    
    # Прямое совпадение
    if n1 == n2: return True
    
    # Проверка по фамилии (последнее слово)
    # n1="a. zverev", n2="zverev" -> match
    parts1 = n1.split()
    parts2 = n2.split()
    if parts1 and parts2 and parts1[-1] == parts2[-1]:
        return True
        
    return False

async def sync_google_sheets_with_db(engine: Engine) -> None:
    print("--- STARTING SYNC ---")
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
                            
                            # 1. BYE LOGIC
                            if p2.lower() == "bye": winner = p1
                            elif p1.lower() == "bye": winner = p2
                            
                            # 2. REGULAR LOGIC
                            elif round_name != "F":
                                curr_r_idx = rounds.index(round_name)
                                if curr_r_idx < len(rounds) - 1:
                                    next_r = rounds[curr_r_idx + 1]
                                    if next_r in cols:
                                        n_idx = cols[next_r]
                                        np1 = r1[n_idx].strip() if n_idx < len(r1) else ""
                                        np2 = r2[n_idx].strip() if n_idx < len(r2) else ""
                                        
                                        if is_same_player(p1, np1) or is_same_player(p1, np2):
                                            winner = p1
                                        elif is_same_player(p2, np1) or is_same_player(p2, np2):
                                            winner = p2
                                        
                                        # LOGGING FOR DEBUG
                                        if not winner:
                                            print(f"⚠️ No winner found for {round_name} #{m_num}: '{p1}' vs '{p2}'. Next round has: '{np1}' / '{np2}'")

                            # 3. FINAL
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

            except Exception as e:
                logger.error(f"Sync error T{tid}: {e}")
                continue
        conn.commit()
        print("--- SYNC FINISHED ---")