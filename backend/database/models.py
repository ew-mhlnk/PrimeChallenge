from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.schema import UniqueConstraint
from database.db import Base
import enum

# Перечисление статусов турнира
class TournamentStatus(enum.Enum):
    ACTIVE = "ACTIVE"  # Турнир активен, принимаются пики
    CLOSED = "CLOSED"  # Турнир закрыт, пики не принимаются, но турнир еще идет
    COMPLETED = "COMPLETED"  # Турнир завершен, перемещается в архив

# Модель турнира
class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)  # A: ID турнира
    name = Column(String, index=True)  # B: Название турнира
    dates = Column(String)  # C: Даты турнира (например, "25.04.2025 18:00 - 01.05.2025 19:00")
    status = Column(Enum(TournamentStatus), default=TournamentStatus.ACTIVE)  # D: Статус турнира
    sheet_name = Column(String, nullable=True)  # E: Имя листа в Google Sheets (например, "BMW Open")
    starting_round = Column(String)  # F: Начальный раунд (например, "R32")
    type = Column(String)  # G: Тип турнира (например, "ATP 250")
    start = Column(String)  # H: Дата и время начала (например, "25.04.2025 18:00")
    close = Column(String)  # Новое поле: Дата и время закрытия (например, "01.05.2025 19:00")
    tag = Column(String, nullable=True)  # Новое поле: Тег для лидерборда (например, "ATP", "WTA", "ТБШ")

    true_draws = relationship("TrueDraw", back_populates="tournament")  # Связь с реальными результатами
    user_picks = relationship("UserPick", back_populates="tournament")  # Связь с пиками пользователей
    scores = relationship("UserScore", back_populates="tournament")  # Связь с очками пользователей

# Модель реальных результатов матчей
class TrueDraw(Base):
    __tablename__ = "true_draw"

    id = Column(Integer, primary_key=True, index=True)  # Уникальный ID матча
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)  # ID турнира
    round = Column(String)  # Раунд (например, "R32")
    match_number = Column(Integer)  # Номер матча в раунде
    player1 = Column(String)  # Первый игрок
    player2 = Column(String)  # Второй игрок
    set1 = Column(String, nullable=True)  # Результат первого сета
    set2 = Column(String, nullable=True)  # Результат второго сета
    set3 = Column(String, nullable=True)  # Результат третьего сета
    set4 = Column(String, nullable=True)  # Результат четвертого сета
    set5 = Column(String, nullable=True)  # Результат пятого сета
    winner = Column(String, nullable=True)  # Победитель матча

    # Уникальное ограничение на комбинацию (tournament_id, round, match_number)
    __table_args__ = (
        UniqueConstraint('tournament_id', 'round', 'match_number', name='unique_true_draw_tournament_round_match'),
    )

    tournament = relationship("Tournament", back_populates="true_draws")  # Связь с турниром
    user_picks = relationship("UserPick", back_populates="true_draw")  # Связь с пиками пользователей

# Модель пользователя
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)  # Уникальный ID пользователя
    first_name = Column(String)  # Имя пользователя
    last_name = Column(String, nullable=True)  # Фамилия пользователя
    username = Column(String, nullable=True)  # Никнейм пользователя

    user_picks = relationship("UserPick", back_populates="user")  # Связь с пиками пользователя
    scores = relationship("UserScore", back_populates="user")  # Связь с очками пользователя

# Модель пиков пользователя
class UserPick(Base):
    __tablename__ = "user_picks"

    id = Column(Integer, primary_key=True, index=True)  # Уникальный ID пика
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)  # ID пользователя
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)  # ID турнира
    match_id = Column(Integer, ForeignKey("true_draw.id"), index=True)  # ID матча из TrueDraw
    predicted_winner = Column(String, nullable=True)  # Предсказанный победитель (может быть пустым)
    created_at = Column(DateTime, server_default=func.now())  # Дата создания пика
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())  # Дата обновления пика

    # Уникальное ограничение на комбинацию (user_id, tournament_id, match_id)
    __table_args__ = (
        UniqueConstraint('user_id', 'tournament_id', 'match_id', name='unique_user_pick'),
    )

    user = relationship("User", back_populates="user_picks")  # Связь с пользователем
    tournament = relationship("Tournament", back_populates="user_picks")  # Связь с турниром
    true_draw = relationship("TrueDraw", back_populates="user_picks")  # Связь с реальным матчем

# Модель для хранения очков пользователей
class UserScore(Base):
    __tablename__ = "user_scores"

    id = Column(Integer, primary_key=True, index=True)  # Уникальный ID записи
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)  # ID пользователя
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)  # ID турнира
    score = Column(Integer, default=0)  # Количество очков
    correct_picks = Column(Integer, default=0)  # Количество верных пиков
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())  # Дата обновления

    user = relationship("User", back_populates="scores")  # Связь с пользователем
    tournament = relationship("Tournament", back_populates="scores")  # Связь с турниром

# Модель для кэширования лидерборда
class Leaderboard(Base):
    __tablename__ = "leaderboard"

    id = Column(Integer, primary_key=True, index=True)  # Уникальный ID записи
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), index=True)  # ID турнира
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)  # ID пользователя
    rank = Column(Integer)  # Позиция в лидерборде
    score = Column(Integer)  # Количество очков
    correct_picks = Column(Integer)  # Количество верных пиков
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())  # Дата обновления