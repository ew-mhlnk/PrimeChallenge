from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# === ВАЖНО: Добавляем connect_args для поддержки UTF-8 ===
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # client_encoding='utf8' гарантирует, что смайлики не превратятся в ???
    connect_args={'client_encoding': 'utf8'}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    """
    Создаёт все таблицы в базе данных.
    """
    from database import models
    Base.metadata.create_all(bind=engine)

def get_db():
    """
    Предоставляет сессию базы данных.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()