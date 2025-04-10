from sqlalchemy.orm import Session
from database.models import User  # путь уточни, если у тебя другая структура

def create_or_update_user(db: Session, user_data: dict):
    user = db.query(User).filter(User.user_id == user_data['user_id']).first()
    if user:
        user.first_name = user_data.get('first_name')
        user.username = user_data.get('username')
    else:
        user = User(**user_data)
        db.add(user)
    db.commit()
    db.refresh(user)
    return user
