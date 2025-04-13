# Forced update to fix Render deploy issue (2025-04-14 v2)

from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database.db import Base
import enum

class Status(enum.Enum):
    ACTIVE = "Активен"
    CLOSED = "Закрыт"
    COMPLETED = "Завершён"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    first_name = Column(String)

class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    dates = Column(String)
    status = Column(Enum(Status), default=Status.ACTIVE)
    matches = relationship("Match", back_populates="tournament")

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    round = Column(String)  # R64, R32, ...
    match_number = Column(Integer)
    player1 = Column(String)
    player2 = Column(String)
    score = Column(String, nullable=True)  # Например, "6-1 6-1"
    winner = Column(String, nullable=True)
    tournament = relationship("Tournament", back_populates="matches")
    picks = relationship("Pick", back_populates="match")

class Pick(Base):
    __tablename__ = "picks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    match_id = Column(Integer, ForeignKey("matches.id"))
    predicted_winner = Column(String)
    match = relationship("Match", back_populates="picks")
