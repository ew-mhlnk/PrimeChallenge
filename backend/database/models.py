from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.sql.sqltypes import DateTime
from sqlalchemy.sql import func
from database.db import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    username = Column(String)

class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    dates = Column(String)
    status = Column(String)
    starting_round = Column(String)
    type = Column(String)
    start = Column(String)
    google_sheet_id = Column(String)

class TrueDraw(Base):
    __tablename__ = "true_draw"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    round = Column(String)
    match_number = Column(Integer)
    player1 = Column(String)
    player2 = Column(String)
    winner = Column(String)
    set1 = Column(String)
    set2 = Column(String)
    set3 = Column(String)
    set4 = Column(String)
    set5 = Column(String)

class UserPick(Base):
    __tablename__ = "user_picks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    round = Column(String)
    match_number = Column(Integer)
    player1 = Column(String)
    player2 = Column(String)
    predicted_winner = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())