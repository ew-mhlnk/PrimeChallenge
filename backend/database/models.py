from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base

class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dates = Column(String, nullable=False)
    status = Column(String, nullable=False)  # 'ACTIVE' или 'CLOSED'
    starting_round = Column(String, nullable=False)

    true_draws = relationship("TrueDraw", back_populates="tournament")
    user_picks = relationship("UserPick", back_populates="tournament")

class TrueDraw(Base):
    __tablename__ = "true_draw"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    round = Column(String, nullable=False)
    match_number = Column(Integer, nullable=False)
    player1 = Column(String, nullable=True)
    player2 = Column(String, nullable=True)
    winner = Column(String, nullable=True)
    set1 = Column(String, nullable=True)  # Новый столбец для первого сета
    set2 = Column(String, nullable=True)  # Новый столбец для второго сета
    set3 = Column(String, nullable=True)  # Новый столбец для третьего сета
    set4 = Column(String, nullable=True)  # Новый столбец для четвёртого сета
    set5 = Column(String, nullable=True)  # Новый столбец для пятого сета

    tournament = relationship("Tournament", back_populates="true_draws")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    username = Column(String, nullable=True)

    user_picks = relationship("UserPick", back_populates="user")

class UserPick(Base):
    __tablename__ = "user_picks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    round = Column(String, nullable=False)
    match_number = Column(Integer, nullable=False)
    player1 = Column(String, nullable=True)
    player2 = Column(String, nullable=True)
    predicted_winner = Column(String, nullable=True)

    user = relationship("User", back_populates="user_picks")
    tournament = relationship("Tournament", back_populates="user_picks")