from typing import List
from pydantic import BaseModel, Field
from sqlmodel import SQLModel

class SousPotReorderBlock(BaseModel):
    pot_id: str
    sous_pot_ids: list[str]


class SousPotReorderPayload(BaseModel):
    ancien_pot: SousPotReorderBlock
    nouveau_pot: SousPotReorderBlock

class PotReorderPayload(BaseModel):
    compte_id: str
    ordered_ids: List[str]

class ReorderIds(SQLModel):
    ordered_ids: list[str]