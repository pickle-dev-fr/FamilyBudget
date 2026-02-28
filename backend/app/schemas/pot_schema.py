from typing import List, Optional
from sqlmodel import SQLModel
from app.schemas.sub_pot_schema import SousPotRead


class PotCreate(SQLModel):
    name: str


class PotUpdate(SQLModel):
    name: str

class PotRead(SQLModel):
    id: str
    name: str
    account_id: str
    position: int
    sub_pots: Optional[List[SousPotRead]] = None

class ControlPotRead(SQLModel):
    pot_id: str
    sub_pot_id: str
