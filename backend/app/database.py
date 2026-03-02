from sqlmodel import Session, create_engine
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@db:5432/budgetdb"
)

engine = create_engine(
    DATABASE_URL,
    echo=False,
)


def get_session():
    with Session(engine) as session:
        yield session
