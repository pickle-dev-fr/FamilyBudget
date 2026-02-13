from sqlmodel import SQLModel
from pydantic import Field


class SousPotCreate(SQLModel):
    name: str
    prevision: float = Field(ge=0)


class SousPotUpdate(SQLModel):
    name: str
    prevision: float = Field(ge=0)

class SousPotReadCreate(SQLModel):
    id: str
    name: str
    prevision: float
    pot_id: str
    position: int

class SousPotRead(SousPotReadCreate):
    current: float