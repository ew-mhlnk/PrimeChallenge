"""
Итоговые турниры (WTA/ATP Finals).
Читает отдельный лист, хранит данные в finals_draw и сам считает очки.
Обычные турниры и Daily этот модуль не трогает.
"""
import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from database.db import SessionLocal
from database import models
from services.sync_service import (
    clean_sheet_value,
    get_google_sheets_client,
    normalize_name,
    parse_datetime,
)

logger = logging.getLogger(__name__)

FINALS_TYPE = "FINALS"
GROUP_STAGES = ("GROUP_A", "GROUP_B")
ALL_STAGES = (*GROUP_STAGES, "SF", "F")

# Очки меняются здесь: после деплоя все пересчитается само
POINTS = {"GROUP": 8, "SF": 12, "F": 16}

GROUP_LAYOUT = {
    "GROUP_A": {"top": 1, "winners": ("G3", "G4")},
    "GROUP_B": {"top": 7, "winners": ("G9", "G10")},
}


class FinalsSheetError(Exception):
    """Лист заполнен так, что его нельзя применять к базе."""


def is_finals(tournament) -> bool:
    return (getattr(tournament, "type", None) or "").strip().upper() == FINALS_TYPE


def _cell(rows, address: str) -> str:
    letters = "".join(c for c in address if c.isalpha()).upper()
    row = int("".join(c for c in address if c.isdigit())) - 1
    col = 0
    for letter in letters:
        col = col * 26 + ord(letter) - ord("A") + 1
    col -= 1
    if row >= len(rows) or col >= len(rows[row]):
        return ""
    return clean_sheet_value(rows[row][col]) or ""


def find_player(name: str, players) -> Optional[str]:
    """Возвращает имя из списка участников или None."""
    target = normalize_name(name)
    if not target:
        return None
    return next((p for p in players if normalize_name(p) == target), None)


def _valid_results(values, players, label, warnings):
    result = []
    for value in values:
        if not value:
            continue
        player = find_player(value, players)
        if not player:
            warnings.append(f"{label}: '{value}' нет среди участников")
        elif player not in result:
            result.append(player)
    return result


def parse_finals_sheet(rows) -> dict:
    """Превращает лист в данные этапов. Ошибка листа не должна менять базу."""
    if not rows:
        raise FinalsSheetError("лист пустой")

    warnings = []
    stages = {}

    group_opens = parse_datetime(_cell(rows, "H1"))
    group_closes = parse_datetime(_cell(rows, "I1"))
    for stage, layout in GROUP_LAYOUT.items():
        top = layout["top"]
        players = [_cell(rows, f"A{top + i}") for i in range(1, 5)]
        names = {normalize_name(p) for p in players if p}
        if len(names) != 4:
            raise FinalsSheetError(f"{stage}: нужно 4 разных игрока, найдено {len(names)}")
        stages[stage] = {
            "title": _cell(rows, f"A{top}"),
            "players": players,
            "columns": [_cell(rows, f"{col}{top}") for col in "BCDE"],
            "table_rows": [
                {
                    "cells": [_cell(rows, f"{col}{top + i}") for col in "BCDE"],
                    "wl": _cell(rows, f"F{top + i}"),
                }
                for i in range(1, 5)
            ],
            "winners": _valid_results(
                [_cell(rows, address) for address in layout["winners"]], players, stage, warnings
            ),
            "opens_at": group_opens,
            "closes_at": group_closes,
        }

    playoff_opens = parse_datetime(_cell(rows, "E17"))
    playoff_closes = parse_datetime(_cell(rows, "F17"))
    pair_1 = [_cell(rows, "A15"), _cell(rows, "A16")]
    pair_2 = [_cell(rows, "A19"), _cell(rows, "A20")]
    players = pair_1 + pair_2
    finalists = _valid_results([_cell(rows, "B17")], [p for p in pair_1 if p], "SF-1", warnings)
    finalists += _valid_results([_cell(rows, "B18")], [p for p in pair_2 if p], "SF-2", warnings)
    stages["SF"] = {
        "title": "Полуфинал",
        "players": players,
        "columns": [],
        "table_rows": [],
        "winners": finalists,
        "opens_at": playoff_opens,
        "closes_at": playoff_closes,
    }
    stages["F"] = {
        "title": "Финал",
        "players": [],
        "columns": [],
        "table_rows": [],
        "winners": _valid_results([_cell(rows, "C17")], finalists, "Champion", warnings),
        "opens_at": playoff_opens,
        "closes_at": playoff_closes,
    }
    return {"stages": stages, "warnings": warnings}


def _as_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def stage_state(players, opens_at, closes_at, finished: bool, now: datetime) -> str:
    """waiting, open, closed или finished. Неполные данные никогда не открывают этап."""
    if finished:
        return "finished"
    opens_at, closes_at = _as_utc(opens_at), _as_utc(closes_at)
    if not all(players) or not players or not opens_at or not closes_at:
        return "waiting"
    if now < opens_at:
        return "waiting"
    return "open" if now < closes_at else "closed"


def calculate_user_score(user_picks: dict, draws: dict) -> dict:
    """Сравнивает выбор с результатами. Порядок имен не важен."""
    result = {"score": 0, "correct_picks": 0, "stages": {}}
    for stage in ALL_STAGES:
        draw = draws.get(stage)
        winners = {normalize_name(w) for w in (draw.winners if draw else [])}
        picks = {normalize_name(p) for p in user_picks.get(stage, [])}
        hits = len(winners & picks)
        points = POINTS["GROUP" if stage in GROUP_STAGES else stage]
        result["stages"][stage] = {"hits": hits, "points": hits * points}
        result["score"] += hits * points
        result["correct_picks"] += hits
    return result


def recalculate_finals(tournament: models.Tournament, db: Session) -> None:
    """Полный пересчет. Скрытый тестовый турнир (PLANNED) в рейтинг не попадает."""
    status = getattr(tournament.status, "value", tournament.status)
    if str(status).upper() == "PLANNED":
        return

    draws = {
        d.stage: d
        for d in db.query(models.FinalsDraw).filter_by(tournament_id=tournament.id).all()
    }
    has_results = any(d.winners for d in draws.values())

    picks_by_user = {}
    picks = db.query(models.FinalsPick).filter_by(tournament_id=tournament.id).all()
    for pick in picks:
        picks_by_user.setdefault(pick.user_id, {})[pick.stage] = pick.picks

    entries = []
    if has_results:
        for user_id, user_picks in picks_by_user.items():
            total = calculate_user_score(user_picks, draws)
            entries.append(
                {"user_id": user_id, "score": total["score"], "correct_picks": total["correct_picks"]}
            )
    entries.sort(key=lambda e: (e["score"], e["correct_picks"]), reverse=True)

    now = datetime.now()
    leaderboard_rows, score_rows = [], []
    rank = 0
    previous = None
    for entry in entries:
        current = (entry["score"], entry["correct_picks"])
        if current != previous:
            rank += 1
            previous = current
        common = {**entry, "tournament_id": tournament.id, "updated_at": now}
        leaderboard_rows.append({**common, "rank": rank})
        score_rows.append(common)

    db.query(models.Leaderboard).filter_by(tournament_id=tournament.id).delete()
    db.query(models.UserScore).filter_by(tournament_id=tournament.id).delete()
    if leaderboard_rows:
        db.bulk_insert_mappings(models.Leaderboard, leaderboard_rows)
        db.bulk_insert_mappings(models.UserScore, score_rows)


def apply_finals_sheet(tournament: models.Tournament, rows, db: Session) -> None:
    """Применяет лист и пересчитывает очки одной транзакцией."""
    parsed = parse_finals_sheet(rows)
    for warning in parsed["warnings"]:
        logger.error(f"[Finals T{tournament.id}] {warning}")

    for stage, data in parsed["stages"].items():
        statement = insert(models.FinalsDraw).values(
            tournament_id=tournament.id, stage=stage, **data
        )
        db.execute(
            statement.on_conflict_do_update(
                constraint="unique_finals_stage",
                set_={**data, "updated_at": datetime.now()},
            )
        )
    db.flush()
    recalculate_finals(tournament, db)


def _sync_finals_logic() -> None:
    db = SessionLocal()
    try:
        tournaments = [
            t for t in db.query(models.Tournament).all()
            if is_finals(t)
            and t.sheet_name
            and t.sheet_name.strip()
            and getattr(t.status, "value", t.status) != "COMPLETED"
        ]
        if not tournaments:
            return

        sheet = get_google_sheets_client().open_by_key(os.getenv("GOOGLE_SHEET_ID"))
        for tournament in tournaments:
            try:
                rows = sheet.worksheet(tournament.sheet_name.strip()).get_all_values()
                apply_finals_sheet(tournament, rows, db)
                db.commit()
                logger.info(f"[Finals T{tournament.id}] synced")
            except Exception as e:
                # Последние данные остаются в базе, остальные турниры продолжают работать
                db.rollback()
                logger.error(f"[Finals T{tournament.id}] sync skipped: {e}")
    except Exception as e:
        db.rollback()
        logger.error(f"[Finals] sync failed: {e}")
    finally:
        db.close()


async def sync_finals() -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _sync_finals_logic)
