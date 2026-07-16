"""Auth routes: register, login, refresh.

Security notes:
- Login returns the SAME 401 for unknown email and wrong password,
  preventing user enumeration.
- Passwords are stored only as bcrypt hashes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import User
from ..schemas import RegisterIn, LoginIn, RefreshIn, TokenOut
from ..security import (hash_password, verify_password,
                        create_access_token, create_refresh_token,
                        decode_token)

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens_for(user_id: str) -> TokenOut:
    return TokenOut(access_token=create_access_token(user_id),
                    refresh_token=create_refresh_token(user_id))


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    exists = db.scalar(select(User).where(User.email == body.email))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "Email already registered")
    user = User(email=body.email,
                password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return _tokens_for(str(user.id))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            "Invalid credentials")
    return _tokens_for(str(user.id))


@router.post("/refresh", response_model=TokenOut)
def refresh(body: RefreshIn):
    user_id = decode_token(body.refresh_token, expected_type="refresh")
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            "Invalid refresh token")
    return _tokens_for(user_id)
