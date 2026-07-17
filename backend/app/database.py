"""Database engine, session factory, and app settings.

Settings are loaded from environment variables (or a local .env file)
via pydantic-settings, so secrets never live in code.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 7
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Email (Brevo SMTP free tier). Leave empty in dev:
    # reset links are then printed to the console instead of emailed.
    BREVO_API_KEY: str = ""
    EMAIL_FROM: str = "Finance Tracker <noreply@example.com>"

    class Config:
        env_file = ".env"


settings = Settings()

# pool_pre_ping: test connections before use. Supabase's pooler and Render's
# sleeping free tier can silently drop idle connections; this avoids 500s
# on the first request after a quiet period.
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass
