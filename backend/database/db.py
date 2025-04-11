from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

DATABASE_URL = "postgresql://user:password@localhost:5432/prime_bracket"  # Замени на свой
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Создание таблицы
Base.metadata.drop_all(bind=engine)  # Удаляет старую таблицу (опционально)
Base.metadata.create_all(bind=engine)  # Создаёт новую