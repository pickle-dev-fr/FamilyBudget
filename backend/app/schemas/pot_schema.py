from typing import List, Optional
from sqlmodel import SQLModel
from app.schemas.sous_pot_schema import SousPotRead


class PotCreate(SQLModel):
    name: str


class PotUpdate(SQLModel):
    name: str

class PotRead(SQLModel):
    id: str
    name: str
    compte_id: str
    position: int
    sous_pots: Optional[List[SousPotRead]] = None

class ControlPotRead(SQLModel):
    pot_id: str
    sous_pot_id: str
