import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.auth_controller import router as auth_controller
from app.controllers.transaction_controller import router as transaction_router
from app.controllers.user_controller import router as user_router
from app.controllers.compte_controller import router as compte_router
from app.controllers.pot_controller import router as pot_router
from app.controllers.sous_pot_controller import router as sous_pot_router
from app.controllers.stats_controller import router as stats_router

from contextlib import asynccontextmanager

from app.core.scheduler import start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("APP START")
    start_scheduler()
    yield
    print("APP STOP")

app = FastAPI(title="FamilyBudget API", lifespan=lifespan)

app.include_router(auth_controller)
app.include_router(transaction_router)
app.include_router(user_router)
app.include_router(compte_router)
app.include_router(pot_router)
app.include_router(sous_pot_router)
app.include_router(stats_router)

origins = os.getenv("CORS_ORIGINS", "")

allow_origins = origins.split(",") if origins else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

