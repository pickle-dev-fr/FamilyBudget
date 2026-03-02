# FamilyBudget

FamilyBudget is a self-hosted, open-source personal budget management application designed for families and individuals who want full control over their financial data.

The project is distributed as Docker images. Installation is currently supported Docker-only.

The project is in Early access. Lots of functionality are missing and/or bugged. The conf file will change in the future and are currently unsure.


---

## Features

- Account management
- Budget pots (envelope-style budgeting)
- Transaction tracking
- JWT authentication
- PostgreSQL persistence
- Production-ready Docker images

---

## Tech Stack

- Backend: Python (FastAPI)
- Frontend: Static build served by Nginx
- Database: PostgreSQL 16
- Containerization: Docker & Docker Compose

---

## Requirements

- Docker
- Docker Compose v2+

---

## Quick Start (Docker Only)

### 1. Create a project directory

    mkdir familybudget
    cd familybudget

### 2. Create docker-compose.yml

    services:
        backend:
            image: lepickledev/familybudget-backend:latest
            env_file:
                - ./.env
            depends_on:
                - db
            restart: unless-stopped

        frontend:
            image: lepickledev/familybudget-frontend:latest
            ports:
                - "8003:80"
            depends_on:
                - backend
            restart: unless-stopped

        db:
            image: postgres:16
            volumes:
                - dbdata:/var/lib/postgresql/data
            environment:
                POSTGRES_USER: ${POSTGRES_USER}
                POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
                POSTGRES_DB: ${POSTGRES_DB}
            restart: unless-stopped

    volumes:
        dbdata:

### 3. Create .env

    # ======================
    # APP
    # ======================
    APP_ENV=production
    APP_HOST=0.0.0.0
    APP_PORT=8000

    # ======================
    # DATABASE
    # ======================
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=postgres
    POSTGRES_DB=budgetdb
    POSTGRES_HOST=db
    POSTGRES_PORT=5432

    DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/budgetdb

    # ======================
    # JWT
    # ======================
    JWT_SECRET_KEY=CHANGE_ME_STRONG_SECRET
    JWT_ALGORITHM=HS256
    JWT_EXPIRE_MINUTES=1440

Important: Change JWT_SECRET_KEY before deploying to production.

### 4. Start the application

    docker compose up -d

---

## Access

Frontend is available at:

    http://localhost:8003

The backend runs internally on port 8000 and is not exposed by default.

---

## Data Persistence

PostgreSQL data is stored in a named Docker volume:

    dbdata

To completely reset the database:

    docker compose down -v

---

## Updating

To pull the latest images:

    docker compose pull
    docker compose up -d

---

## Production Recommendations

- Use a strong JWT_SECRET_KEY
- Restrict CORS_ALLOWED_ORIGINS
- Use a reverse proxy (e.g., Traefik or Nginx)
- Enable HTTPS (e.g., Let's Encrypt)
- Configure automated backups

---

## License

This project is open source. License details will be added soon.
