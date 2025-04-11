from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True)  # Telegram ID
    first_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())  # Текущее время