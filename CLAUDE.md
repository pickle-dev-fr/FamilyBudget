# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FamilyBudget is a self-hosted personal budget management app for families. It uses a budget envelope/pot system to organize spending.

**Stack:** FastAPI (Python 3.12) + React 19 (TypeScript) + PostgreSQL 16 + Docker

## Development Commands

### Running the full stack (recommended)
```bash
docker compose up
```
- Frontend: http://localhost:5173 (hot reload)
- Backend API + docs: http://localhost:8000/api/docs (hot reload)
- PostgreSQL on port 5432

### Frontend only
```bash
cd frontend
npm install
npm run dev       # dev server on :5173
npm run build     # tsc + vite build
npm run lint      # ESLint
```

### Backend only
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head   # run migrations
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Database migrations
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Architecture

### Backend (`backend/app/`)

Three-layer MVC pattern:

- **`controllers/`** — FastAPI route handlers; thin layer that parses request, calls service, returns response
- **`services/`** — Business logic with static methods; all database access goes here
- **`schemas/`** — Pydantic models for request/response validation; separate from SQLModel models
- **`models.py`** — SQLModel ORM entities (SQLAlchemy + Pydantic hybrid)
- **`security/`** — JWT generation/validation (`jwt.py`), bcrypt hashing (`password.py`), auth dependency injection (`dependencies.py`)
- **`core/scheduler.py`** — APScheduler job that runs daily at 00:05 UTC to process recurring transactions

**Data model hierarchy:**
```
User → Accounts → Pots → SubPots
                       → Transactions (linked to SubPot or directly to Account)
```

Transactions have a `recurrence` field (DAILY/WEEKLY/MONTHLY) and `next_recurrence_date` managed by the scheduler.

### Frontend (`frontend/src/`)

- **`features/`** — Domain-organized pages: `auth/`, `home/`, `accounts/`, `pots/`, `transactions/`, `recurrents/`, `settings/`
- **`api/`** — API client layer; `client.ts` is the base fetch wrapper with automatic JWT injection; one file per domain (e.g. `accounts.api.ts`)
- **`auth/`** — `AuthContext.tsx` holds global auth state; `ProtectedRoute.tsx` guards routes
- **`app/App.tsx`** — React Router setup

The Vite dev server proxies `/api` to `localhost:8000`, so all API calls use relative `/api/...` paths.

### Production Build

The root `Dockerfile` is a multi-stage build: builds the React app, then packages it with the Python backend in a single container running Nginx (port 80) + Gunicorn/Uvicorn (port 8000 internal), managed by Supervisor.

## Environment Variables

Copy `.env.dev` as a starting point. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string |
| `JWT_SECRET_KEY` | Secret for signing JWTs |
| `JWT_ALGORITHM` | Default: `HS256` |
| `JWT_EXPIRE_HOURS` | Token lifetime |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `PASSWORD_PEPPER` | Optional additional password security |
| `APP_ENV` | `development` or `production` |

## IDs

All primary keys use ULID format (not UUID or auto-increment integers).
