from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class Status(enum.Enum):
    ACTIVE = "Активен"
    CLOSED = "Закрыт"
    COMPLETED = "Завершён"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    first_name = Column(String)
    picks = relationship("Pick", back_populates="user")

class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    dates = Column(String)
    status = Column(Enum(Status), default=Status.ACTIVE)
    starting_round = Column(String)
    type = Column(String)
    matches = relationship("Match", back_populates="tournament")

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    round = Column(String)
    match_number = Column(Integer)
    player1 = Column(String)
    player2 = Column(String)
    set1 = Column(String, nullable=True)  # Новое поле: счёт первого сета (например, "6:4")
    set2 = Column(String, nullable=True)  # Новое поле: счёт второго сета
    set3 = Column(String, nullable=True)  # Новое поле: счёт третьего сета
    set4 = Column(String, nullable=True)  # Новое поле: счёт четвёртого сета
    set5 = Column(String, nullable=True)  # Новое поле: счёт пятого сета
    winner = Column(String, nullable=True)
    tournament = relationship("Tournament", back_populates="matches")
    picks = relationship("Pick", back_populates="match")

class Pick(Base):
    __tablename__ = "picks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    match_id = Column(Integer, ForeignKey("matches.id"))
    predicted_winner = Column(String)
    points = Column(Integer, default=0)
    user = relationship("User", back_populates="picks")
    match = relationship("Match", back_populates="picks")

class SyncLog(Base):
    __tablename__ = "sync_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String)  # "success" или "error"
    message = Column(String, nullable=True)  # Сообщение об ошибке, если есть