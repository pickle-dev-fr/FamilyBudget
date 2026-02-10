from typing import List
from pydantic import BaseModel, Field
from sqlmodel import SQLModel


class SousPotOrder(BaseModel):
    id: str


class PotOrder(BaseModel):
    id: str
    sous_pots: List[SousPotOrder] = Field(default_factory=list)


class PotReorderPayload(BaseModel):
    pots: List[PotOrder]

class ReorderIds(SQLModel):
    ordered_ids: list[str]