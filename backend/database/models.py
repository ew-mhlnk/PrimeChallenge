from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True)
    first_name = Column(String)
    picks = relationship("Pick", back_populates="user")

class Tournament(Base):
    __tablename__ = "tournaments"
    
    id = Column(Integer, primary_key=True)
    name = Column(String)
    dates = Column(String)
    status = Column(String)
    starting_round = Column(String)
    type = Column(String)
    matches = relationship("Match", back_populates="tournament")

class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
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
    tournament = relationship("Tournament", back_populates="matches")
    picks = relationship("Pick", back_populates="match")

class Pick(Base):
    __tablename__ = "picks"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    match_id = Column(Integer, ForeignKey("matches.id"))
    predicted_winner = Column(String)
    points = Column(Integer, default=0)
    user = relationship("User", back_populates="picks")
    match = relationship("Match", back_populates="picks")

class SyncLog(Base):
    __tablename__ = "sync_log"
    
    id = Column(Integer, primary_key=True)
    last_sync = Column(DateTime, default=datetime.utcnow)