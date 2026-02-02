from sqlmodel import SQLModel


class PotCreate(SQLModel):
    name: str


class PotUpdate(SQLModel):
    name: str


class PotRead(SQLModel):
    id: str
    name: str
    compte_id: str
