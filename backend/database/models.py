from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Boolean, BigInteger # <--- Добавили BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.schema import UniqueConstraint
from database.db import Base
import enum

# ... (TournamentStatus и Tournament остаются без изменений) ...
class TournamentStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    COMPLETED = "COMPLETED"

class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    dates = Column(String)
    status = Column(Enum(TournamentStatus), default=TournamentStatus.ACTIVE)
    sheet_name = Column(String, nullable=True)
    starting_round = Column(String)
    type = Column(String)
    start = Column(String)
    close = Column(String)
    tag = Column(String, nullable=True)

    true_draws = relationship("TrueDraw", back_populates="tournament")
    user_picks = relationship("UserPick", back_populates="tournament")
    scores = relationship("UserScore", back_populates="tournament")

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
    __table_args__ = (
        UniqueConstraint('tournament_id', 'round', 'match_number', name='unique_true_draw_tournament_round_match'),
    )
    tournament = relationship("Tournament", back_populates="true_draws")

# === ИЗМЕНЕНИЯ ЗДЕСЬ ===

class User(Base):
    __tablename__ = "users"

    # Меняем Integer на BigInteger
    user_id = Column(BigInteger, primary_key=True, index=True) 
    first_name = Column(String)
    last_name = Column(String, nullable=True)
    username = Column(String, nullable=True)

    user_picks = relationship("UserPick", back_populates="user")
    scores = relationship("UserScore", back_populates="user")

class UserPick(Base):
    __tablename__ = "user_picks"

    id = Column(Integer, primary_key=True, index=True)
    # Меняем Integer на BigInteger в ForeignKey
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
    # Меняем Integer на BigInteger в ForeignKey
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
    # Меняем Integer на BigInteger в ForeignKey
    user_id = Column(BigInteger, ForeignKey("users.user_id"), index=True) 
    rank = Column(Integer)
    score = Column(Integer)
    correct_picks = Column(Integer)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="leaderboard_entries") # Добавил связь для полноты
    tournament = relationship("Tournament")

# Добавьте это в User, чтобы связь работала
User.leaderboard_entries = relationship("Leaderboard", back_populates="user")