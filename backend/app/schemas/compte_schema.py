from typing import Optional
from sqlmodel import SQLModel


class CompteCreate(SQLModel):
    name: str
    initial_value: float = 0.0
    start_day: int = 1


class CompteUpdate(SQLModel):
    name: Optional[str] = None
    initial_value: Optional[float] = None
    start_day: Optional[int] = None


class CompteRead(SQLModel):
    id: str
    name: str
    initial_value: float
    start_day: int
