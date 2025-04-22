from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    """
    Создаёт все таблицы в базе данных, определённые в models.py.
    """
    # Импорт моделей здесь, чтобы избежать циклического импорта
    from database import models
    Base.metadata.create_all(bind=engine)

def get_db():
    """
    Предоставляет сессию базы данных для FastAPI зависимостей.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()