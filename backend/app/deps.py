"""FastAPI dependencies: DB session and current-user resolution.

Any route that declares `user: User = Depends(get_current_user)` is
automatically protected — auth logic lives in exactly one place.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import SessionLocal
from .security import decode_token
from .models import User

bearer = HTTPBearer()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_token(creds.credentials, expected_type="access")
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            "Invalid or expired token")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user
