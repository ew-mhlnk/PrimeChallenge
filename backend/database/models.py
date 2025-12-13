from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Boolean, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.schema import UniqueConstraint
from database.db import Base
import enum

class TournamentStatus(enum.Enum):
    PLANNED = "PLANNED"  # <--- Новый статус
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    COMPLETED = "COMPLETED"

class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    dates = Column(String) 
    status = Column(Enum(TournamentStatus), default=TournamentStatus.PLANNED)
    sheet_name = Column(String, nullable=True)
    starting_round = Column(String)
    type = Column(String)
    
    # ВРЕМЕННЫЕ МЕТКИ
    start = Column(String) # Дата ОТКРЫТИЯ прогнозов
    close = Column(String) # Дата ЗАКРЫТИЯ прогнозов (начало матчей)
    
    tag = Column(String, nullable=True)
    
    # --- НОВЫЕ ПОЛЯ ---
    surface = Column(String, nullable=True)           # Hard, Clay...
    defending_champion = Column(String, nullable=True)
    description = Column(String, nullable=True)       # Info
    matches_count = Column(String, nullable=True)
    month = Column(String, nullable=True)             # 01.2025
    # ------------------

    true_draws = relationship("TrueDraw", back_populates="tournament")
    user_picks = relationship("UserPick", back_populates="tournament")
    scores = relationship("UserScore", back_populates="tournament")
    leaderboard_entries = relationship("Leaderboard", back_populates="tournament")

class TrueDraw(Base):
    __tablename__ = "true_draw"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)
    round = Column(String)
    match_number = Column(Integer)
    player1 = Column(String)
    player2 = Column(String)
    winner = Column(String, nullable=True)
    
    set1 = Column(String, nullable=True)
    set2 = Column(String, nullable=True)
    set3 = Column(String, nullable=True)
    set4 = Column(String, nullable=True)
    set5 = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint('tournament_id', 'round', 'match_number', name='unique_match'),
    )
    tournament = relationship("Tournament", back_populates="true_draws")

class User(Base):
    __tablename__ = "users"
    user_id = Column(BigInteger, primary_key=True, index=True) 
    first_name = Column(String)
    last_name = Column(String, nullable=True)
    username = Column(String, nullable=True)

    user_picks = relationship("UserPick", back_populates="user")
    scores = relationship("UserScore", back_populates="user")
    leaderboard_entries = relationship("Leaderboard", back_populates="user")

class UserPick(Base):
    __tablename__ = "user_picks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), index=True) 
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)
    round = Column(String)
    match_number = Column(Integer)
    player1 = Column(String)
    player2 = Column(String)
    predicted_winner = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="user_picks")
    tournament = relationship("Tournament", back_populates="user_picks")

class UserScore(Base):
    __tablename__ = "user_scores"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), index=True) 
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)
    score = Column(Integer, default=0)
    correct_picks = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="scores")
    tournament = relationship("Tournament", back_populates="scores")

class Leaderboard(Base):
    __tablename__ = "leaderboard"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), index=True) 
    rank = Column(Integer)
    score = Column(Integer)
    correct_picks = Column(Integer)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="leaderboard_entries")
    tournament = relationship("Tournament", back_populates="leaderboard_entries")