from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime

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

    matches = relationship("TrueDraw", back_populates="tournament")
    picks = relationship("UserPick", back_populates="tournament")

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

    tournament = relationship("Tournament", back_populates="matches")

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    username = Column(String)

    picks = relationship("UserPick", back_populates="user")

class UserPick(Base):
    __tablename__ = "user_picks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    round = Column(String)
    match_number = Column(Integer)
    player1 = Column(String)
    player2 = Column(String)
    predicted_winner = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="picks")
    tournament = relationship("Tournament", back_populates="picks")