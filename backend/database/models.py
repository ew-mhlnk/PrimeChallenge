from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database.db import Base
import enum

class TournamentStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"

class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    dates = Column(String)
    status = Column(Enum(TournamentStatus), default=TournamentStatus.ACTIVE)
    starting_round = Column(String)
    type = Column(String)
    start = Column(String)
    google_sheet_id = Column(String, nullable=True)

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

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    first_name = Column(String)

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

    user = relationship("User", back_populates="user_picks")
    tournament = relationship("Tournament", back_populates="user_picks")