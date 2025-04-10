from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, BigInteger, String
from datetime import datetime
from sqlalchemy import DateTime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    user_id = Column(BigInteger, primary_key=True, index=True)
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_nickname_change = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
