# Personal Finance Tracker — Complete Build & Interview Study Guide

**Stack:** React (Vite) · FastAPI (Python) · Supabase Postgres · JWT auth · Recharts
**Cost:** ₱0 — every tool and host in this guide has a permanent free tier.

---

## Part 0 — The Big Picture (memorize this for interviews)

### What you're building
A web app where a user registers, logs in, records expenses/income, and sees their spending broken down by category and over time in charts.

### Architecture

```
┌─────────────┐  HTTPS/JSON   ┌──────────────┐   SQL (asyncpg)  ┌──────────────┐
│  React SPA  │ ────────────► │   FastAPI    │ ───────────────► │  Supabase    │
│  (Vercel)   │ ◄──────────── │   (Render)   │ ◄─────────────── │  Postgres    │
└─────────────┘   JWT in      └──────────────┘                  └──────────────┘
                  Authorization
                  header
```

### The 30-second interview pitch
> "It's a three-tier app. The frontend is a React single-page app that talks to a FastAPI backend over a REST API. Auth is stateless JWT — I implemented access and refresh tokens myself rather than using a library's magic, because I wanted to understand token rotation. Data lives in Postgres hosted on Supabase, but I connect to it as a plain Postgres database through SQLAlchemy, so the app isn't locked into Supabase. Frontend deploys to Vercel, backend to Render, both on free tiers."

### Why each choice (interviewers *will* ask "why X?")

| Choice | Your answer |
|---|---|
| FastAPI over Flask/Django | Async by default, automatic OpenAPI docs at `/docs`, Pydantic validation built in. Django is heavier than needed for a pure JSON API. |
| Self-built JWT over Supabase Auth | "I wanted to demonstrate I understand auth, not just configure it. I know how access/refresh rotation, hashing, and token expiry work because I wrote them." |
| Supabase as plain Postgres | Free managed Postgres with backups. Because I use SQLAlchemy, I could swap to RDS or any Postgres with one env var change — no vendor lock-in. |
| SPA + separate API instead of server-rendered | Clean separation of concerns; the same API could serve a mobile app later. Tradeoff: I had to handle CORS and token storage myself. |
| Recharts | Declarative React charting; composes with component state naturally. |

---

## Part 1 — Setup (Day 1)

### 1.1 Supabase: keep the photoalbum safe

You already have a Supabase project for your photoalbum. **Two clean options:**

- **Option A (recommended): create a second project.** The Supabase free tier allows **2 active projects**, so a dedicated `finance-tracker` project keeps the two apps fully isolated — separate databases, separate credentials, no risk of a migration on one breaking the other.
- **Option B: a separate schema in the existing project.** Run `CREATE SCHEMA finance;` and prefix all tables. Works, but you share connection limits and one project's pause (free projects pause after ~1 week of inactivity) affects both.

Go with Option A unless you're already at 2 projects.

In your new project: **Project Settings → Database → Connection string → URI**. Copy the URI that looks like:

```
postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

Use the **pooler (port 6543, "transaction mode")** string — Render's free tier spins your server up and down, and the pooler handles that gracefully.

### 1.2 Local tools (all free)

```bash
# Check you have these; install if missing
python --version    # 3.11+
node --version      # 18+
git --version
```

### 1.3 Repo structure

One repo, two folders (a "monorepo" — easy to show in interviews):

```
finance-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py          # app entry, CORS, router registration
│   │   ├── database.py      # engine + session
│   │   ├── models.py        # SQLAlchemy tables
│   │   ├── schemas.py       # Pydantic request/response shapes
│   │   ├── security.py      # hashing + JWT creation/verification
│   │   ├── deps.py          # get_db, get_current_user dependencies
│   │   └── routers/
│   │       ├── auth.py      # /auth/register, /login, /refresh
│   │       └── expenses.py  # CRUD + /summary
│   ├── requirements.txt
│   └── .env                 # NEVER commit this
├── frontend/
│   ├── src/
│   │   ├── api.js           # fetch wrapper with auto token refresh
│   │   ├── AuthContext.jsx  # login state for the whole app
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Dashboard.jsx
│   │   └── components/
│   │       ├── ExpenseForm.jsx
│   │       ├── ExpenseList.jsx
│   │       └── SpendingChart.jsx
│   └── ...vite files
└── README.md
```

```bash
mkdir finance-tracker && cd finance-tracker && git init
mkdir -p backend/app/routers frontend
```

---

## Part 2 — Database Schema (Day 1)

Run this in Supabase **SQL Editor**:

```sql
create table users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password_hash text not null,
    created_at timestamptz not null default now()
);

create table expenses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    amount numeric(12,2) not null check (amount > 0),
    category text not null,
    description text,
    kind text not null default 'expense' check (kind in ('expense','income')),
    spent_at date not null default current_date,
    created_at timestamptz not null default now()
);

create index idx_expenses_user_date on expenses (user_id, spent_at desc);
```

**Study notes — every line here is an interview answer:**
- `numeric(12,2)` not `float` → floats lose precision with money (0.1 + 0.2 ≠ 0.3). Classic interview question.
- `on delete cascade` → deleting a user cleans up their data automatically; no orphan rows.
- `check (amount > 0)` → the database is the last line of defense; never trust only frontend validation.
- The **composite index** `(user_id, spent_at desc)` matches the app's hottest query — "this user's expenses, newest first" — so Postgres never scans other users' rows.

---

## Part 3 — Backend (Days 2–5)

### 3.1 Dependencies

`backend/requirements.txt`:
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg[binary]
pydantic[email]
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
python-multipart
```

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

`backend/.env` (and add `.env` to `.gitignore` immediately):
```
DATABASE_URL=postgresql+psycopg://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres
JWT_SECRET=generate_me            # run: python -c "import secrets; print(secrets.token_hex(32))"
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=7
FRONTEND_ORIGIN=http://localhost:5173
```

### 3.2 `app/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 7
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    class Config:
        env_file = ".env"

settings = Settings()

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)

class Base(DeclarativeBase):
    pass
```

**Study note:** `pool_pre_ping=True` tests connections before use — important because Supabase's pooler and Render's sleeping free tier can silently kill idle connections. Knowing this detail signals real deployment experience.

### 3.3 `app/models.py`

```python
import uuid
from datetime import datetime, date
from sqlalchemy import String, Numeric, Date, DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=text("gen_random_uuid()"))
    email: Mapped[str] = mapped_column(String, unique=True)
    password_hash: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                 server_default=text("now()"))

class Expense(Base):
    __tablename__ = "expenses"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    category: Mapped[str]
    description: Mapped[str | None]
    kind: Mapped[str] = mapped_column(String, default="expense")
    spent_at: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                 server_default=text("now()"))
```

### 3.4 `app/schemas.py` — the API's contract

```python
import uuid
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class ExpenseIn(BaseModel):
    amount: Decimal = Field(gt=0)
    category: str = Field(min_length=1, max_length=50)
    description: str | None = None
    kind: str = Field(default="expense", pattern="^(expense|income)$")
    spent_at: date

class ExpenseOut(ExpenseIn):
    id: uuid.UUID
    class Config:
        from_attributes = True

class CategorySummary(BaseModel):
    category: str
    total: Decimal

class MonthSummary(BaseModel):
    month: str
    expenses: Decimal
    income: Decimal
```

**Study note:** Pydantic schemas are why FastAPI is loved — invalid input (negative amount, bad email, wrong `kind`) is rejected with a clear 422 **before your code runs**. Interview line: *"Validation lives at the boundary, so my business logic never sees malformed data."*

### 3.5 `app/security.py` — the heart of your JWT story

```python
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
    """Returns user_id if valid and of the expected type, else None."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGO])
    except JWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload.get("sub")
```

**Study notes — this file is your strongest interview material:**
- **bcrypt, never plain text or MD5/SHA.** bcrypt is deliberately slow and salted, so a leaked database can't be brute-forced cheaply.
- **Why two tokens?** Access token is short-lived (15 min) — if stolen, the damage window is small. Refresh token is long-lived (7 days) and used *only* to mint new access tokens. This is the industry-standard pattern.
- **Why check `type`?** Without it, an attacker could send a refresh token to a normal endpoint and get 7 days of access — defeating the whole design. Small check, big deal; mentioning it shows depth.
- **HS256 vs RS256:** HS256 = one shared secret, fine when one service both signs and verifies. RS256 = public/private keypair, needed when *other* services must verify your tokens. Knowing when you'd switch is a great senior-sounding answer.

### 3.6 `app/deps.py` — dependency injection

```python
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
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user
```

**Study note:** FastAPI's `Depends` = dependency injection. Any route that declares `user: User = Depends(get_current_user)` is automatically protected — auth logic lives in exactly one place. Interview phrase: *"Cross-cutting concerns like auth are injected, not copy-pasted."*

### 3.7 `app/routers/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..deps import get_db
from ..models import User
from ..schemas import RegisterIn, LoginIn, TokenOut
from ..security import (hash_password, verify_password,
                        create_access_token, create_refresh_token, decode_token)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    exists = db.scalar(select(User).where(User.email == body.email))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(str(user.id)),
                    refresh_token=create_refresh_token(str(user.id)))

@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.password_hash):
        # Same error either way — don't reveal which emails exist
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return TokenOut(access_token=create_access_token(str(user.id)),
                    refresh_token=create_refresh_token(str(user.id)))

class RefreshIn(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=TokenOut)
def refresh(body: RefreshIn):
    user_id = decode_token(body.refresh_token, expected_type="refresh")
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    return TokenOut(access_token=create_access_token(user_id),
                    refresh_token=create_refresh_token(user_id))
```

**Study note:** the login route returns the *same* 401 for "no such email" and "wrong password." Different errors would let an attacker enumerate registered emails. This is called preventing **user enumeration** — name it in interviews.

### 3.8 `app/routers/expenses.py`

```python
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session
from ..deps import get_db, get_current_user
from ..models import Expense, User
from ..schemas import ExpenseIn, ExpenseOut, CategorySummary, MonthSummary

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(body: ExpenseIn, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    e = Expense(user_id=user.id, **body.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e

@router.get("", response_model=list[ExpenseOut])
def list_expenses(start: date | None = None, end: date | None = None,
                  category: str | None = None,
                  db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    q = select(Expense).where(Expense.user_id == user.id)
    if start:
        q = q.where(Expense.spent_at >= start)
    if end:
        q = q.where(Expense.spent_at <= end)
    if category:
        q = q.where(Expense.category == category)
    return db.scalars(q.order_by(Expense.spent_at.desc())).all()

@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: uuid.UUID, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    e = db.get(Expense, expense_id)
    if e is None or e.user_id != user.id:
        # 404 either way — don't reveal other users' row IDs exist
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    db.delete(e)
    db.commit()

@router.get("/summary/by-category", response_model=list[CategorySummary])
def by_category(db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    rows = db.execute(
        select(Expense.category, func.sum(Expense.amount).label("total"))
        .where(Expense.user_id == user.id, Expense.kind == "expense")
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
    ).all()
    return [CategorySummary(category=r.category, total=r.total) for r in rows]

@router.get("/summary/by-month", response_model=list[MonthSummary])
def by_month(db: Session = Depends(get_db),
             user: User = Depends(get_current_user)):
    month = func.to_char(Expense.spent_at, "YYYY-MM").label("month")
    rows = db.execute(
        select(
            month,
            func.coalesce(func.sum(case((Expense.kind == "expense", Expense.amount))), 0).label("expenses"),
            func.coalesce(func.sum(case((Expense.kind == "income", Expense.amount))), 0).label("income"),
        )
        .where(Expense.user_id == user.id)
        .group_by(month)
        .order_by(month)
    ).all()
    return [MonthSummary(month=r.month, expenses=r.expenses, income=r.income) for r in rows]
```

**Study notes:**
- Every query filters by `user_id == user.id` taken from the **token**, never from the request body/URL. Skipping this is the classic **IDOR** vulnerability (Insecure Direct Object Reference) — users reading each other's data. Name-drop IDOR in interviews.
- The delete route returns 404 (not 403) for someone else's expense, so attackers can't even confirm an ID exists.
- Aggregation happens **in SQL** (`GROUP BY`), not by pulling all rows into Python. Interview line: *"Push work to the database — it's built for it, and it saves bandwidth and memory."*
- SQLAlchemy parameterizes every value → **SQL injection** is impossible by construction. Another must-mention.

### 3.9 `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import settings, engine, Base
from .routers import auth, expenses

Base.metadata.create_all(bind=engine)  # dev convenience; use Alembic migrations in bigger apps

app = FastAPI(title="Finance Tracker API")

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
```

Also create an empty `backend/app/__init__.py` and `backend/app/routers/__init__.py`.

Run it:
```bash
uvicorn app.main:app --reload
```
Open **http://localhost:8000/docs** — FastAPI auto-generates interactive Swagger docs. **Demo this in interviews**; you can register, log in, click "Authorize", paste the token, and create expenses live without any frontend.

**Study note on CORS:** browsers block JS on `vercel.app` from calling `onrender.com` unless the API explicitly allows that origin. CORS is a *browser* protection, enforced via the `Access-Control-Allow-Origin` response header. "Explain CORS" is a top-5 fullstack interview question — you now have a real story: *"I hit it the first time my deployed frontend called my API, and fixed it by allowlisting my exact frontend origin rather than `*`."*

---

## Part 4 — Frontend (Days 6–10)

### 4.1 Scaffold

```bash
cd frontend
npm create vite@latest . -- --template react
npm install react-router-dom recharts
npm run dev          # http://localhost:5173
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
```

### 4.2 `src/api.js` — fetch wrapper with automatic token refresh

```javascript
const API = import.meta.env.VITE_API_URL;

function getTokens() {
  return {
    access: localStorage.getItem("access_token"),
    refresh: localStorage.getItem("refresh_token"),
  };
}

export function saveTokens({ access_token, refresh_token }) {
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function refreshTokens() {
  const { refresh } = getTokens();
  if (!refresh) return false;
  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return false;
  saveTokens(await res.json());
  return true;
}

// The one function every component uses
export async function apiFetch(path, options = {}, retried = false) {
  const { access } = getTokens();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...options.headers,
    },
  });

  // Access token expired → try one silent refresh, then replay the request
  if (res.status === 401 && !retried) {
    const ok = await refreshTokens();
    if (ok) return apiFetch(path, options, true);
    clearTokens();
    window.location.href = "/login";
    return res;
  }
  return res;
}
```

**Study notes:**
- This wrapper is the frontend half of your JWT story: on a 401 it silently refreshes and **replays the original request once** — the user never notices their 15-minute token expired.
- **localStorage vs httpOnly cookies** (guaranteed interview question): localStorage is simple but readable by JS, so an XSS bug could steal tokens. httpOnly cookies are XSS-proof but need CSRF protection and same-site/cross-site config. Honest answer: *"I used localStorage for simplicity and short-lived access tokens to limit the blast radius; in production I'd consider httpOnly cookies for the refresh token."* Knowing the tradeoff matters more than the choice.

### 4.3 `src/AuthContext.jsx`

```jsx
import { createContext, useContext, useState } from "react";
import { saveTokens, clearTokens } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(
    () => !!localStorage.getItem("access_token")
  );

  const login = (tokens) => { saveTokens(tokens); setLoggedIn(true); };
  const logout = () => { clearTokens(); setLoggedIn(false); };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Study note:** Context avoids "prop drilling" — passing `loggedIn` through every layer. Interview line: *"Global-ish state that many components need (auth) lives in Context; local state (form inputs) stays in the component. I don't reach for Redux until state logic actually gets complex."*

### 4.4 `src/main.jsx` — routing with protected routes

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import "./index.css";

function Protected({ children }) {
  const { loggedIn } = useAuth();
  return loggedIn ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
```

### 4.5 `src/pages/Login.jsx` (Register.jsx is the same shape, hitting `/auth/register`)

```jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      setError("Invalid email or password");
      return;
    }
    login(await res.json());
    nav("/");
  }

  return (
    <div className="auth-card">
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" value={email} placeholder="Email"
               onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" value={password} placeholder="Password"
               onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit">Sign in</button>
      </form>
      <p>No account? <Link to="/register">Create one</Link></p>
    </div>
  );
}
```

### 4.6 `src/pages/Dashboard.jsx`

```jsx
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../AuthContext";
import ExpenseForm from "../components/ExpenseForm";
import ExpenseList from "../components/ExpenseList";
import SpendingChart from "../components/SpendingChart";

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const { logout } = useAuth();

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      apiFetch("/expenses"),
      apiFetch("/expenses/summary/by-category"),
      apiFetch("/expenses/summary/by-month"),
    ]);
    if (a.ok) setExpenses(await a.json());
    if (b.ok) setByCategory(await b.json());
    if (c.ok) setByMonth(await c.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    await apiFetch(`/expenses/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="dashboard">
      <header>
        <h1>Finance Tracker</h1>
        <button onClick={logout}>Log out</button>
      </header>
      <ExpenseForm onAdded={load} />
      <SpendingChart byCategory={byCategory} byMonth={byMonth} />
      <ExpenseList expenses={expenses} onDelete={handleDelete} />
    </main>
  );
}
```

**Study note:** `Promise.all` fires the three requests **in parallel** instead of one-after-another — a small line that's a great performance talking point.

### 4.7 `src/components/ExpenseForm.jsx`

```jsx
import { useState } from "react";
import { apiFetch } from "../api";

const CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Health", "Other"];

export default function ExpenseForm({ onAdded }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    amount: "", category: "Food", description: "",
    kind: "expense", spent_at: today,
  });
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await apiFetch("/expenses", {
      method: "POST",
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    if (!res.ok) { setError("Could not save. Check the amount."); return; }
    setForm({ ...form, amount: "", description: "" });
    onAdded();
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <select value={form.kind} onChange={set("kind")}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input type="number" step="0.01" min="0.01" placeholder="Amount"
             value={form.amount} onChange={set("amount")} required />
      <select value={form.category} onChange={set("category")}>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input placeholder="Description (optional)"
             value={form.description} onChange={set("description")} />
      <input type="date" value={form.spent_at} onChange={set("spent_at")} />
      <button type="submit">Add</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

### 4.8 `src/components/ExpenseList.jsx`

```jsx
export default function ExpenseList({ expenses, onDelete }) {
  if (expenses.length === 0) {
    return <p className="empty">No entries yet — add your first one above.</p>;
  }
  return (
    <table className="expense-table">
      <thead>
        <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th /></tr>
      </thead>
      <tbody>
        {expenses.map((e) => (
          <tr key={e.id} className={e.kind}>
            <td>{e.spent_at}</td>
            <td>{e.category}</td>
            <td>{e.description || "—"}</td>
            <td>{e.kind === "income" ? "+" : "−"}₱{Number(e.amount).toFixed(2)}</td>
            <td><button onClick={() => onDelete(e.id)}>Delete</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 4.9 `src/components/SpendingChart.jsx`

```jsx
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from "recharts";

const COLORS = ["#2f6f4f", "#c05b3c", "#3d5a80", "#b08b2e", "#7d5ba6", "#5c5c5c"];

export default function SpendingChart({ byCategory, byMonth }) {
  const catData = byCategory.map((c) => ({ name: c.category, value: Number(c.total) }));
  const monthData = byMonth.map((m) => ({
    month: m.month, Expenses: Number(m.expenses), Income: Number(m.income),
  }));

  return (
    <section className="charts">
      <div className="chart">
        <h2>Spending by category</h2>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={catData} dataKey="value" nameKey="name" outerRadius={90} label>
              {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chart">
        <h2>Income vs expenses by month</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthData}>
            <XAxis dataKey="month" /><YAxis />
            <Tooltip /><Legend />
            <Bar dataKey="Income" fill="#2f6f4f" />
            <Bar dataKey="Expenses" fill="#c05b3c" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

Add basic styling in `src/index.css` — keep it clean and simple; a tidy, readable UI beats a flashy broken one in a portfolio demo.

---

## Part 5 — Deployment (Days 11–12, all free)

### 5.1 Push to GitHub
```bash
git add . && git commit -m "Finance tracker v1"
# create a PUBLIC repo on github.com (public = recruiters can see it), then:
git remote add origin https://github.com/YOURNAME/finance-tracker.git
git push -u origin main
```
Double-check `.env` is in `.gitignore` **before** pushing. A committed secret must be treated as leaked (rotate it) — even mentioning this habit is a good interview signal.

### 5.2 Backend → Render (free)
1. render.com → New → **Web Service** → connect the repo.
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Environment variables: add `DATABASE_URL`, `JWT_SECRET`, `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`, and `FRONTEND_ORIGIN` (set to your Vercel URL once you have it).
6. Deploy → you get `https://your-api.onrender.com`. Test `https://your-api.onrender.com/health` and `/docs`.

### 5.3 Frontend → Vercel (free)
1. vercel.com → New Project → same repo.
2. Root directory: `frontend` (Vite is auto-detected).
3. Environment variable: `VITE_API_URL=https://your-api.onrender.com`
4. Deploy → `https://finance-tracker-yourname.vercel.app`.
5. Go back to Render and set `FRONTEND_ORIGIN` to that exact Vercel URL (no trailing slash), redeploy.

### 5.4 Known free-tier quirks (turn them into talking points)
- **Render sleeps after ~15 min idle**; first request takes ~30–60s to wake. Say in interviews: *"Cold starts are the tradeoff of the free tier; I mitigated the demo impact by showing a health-check first, and in production I'd use an always-on instance."*
- **Supabase pauses free projects after ~1 week of inactivity** — open the dashboard and restore before any demo/interview.

---

## Part 6 — Interview Study Sheet

### Trace a request end-to-end (rehearse until fluent)
*"User clicks Add: React state holds the form; on submit, my `apiFetch` wrapper attaches the JWT access token in the Authorization header and POSTs JSON to `/expenses`. FastAPI validates the body with Pydantic — a negative amount never reaches my code. The `get_current_user` dependency decodes the token, checks it's an access-type token, and loads the user. The route inserts a row with the user_id taken from the token, not from the client. SQLAlchemy parameterizes the query, so injection isn't possible. The response serializes through a Pydantic schema, the dashboard re-fetches, and the summary endpoints aggregate with SQL GROUP BY so the charts update."*

### Likely questions and your answers

**Q: How does JWT auth work here?**
Login verifies the bcrypt hash and returns two signed tokens. The access token (15 min) authorizes API calls; when it expires, the frontend silently exchanges the refresh token (7 days) for new tokens and replays the failed request. Tokens are signed with HS256 — the server can verify them without a session store, which makes the API **stateless** and horizontally scalable.

**Q: What's the downside of JWT?**
You can't revoke a token before it expires without extra machinery (a denylist or token versioning). That's exactly why my access tokens are short-lived.

**Q: How do you stop users from seeing each other's data?**
Every query filters by the user id decoded from the *token*. Trusting a user id from the URL or body instead is the IDOR vulnerability.

**Q: Why Postgres over MongoDB?**
The data is relational (users → expenses), needs constraints (positive amounts, valid categories), and the core feature is aggregation — `GROUP BY` in SQL is exactly this workload.

**Q: What would you improve with more time?**
Alembic migrations instead of `create_all`; refresh-token rotation with reuse detection; pagination on the expense list; pytest tests for the auth flow; budgets with alerts; httpOnly-cookie refresh tokens; a GitHub Actions pipeline running tests on every push.
(That last one is a great segue — then actually add a simple CI workflow and you can say "…and I did add the CI pipeline.")

**Q: Explain CORS.**
Browsers block cross-origin JS requests unless the server opts in via `Access-Control-Allow-Origin`. My API allowlists exactly my frontend's origin. It protects users from malicious sites calling my API with their cookies/credentials — it is not a server-side access control.

### Glossary you should be able to define cold
REST · JWT (header/payload/signature) · bcrypt/salting · access vs refresh token · CORS · IDOR · SQL injection · parameterized query · dependency injection · ORM · connection pooling · stateless API · SPA · environment variable · CI/CD · idempotency (GET/DELETE vs POST)

---

## Part 7 — Build Schedule

| Days | Goal | Done when |
|---|---|---|
| 1 | Supabase project, schema, repo scaffold | Tables visible in Supabase table editor |
| 2–3 | Auth backend (register/login/refresh) | You can register + log in from `/docs` |
| 4–5 | Expense CRUD + summary endpoints | Full flow works in `/docs` with the Authorize button |
| 6–7 | React auth pages + protected routing | Login redirects to dashboard; refresh persists login |
| 8–9 | Expense form, list, delete | Data round-trips through the real API |
| 10 | Charts | Pie + bar charts render from summary endpoints |
| 11 | Deploy backend (Render) + frontend (Vercel), fix CORS | Live URL works on your phone |
| 12 | README with architecture diagram + screenshots, polish | You'd be happy for a recruiter to open the repo |

**README tip:** the README is the first thing recruiters see. Include: one-paragraph description, live demo link, the architecture diagram from Part 0, a screenshot, tech stack, and a "What I learned" section (the tradeoffs from this guide belong there).

Good luck — and remember the meta-lesson: interviewers care less about *what* you built than about *why* you built it that way. Every "Study note" in this guide is a *why*.
