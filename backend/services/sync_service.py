import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pytz
import re

# Импорты для пересчета очков
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
    try:
        return datetime.strptime(date_str, "%d.%m.%Y %H:%M:%S").replace(tzinfo=pytz.UTC)
    except ValueError:
        try:
            return datetime.strptime(date_str, "%d.%m.%Y %H:%M").replace(tzinfo=pytz.UTC)
        except ValueError:
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

# === ГЕНЕРАТОР КООРДИНАТ ===
def get_match_rows(round_name: str, draw_size: int):
    """
    Возвращает список индексов строк (начиная с 0 для массива данных) для каждого матча в раунде.
    Основано на твоей разметке: шаг 4, шаг 8, шаг 16 и т.д.
    """
    # Порядок раундов от финала к началу для определения "глубины"
    rounds_order = ["F", "SF", "QF", "R16", "R32", "R64", "R128"]
    
    if round_name not in rounds_order: return []
    
    # Определяем "уровень" раунда (0 = Финал, 1 = SF...)
    # Но нам удобнее считать от первого круга.
    
    # Базовые настройки для разных типов сеток
    # Start: Индекс первой строки (Excel Row - 2, т.к. header=0)
    # Step: Шаг между матчами
    
    # R128 (Start 2, Step 4) -> Excel Rows 2, 6, 10... -> Array Indices 1, 5, 9...
    # R64  (Start 4, Step 8)
    # R32  (Start 8, Step 16) ... и т.д. относительно самого первого круга
    
    # Определяем смещение в зависимости от размера сетки
    if draw_size == 128:
        base_map = {"R128": (1, 4), "R64": (3, 8), "R32": (7, 16), "R16": (15, 32), "QF": (31, 64), "SF": (63, 128), "F": (127, 256)}
    elif draw_size == 64:
        base_map = {"R64": (1, 4), "R32": (3, 8), "R16": (7, 16), "QF": (15, 32), "SF": (31, 64), "F": (63, 128)}
    else: # 32 (Default for 250/500)
        # Твоя разметка: R32 starts Excel 2 (Index 1), Step 4.
        # R16 starts Excel 4 (Index 3), Step 8.
        base_map = {"R32": (1, 4), "R16": (3, 8), "QF": (7, 16), "SF": (15, 32), "F": (31, 64)}

    if round_name not in base_map: return []
    
    start_idx, step = base_map[round_name]
    
    # Сколько матчей в этом раунде?
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
    print("--- STARTING SYNC (HARDCODED POSITIONS) ---")
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
                    
                    # Определяем размер сетки по типу турнира
                    draw_size = 32 # Default 250/500
                    t_type_lower = t_type.lower()
                    if "1000" in t_type_lower:
                        draw_size = 64
                    elif "slam" in t_type_lower or "тбш" in tag.lower():
                        draw_size = 128
                    
                    tournaments_to_sync.append((tid, sheet_name, draw_size))
                except Exception as e:
                    logger.error(f"Row error: {e}")
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
                    
                    # Champion logic
                    champion = None
                    if "Champion" in cols and len(data) > 1:
                        # Ищем чемпиона где-то в районе финала
                        # Для надежности проверим несколько строк в колонке Champion
                        champ_col = cols["Champion"]
                        # Обычно чемпион записан в районе строки 32-35 для сетки 32
                        # Просканируем диапазон
                        for r_idx in range(1, len(data)):
                            if champ_col < len(data[r_idx]):
                                val = data[r_idx][champ_col].strip()
                                if val: 
                                    champion = val
                                    break

                    for round_name in rounds_order:
                        if round_name not in cols: continue
                        
                        col_idx = cols[round_name]
                        # Получаем ЖЕСТКИЕ индексы строк для этого раунда
                        row_indices = get_match_rows(round_name, draw_size)
                        
                        for i, r_idx in enumerate(row_indices):
                            match_number = i + 1
                            
                            # Проверка выхода за границы
                            if r_idx + 1 >= len(data): continue
                            
                            # Читаем игроков (Игрок 1 в строке r_idx, Игрок 2 в r_idx+1)
                            row1 = data[r_idx]
                            row2 = data[r_idx+1]
                            
                            p1 = row1[col_idx].strip() if col_idx < len(row1) else ""
                            p2 = row2[col_idx].strip() if col_idx < len(row2) else ""
                            
                            if not p1 and not p2: continue # Пустой матч

                            winner = None
                            
                            # 1. BYE Logic
                            if p2.lower() == "bye": winner = p1
                            elif p1.lower() == "bye": winner = p2
                            
                            # 2. Поиск победителя в СЛЕДУЮЩЕМ раунде
                            elif round_name != "F":
                                curr_r_idx_list = rounds_order.index(round_name)
                                # Ищем следующий раунд в списке заголовков
                                next_round_name = None
                                for k in range(curr_r_idx_list + 1, len(rounds_order)):
                                    if rounds_order[k] in cols:
                                        next_round_name = rounds_order[k]
                                        break
                                
                                if next_round_name:
                                    next_col = cols[next_round_name]
                                    
                                    # Вычисляем, в какой строке должен быть победитель этого матча
                                    # Формула: победитель пары i (0-based) идет в пару floor(i/2)
                                    # Но нам нужна строка.
                                    # Проще: берем индексы следующего раунда
                                    next_round_indices = get_match_rows(next_round_name, draw_size)
                                    target_match_idx = i // 2 # 0,1 -> 0; 2,3 -> 1
                                    
                                    if target_match_idx < len(next_round_indices):
                                        next_r_start = next_round_indices[target_match_idx]
                                        
                                        # Победитель будет либо в next_r_start (если этот матч был P1),
                                        # либо в next_r_start + 1 (если этот матч был P2 следующего).
                                        # Но лучше просто проверить обе строки следующего матча
                                        
                                        candidates = []
                                        if next_r_start < len(data):
                                            candidates.append(data[next_r_start][next_col].strip())
                                        if next_r_start + 1 < len(data):
                                            candidates.append(data[next_r_start+1][next_col].strip())
                                            
                                        for cand in candidates:
                                            if not cand: continue
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

                            # Счета
                            scores = []
                            # Обычно счет справа от имени победителя.
                            # Для простоты берем 5 колонок справа от имени игрока 1
                            for s_off in range(1, 6):
                                sc_idx = col_idx + s_off
                                if sc_idx >= len(row1): 
                                    scores.append(None); continue
                                
                                # Проверка, не уперлись ли в след раунд
                                if sc_idx < len(headers) and headers[sc_idx].strip() in rounds_order:
                                    scores.append(None); continue

                                s1_val = row1[sc_idx].strip()
                                s2_val = row2[sc_idx].strip()
                                
                                if s1_val and s2_val:
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
                                "tid": tid, "rnd": round_name, "mn": match_number, "p1": p1, "p2": p2, "win": winner,
                                "s1": s1, "s2": s2, "s3": s3, "s4": s4, "s5": s5
                            })

                    if champion:
                        conn.execute(text("""
                            INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner)
                            VALUES (:tid, 'Champion', 1, :name, NULL, :name)
                            ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                            SET winner=EXCLUDED.winner, player1=EXCLUDED.player1
                        """), {"tid": tid, "name": champion})
                        
                        conn.execute(text("UPDATE tournaments SET status='COMPLETED' WHERE id=:id"), {"id": tid})

                conn.commit()
                
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
        
        conn.commit()
        print("--- SYNC FINISHED ---")