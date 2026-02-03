# app/controllers/transaction_controller.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from datetime import date
from app.models import User

from app.database import get_session
from app.schemas.transaction_schema import (
    TransactionCreate,
    TransactionRead,
)
from app.security.dependencies import get_current_user
from app.services.transaction_service import TransactionService
from app.i18n.messages import msg

router = APIRouter(prefix="/transactions", tags=["Transactions"], dependencies=[Depends(get_current_user)])

@router.post("", response_model=TransactionRead)
def create_transaction(
    payload: TransactionCreate,
    session: Session = Depends(get_session),
):
    try:
        return TransactionService.create_transaction(
            session=session,
            **payload.dict()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{id}", response_model=TransactionRead)
def get_transaction_by_id(
    id: str,
    session: Session = Depends(get_session),
):
    try:
        return TransactionService.list_by_id(session, id)
    except Exception:
        raise HTTPException(status_code=404, detail=msg("transaction.error.not_found"))

@router.get("", response_model=list[TransactionRead])
def list_transactions(
    date: date | None = Query(None, description="Filtre par date YYYY-MM-DD"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
): 
    return TransactionService.list_all_by_user_and(
        session=session,
        user_id=current_user.id,
        date_filter=date
        )

