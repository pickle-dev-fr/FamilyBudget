from typing import Optional
from sqlmodel import SQLModel


class AccountCreate(SQLModel):
    name: str
    initial_value: float = 0.0
    start_day: int = 1


class AccountUpdate(SQLModel):
    name: Optional[str] = None
    initial_value: Optional[float] = None
    start_day: Optional[int] = None


class AccountRead(SQLModel):
    id: str
    name: str
    initial_value: float
    start_day: int
