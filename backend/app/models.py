# app/models.py
from typing import List, Optional
from datetime import date
from enum import Enum
import ulid
from sqlmodel import SQLModel, Field, Relationship

# --- Helpers ---
def generate_ulid() -> str:
    return ulid.new().str

# --- Enums ---
class TypeTransaction(str, Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"

class TypeRecurrence(str, Enum):
    jours = "jours"
    semaines = "semaines"
    mois = "mois"

# --- Models ---
class User(SQLModel, table=True):
    id: str = Field(default_factory=generate_ulid, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str

    comptes: List["Compte"] = Relationship(back_populates="user")


class Compte(SQLModel, table=True):
    id: str = Field(default_factory=generate_ulid, primary_key=True)
    name: str
    initial_value: float = 0.0
    archived_value: float = 0.0
    start_day: int = 1  # 1 ≤ start_day ≤ 31

    user_id: str = Field(foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="comptes")

    pots: List["Pot"] = Relationship(back_populates="compte")
    transactions: List["Transaction"] = Relationship(back_populates="compte")


class Pot(SQLModel, table=True):
    id: str = Field(default_factory=generate_ulid, primary_key=True)
    name: str

    compte_id: str = Field(foreign_key="compte.id")
    compte: Optional[Compte] = Relationship(back_populates="pots")

    sous_pots: List["Sous_Pot"] = Relationship(back_populates="pot")


class Sous_Pot(SQLModel, table=True):
    id: str = Field(default_factory=generate_ulid, primary_key=True)
    name: str
    prevision: float

    pot_id: str = Field(foreign_key="pot.id")
    pot: Optional[Pot] = Relationship(back_populates="sous_pots")

    transactions: List["Transaction"] = Relationship(back_populates="sous_pot")


class Transaction(SQLModel, table=True):
    id: str = Field(default_factory=generate_ulid, primary_key=True)
    amount: float
    transaction_date: date = Field(default_factory=date.today)
    transaction_type: TypeTransaction
    motif: Optional[str] = None

    recurrent: bool = False
    recurrence_type: Optional[TypeRecurrence] = None
    recurrence_end_date: Optional[date] = None

    # Relations
    compte_id: Optional[str] = Field(default=None, foreign_key="compte.id")
    compte: Optional[Compte] = Relationship(back_populates="transactions")

    sous_pot_id: Optional[str] = Field(default=None, foreign_key="sous_pot.id")
    sous_pot: Optional[Sous_Pot] = Relationship(back_populates="transactions")
