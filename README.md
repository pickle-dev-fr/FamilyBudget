# FamilyBudget

FamilyBudget is a self-hosted, open-source personal budget management application designed for families and individuals who want full control over their financial data.

The project is distributed as Docker images. Installation is currently supported **Docker-only**.

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

```bash
mkdir familybudget
cd familybudget
