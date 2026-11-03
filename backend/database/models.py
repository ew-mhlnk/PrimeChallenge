from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Boolean, BigInteger, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.schema import UniqueConstraint
from database.db import Base
import enum

class TournamentStatus(enum.Enum):
    PLANNED = "PLANNED"
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
    start = Column(String)
    close = Column(String)
    tag = Column(String, nullable=True)
    surface = Column(String, nullable=True)
    defending_champion = Column(String, nullable=True)
    description = Column(String, nullable=True)
    matches_count = Column(String, nullable=True)
    month = Column(String, nullable=True)
    image_url = Column(String, nullable=True)

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

    __table_args__ = (UniqueConstraint('tournament_id', 'round', 'match_number', name='unique_match'),)
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
    # УБРАЛИ total_picks ЧТОБЫ НЕ ПАДАЛО
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="leaderboard_entries")
    tournament = relationship("Tournament", back_populates="leaderboard_entries")

class DailyMatch(Base):
    __tablename__ = "daily_matches"
    id = Column(String, primary_key=True, index=True)
    tournament = Column(String)
    status = Column(String, default="PLANNED")
    round = Column(String, nullable=True)
    start_time = Column(DateTime)
    player1 = Column(String)
    player2 = Column(String)
    score = Column(String, nullable=True)
    winner = Column(Integer, nullable=True)
    picks = relationship("DailyPick", back_populates="match", cascade="all, delete-orphan")

class DailyPick(Base):
    __tablename__ = "daily_picks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), index=True)
    match_id = Column(String, ForeignKey("daily_matches.id"), index=True)
    predicted_winner = Column(Integer)
    is_correct = Column(Boolean, nullable=True)
    points = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User")
    match = relationship("DailyMatch", back_populates="picks")

class DailyLeaderboard(Base):
    __tablename__ = "daily_leaderboard"
    user_id = Column(BigInteger, ForeignKey("users.user_id"), primary_key=True)
    total_points = Column(Integer, default=0)
    correct_picks = Column(Integer, default=0)
    total_picks = Column(Integer, default=0)
    user = relationship("User")

# === ИТОГОВЫЕ ТУРНИРЫ (WTA/ATP FINALS) ===
class FinalsDraw(Base):
    """Этап итогового турнира: GROUP_A, GROUP_B, SF или F."""
    __tablename__ = "finals_draw"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True, nullable=False)
    stage = Column(String, nullable=False)
    title = Column(String, nullable=True)
    players = Column(JSON, nullable=False, default=list)
    columns = Column(JSON, nullable=False, default=list)
    table_rows = Column(JSON, nullable=False, default=list)
    winners = Column(JSON, nullable=False, default=list)
    opens_at = Column(DateTime(timezone=True), nullable=True)
    closes_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint('tournament_id', 'stage', name='unique_finals_stage'),)

class FinalsPick(Base):
    """Выбор пользователя на этап. В picks лежит список имен."""
    __tablename__ = "finals_picks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), index=True, nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True, nullable=False)
    stage = Column(String, nullable=False)
    picks = Column(JSON, nullable=False, default=list)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint('user_id', 'tournament_id', 'stage', name='unique_finals_pick'),)
