from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.db import Base
import enum

class TournamentStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    COMPLETED = "COMPLETED"  # Добавляем статус COMPLETED

class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)  # A: ID
    name = Column(String, index=True)  # B: Name
    dates = Column(String)  # C: Date
    status = Column(Enum(TournamentStatus), default=TournamentStatus.ACTIVE)  # D: Status
    sheet_name = Column(String, nullable=True)  # E: List (имя листа, например, "BMW Open")
    starting_round = Column(String)  # F: Starting Round
    type = Column(String)  # G: Type
    start = Column(String)  # H: Start (дата и время, когда турнир станет CLOSED)

    true_draws = relationship("TrueDraw", back_populates="tournament")
    user_picks = relationship("UserPick", back_populates="tournament")

class TrueDraw(Base):
    __tablename__ = "true_draw"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)
    round = Column(String)
    match_number = Column(Integer)
    player1 = Column(String)
    player2 = Column(String)
    set1 = Column(String, nullable=True)
    set2 = Column(String, nullable=True)
    set3 = Column(String, nullable=True)
    set4 = Column(String, nullable=True)
    set5 = Column(String, nullable=True)
    winner = Column(String, nullable=True)

    tournament = relationship("Tournament", back_populates="true_draws")

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String, nullable=True)
    username = Column(String, nullable=True)

    user_picks = relationship("UserPick", back_populates="user")

class UserPick(Base):
    __tablename__ = "user_picks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)
    round = Column(String)
    match_number = Column(Integer)
    player1 = Column(String)
    player2 = Column(String)
    predicted_winner = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="user_picks")
    tournament = relationship("Tournament", back_populates="user_picks")