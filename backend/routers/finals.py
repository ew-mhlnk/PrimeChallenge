from datetime import datetime, timezone
from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from database.db import get_db
from database import models
from services.finals_service import (
    GROUP_STAGES,
    POINTS,
    calculate_user_score,
    find_player,
    is_finals,
    stage_state,
)
from utils.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class FinalsPicksPayload(BaseModel):
    phase: str
    group_a: Optional[List[str]] = None
    group_b: Optional[List[str]] = None
    finalists: Optional[List[str]] = None
    champion: Optional[str] = None


def _get_tournament(tournament_id: int, db: Session) -> models.Tournament:
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament or not is_finals(tournament):
        raise HTTPException(status_code=404, detail="Турнир не найден")
    return tournament


def _get_draws(tournament_id: int, db: Session) -> dict:
    rows = db.query(models.FinalsDraw).filter_by(tournament_id=tournament_id).all()
    return {row.stage: row for row in rows}


def _iso(value) -> Optional[str]:
    return value.isoformat() if value else None


def _group_state(draws: dict, now: datetime) -> dict:
    a, b = draws.get("GROUP_A"), draws.get("GROUP_B")
    if not a or not b:
        return {"state": "waiting", "opens_at": None, "closes_at": None}
    finished = len(a.winners) == 2 and len(b.winners) == 2
    state = stage_state(a.players + b.players, a.opens_at, a.closes_at, finished, now)
    return {"state": state, "opens_at": _iso(a.opens_at), "closes_at": _iso(a.closes_at)}


def _playoff_state(draws: dict, now: datetime) -> dict:
    sf, final = draws.get("SF"), draws.get("F")
    if not sf or not final:
        return {"state": "waiting", "opens_at": None, "closes_at": None}
    state = stage_state(sf.players, sf.opens_at, sf.closes_at, bool(final.winners), now)
    return {"state": state, "opens_at": _iso(sf.opens_at), "closes_at": _iso(sf.closes_at)}


def _build_response(tournament, draws: dict, user_picks: dict, now: datetime) -> dict:
    totals = calculate_user_score(user_picks, draws)
    groups = []
    for stage in GROUP_STAGES:
        draw = draws.get(stage)
        if not draw:
            continue
        groups.append({
            "stage": stage,
            "title": draw.title,
            "players": draw.players,
            "columns": draw.columns,
            "rows": draw.table_rows,
            "winners": draw.winners,
            "picks": user_picks.get(stage, []),
            "points": totals["stages"][stage]["points"],
        })

    sf, final = draws.get("SF"), draws.get("F")
    players = sf.players if sf else ["", "", "", ""]
    return {
        "id": tournament.id,
        "name": tournament.name,
        "dates": tournament.dates,
        "tag": tournament.tag,
        "image_url": tournament.image_url,
        "server_now": now.isoformat(),
        "score": totals["score"],
        "correct_picks": totals["correct_picks"],
        "scoring": POINTS,
        "group_stage": _group_state(draws, now),
        "playoff_stage": _playoff_state(draws, now),
        "groups": groups,
        "playoff": {
            "pairs": [players[:2], players[2:4]],
            "finalists": sf.winners if sf else [],
            "champion": final.winners[0] if final and final.winners else None,
            "picked_finalists": user_picks.get("SF", []),
            "picked_champion": (user_picks.get("F") or [None])[0],
            "finalist_points": totals["stages"]["SF"]["points"],
            "champion_points": totals["stages"]["F"]["points"],
        },
    }


def _load_user_picks(tournament_id: int, user_id: int, db: Session) -> dict:
    rows = db.query(models.FinalsPick).filter_by(tournament_id=tournament_id, user_id=user_id).all()
    return {row.stage: row.picks for row in rows}


def _ensure_user(user: dict, db: Session) -> None:
    statement = insert(models.User).values(
        user_id=user["id"],
        first_name=user.get("first_name", "Unknown"),
        last_name=user.get("last_name", ""),
        username=user.get("username", ""),
    )
    db.execute(statement.on_conflict_do_nothing(index_elements=["user_id"]))


def _group_picks(values: Optional[List[str]], draw: models.FinalsDraw) -> List[str]:
    picked = [find_player(value, draw.players) for value in (values or [])]
    if len(picked) != 2 or None in picked or picked[0] == picked[1]:
        raise HTTPException(status_code=400, detail=f"{draw.title}: выберите двух разных игроков")
    return picked


def _playoff_picks(payload: FinalsPicksPayload, draw: models.FinalsDraw) -> dict:
    pairs = (draw.players[:2], draw.players[2:4])
    values = payload.finalists or []
    if len(values) != 2:
        raise HTTPException(status_code=400, detail="Выберите победителя в каждом полуфинале")
    finalists = [find_player(values[i], pairs[i]) for i in range(2)]
    if None in finalists:
        raise HTTPException(status_code=400, detail="Выберите победителя в каждом полуфинале")
    champion = find_player(payload.champion or "", finalists)
    if not champion:
        raise HTTPException(status_code=400, detail="Выберите чемпиона из своих финалистов")
    return {"SF": finalists, "F": [champion]}


@router.get("/{tournament_id}")
def get_finals(
    tournament_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    tournament = _get_tournament(tournament_id, db)
    draws = _get_draws(tournament_id, db)
    picks = _load_user_picks(tournament_id, user["id"], db)
    return _build_response(tournament, draws, picks, datetime.now(timezone.utc))


@router.post("/{tournament_id}/picks")
def save_finals_picks(
    tournament_id: int,
    payload: FinalsPicksPayload,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    tournament = _get_tournament(tournament_id, db)
    draws = _get_draws(tournament_id, db)
    now = datetime.now(timezone.utc)

    if payload.phase == "groups":
        stage_info = _group_state(draws, now)
    elif payload.phase == "playoff":
        stage_info = _playoff_state(draws, now)
    else:
        raise HTTPException(status_code=400, detail="Неизвестный этап")

    if stage_info["state"] != "open":
        raise HTTPException(status_code=409, detail="Прием прогнозов на этот этап закрыт")

    if payload.phase == "groups":
        to_save = {
            "GROUP_A": _group_picks(payload.group_a, draws["GROUP_A"]),
            "GROUP_B": _group_picks(payload.group_b, draws["GROUP_B"]),
        }
    else:
        to_save = _playoff_picks(payload, draws["SF"])

    try:
        _ensure_user(user, db)
        for stage, picks in to_save.items():
            statement = insert(models.FinalsPick).values(
                user_id=user["id"], tournament_id=tournament_id, stage=stage, picks=picks
            )
            db.execute(
                statement.on_conflict_do_update(
                    constraint="unique_finals_pick",
                    set_={"picks": picks, "updated_at": now.replace(tzinfo=None)},
                )
            )
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Finals save failed for user {user['id']}: {e}")
        raise HTTPException(status_code=500, detail="Не удалось сохранить")

    saved = _load_user_picks(tournament_id, user["id"], db)
    return _build_response(tournament, draws, saved, now)
