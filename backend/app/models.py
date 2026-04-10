# app/models.py
from typing import List, Optional
from datetime import date
from enum import Enum
from sqlalchemy import Enum as SAEnum
import ulid
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint


# --- Helpers ---
def generate_ulid() -> str:
    return ulid.new().str

# --- Enums ---
class TypeTransaction(str, Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"

class TypeRecurrence(str, Enum):
    DAY = "DAY"
    WEEK = "WEEK"
    MONTH = "MONTH"

class Currency(str, Enum):
    EUR = "EUR"
    USD = "USD"
    GBP = "GBP"
    CHF = "CHF"
    JPY = "JPY"
    CAD = "CAD"
    AUD = "AUD"

class Language(str, Enum):
    FR = "FR"
    EN = "EN"

# --- Models ---
class User(SQLModel, table=True):
    id: str = Field(default_factory=generate_ulid, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str

    accounts: List["Account"] = Relationship(back_populates="user",
        sa_relationship_kwargs={
            "order_by": lambda: Account.position,
        })
    settings: Optional["UserSettings"] = Relationship(back_populates="user")


class Account(SQLModel, table=True):
    id: str = Field(default_factory=generate_ulid, primary_key=True)
    name: str
    initial_value: float = 0.0
    archived_value: float = 0.0
    start_day: int = 1  # 1 ≤ start_day ≤ 31

    position: int = Field(index=True)

    user_id: str = Field(foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="accounts")

    pots: List["Pot"] = Relationship(
        back_populates="account",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "order_by": lambda: Pot.position,
        })
    transactions: List["Transaction"] = Relationship(
        back_populates="account",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan"
        })


class Pot(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint(
            "account_id",
            "name",
            name="uq_pot_account_name",
        ),
        UniqueConstraint(
            "account_id",
            "position",
            name="uq_pot_account_position",
            deferrable=True,
            initially="DEFERRED",
        ),
    )

    id: str = Field(default_factory=generate_ulid, primary_key=True)
    name: str

    position: int = Field(index=True)

    account_id: str = Field(foreign_key="account.id")
    account: Optional[Account] = Relationship(back_populates="pots")

    sub_pots: List["Sub_Pot"] = Relationship(
        back_populates="pot",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "order_by": lambda: Sub_Pot.position,
        })


class Sub_Pot(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint(
            "pot_id",
            "name",
            name="uq_sub_pot_pot_name",
        ),
        UniqueConstraint(
            "pot_id",
            "position",
            name="uq_sub_pot_pot_position",
            deferrable=True,
            initially="DEFERRED",
        ),
    )

    id: str = Field(default_factory=generate_ulid, primary_key=True)
    name: str
    prevision: float

    position: int = Field(index=True)

    pot_id: str = Field(foreign_key="pot.id")
    pot: Optional[Pot] = Relationship(back_populates="sub_pots")

    transactions: List["Transaction"] = Relationship(back_populates="sub_pot")


class UserSettings(SQLModel, table=True):
    id: str = Field(default_factory=generate_ulid, primary_key=True)
    currency: Currency = Field(default=Currency.EUR, sa_column=Column(SAEnum(Currency, name="currency"), nullable=False, server_default="EUR"))
    language: Language = Field(default=Language.FR, sa_column=Column(SAEnum(Language, name="userlanguage"), nullable=False, server_default="FR"))

    user_id: str = Field(foreign_key="user.id", unique=True)
    user: Optional[User] = Relationship(back_populates="settings")


class Transaction(SQLModel, table=True):
    id: str = Field(default_factory=generate_ulid, primary_key=True)
    amount: float
    transaction_date: date = Field(default_factory=date.today)
    transaction_type: TypeTransaction
    motif: Optional[str] = None

    recurrent: bool = False
    recurrence_type: Optional[TypeRecurrence] = Field(
        sa_column=Column(
            SAEnum(
                TypeRecurrence,
                name="typerecurrence"
            ),
            nullable=True
        )
    )
    recurrence_end_date: Optional[date] = None
    is_processed: bool = Field(default=False, nullable=False)
    recurrence_day: Optional[int] = Field(default=None)

    # Relations
    account_id: Optional[str] = Field(default=None, foreign_key="account.id")
    account: Optional[Account] = Relationship(back_populates="transactions")

    sub_pot_id: Optional[str] = Field(default=None, foreign_key="sub_pot.id")
    sub_pot: Optional[Sub_Pot] = Relationship(back_populates="transactions")
