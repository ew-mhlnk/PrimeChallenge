from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
import logging

Base = declarative_base()
logger = logging.getLogger(__name__)

logger.info("Loading database models")

class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    dates = Column(String)
    status = Column(String)
    starting_round = Column(String)
    type = Column(String)

class Match(Base):
    __tablename__ = "matches"
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

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)  # Используем user_id как первичный ключ
    first_name = Column(String)
    username = Column(String, nullable=True)  # Добавляем username, если нужно

class Pick(Base):
    __tablename__ = "picks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)  # Связь с user_id
    match_id = Column(Integer, ForeignKey("matches.id"), index=True)
    predicted_winner = Column(String)
    points = Column(Integer, default=0)

logger.info("Database models loaded successfully")