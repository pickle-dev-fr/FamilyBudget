# app/schemas/transaction_schema.py
from datetime import date
from typing import Optional
from sqlmodel import SQLModel

from app.models import TypeTransaction, TypeRecurrence


class TransactionCreate(SQLModel):
    amount: float
    transaction_type: TypeTransaction
    transaction_date: Optional[date] = None
    motif: Optional[str] = None

    compte_id: Optional[str] = None
    sous_pot_id: Optional[str] = None

    recurrent: bool = False
    recurrence_type: Optional[TypeRecurrence] = None
    recurrence_end_date: Optional[date] = None


class TransactionRead(SQLModel):
    id: str
    amount: float
    transaction_type: TypeTransaction
    transaction_date: date
    motif: Optional[str]

    compte_id: Optional[str]
    sous_pot_id: Optional[str]
