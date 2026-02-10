from sqlmodel import SQLModel


class PotCreate(SQLModel):
    name: str


class PotUpdate(SQLModel):
    name: str


class PotRead(SQLModel):
    id: str
    name: str
    compte_id: str
    position: int


class ControlPotRead(SQLModel):
    pot_id: str
    sous_pot_id: str
