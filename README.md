# Finance Tracker

A fullstack personal finance tracker. Users register, log in, record expenses
and income, and see spending broken down by category and month in charts.

**Stack:** React (Vite) · FastAPI · Supabase Postgres · self-implemented JWT auth (access + refresh tokens) · Recharts

```
┌─────────────┐  HTTPS/JSON   ┌──────────────┐   SQL (SQLAlchemy) ┌──────────────┐
│  React SPA  │ ────────────► │   FastAPI    │ ─────────────────► │  Supabase    │
│  (Vercel)   │ ◄──────────── │   (Render)   │ ◄───────────────── │  Postgres    │
└─────────────┘  JWT bearer   └──────────────┘                    └──────────────┘
```

## Run it locally

### 0. One-time Supabase setup
1. Create a free project at supabase.com (the free tier allows 2 projects,
   so this can live alongside an existing one).
2. Open the **SQL Editor** and run the contents of `schema.sql`.
3. Go to **Project Settings → Database → Connection string → URI**, choose the
   **pooler** string (port 6543), and copy it.

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env:
#  - DATABASE_URL: paste the pooler URI, changing postgresql:// to postgresql+psycopg://
#  - JWT_SECRET:   python -c "import secrets; print(secrets.token_hex(32))"

uvicorn app.main:app --reload
```
API runs at http://localhost:8000 — interactive docs at **http://localhost:8000/docs**.

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env                # default points at http://localhost:8000
npm run dev
```
App runs at http://localhost:5173.

## Deploy (free tiers)

**Backend → Render:** New Web Service → root dir `backend` →
build `pip install -r requirements.txt` →
start `uvicorn app.main:app --host 0.0.0.0 --port $PORT` →
add all variables from `.env` in the Environment tab.

**Frontend → Vercel:** New Project → root dir `frontend` →
set `VITE_API_URL` to your Render URL.

Then set `FRONTEND_ORIGIN` on Render to your exact Vercel URL (no trailing
slash) and redeploy, or the browser will block requests with a CORS error.

## Security decisions (the short version)

- Passwords stored only as **bcrypt** hashes (slow + salted by design).
- **Two-token JWT**: 15-minute access token for API calls; 7-day refresh token
  used only to mint new tokens. The `type` claim is verified so one can't be
  used as the other. The frontend silently refreshes and replays on 401.
- Every query filters by the user id **decoded from the token**, never from
  the request — prevents IDOR.
- Login returns the same 401 for unknown email and wrong password — prevents
  user enumeration.
- SQLAlchemy parameterizes all values — SQL injection impossible by construction.
- CORS allowlists exactly one origin, never `*`.

## Project layout

```
backend/app/
  main.py        app entry, CORS, routers
  database.py    settings + engine + session
  models.py      SQLAlchemy tables
  schemas.py     Pydantic request/response contracts
  security.py    bcrypt hashing, JWT create/verify
  deps.py        get_db, get_current_user (route protection)
  routers/
    auth.py      /auth/register /login /refresh
    expenses.py  CRUD + /summary/by-category + /summary/by-month
frontend/src/
  api.js         fetch wrapper with silent token refresh
  AuthContext.jsx global login state
  pages/         Login, Register, Dashboard
  components/    ExpenseForm, ExpenseList, SpendingChart
```

See `INTERVIEW_NOTES.md` for the full study guide.
