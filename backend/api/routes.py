from fastapi import APIRouter

router = APIRouter()

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.db import get_db  # путь зависит от структуры, может быть другой
import database.crud as crud     # путь зависит от структуры

@router.post("/users")
def register_user(user: dict, db: Session = Depends(get_db)):
    return crud.create_or_update_user(db, user)
