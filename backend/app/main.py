import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.auth_controller import router as auth_controller
from app.controllers.transaction_controller import router as transaction_router
from app.controllers.user_controller import router as user_router
from app.controllers.account_controller import router as account_router
from app.controllers.pot_controller import router as pot_router
from app.controllers.sub_pot_controller import router as sub_pot_router
from app.controllers.stats_controller import router as stats_router
from app.controllers.utils_controller import router as utils_router

from contextlib import asynccontextmanager

from app.core.scheduler import start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("APP START")
    start_scheduler()
    yield
    print("APP STOP")


if os.getenv("APP_ENV") == "production":
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, root_path="/api")
else:
    app = FastAPI(root_path="/api")

app.include_router(auth_controller)
app.include_router(user_router)
app.include_router(account_router)
app.include_router(pot_router)
app.include_router(sub_pot_router)
app.include_router(transaction_router)
app.include_router(stats_router)
app.include_router(utils_router)

origins = os.getenv("CORS_ALLOWED_ORIGINS", "")

allow_origins = origins.split(",") if origins else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

