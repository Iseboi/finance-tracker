"""Password hashing and JWT creation/verification.

Two-token design:
- access token  (short-lived, 15 min): sent with every API call
- refresh token (long-lived, 7 days): used ONLY to mint new tokens

The `type` claim is checked on decode so a refresh token can never be
used as an access token (and vice versa).
"""
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext

from .database import settings

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGO = "HS256"


def hash_password(plain: str) -> str:
    return pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd.verify(plain, hashed)


def _make_token(sub: str, token_type: str, lifetime: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": sub, "type": token_type, "iat": now, "exp": now + lifetime}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGO)


def create_access_token(user_id: str) -> str:
    return _make_token(user_id, "access",
                       timedelta(minutes=settings.ACCESS_TOKEN_MINUTES))


def create_refresh_token(user_id: str) -> str:
    return _make_token(user_id, "refresh",
                       timedelta(days=settings.REFRESH_TOKEN_DAYS))


def decode_token(token: str, expected_type: str) -> str | None:
    """Return the user id if the token is valid and of the expected type."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGO])
    except JWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload.get("sub")
