"""App entry point: CORS, router registration, health check."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import settings, engine, Base
from .routers import auth, expenses

# Dev convenience: creates tables if missing. In a larger app,
# use Alembic migrations instead.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance Tracker API")

# Browsers block cross-origin JS calls unless the server opts in.
# We allowlist exactly one origin — never "*" in an authed app.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(expenses.router)


@app.get("/health")
def health():
    return {"status": "ok"}
