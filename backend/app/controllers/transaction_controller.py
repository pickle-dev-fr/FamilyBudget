# app/controllers/transaction_controller.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from datetime import date
from app.models import User, Compte

from app.database import get_session
from app.schemas.transaction_schema import (
    TransactionCreate,
    TransactionRead,
)
from app.security.dependencies import get_current_user
from app.services.transaction_service import TransactionService
from app.i18n.messages import msg

router = APIRouter(prefix="", tags=["Transactions"], dependencies=[Depends(get_current_user)])

def _check_compte_owner(session: Session, compte_id: str, user: User) -> Compte:
    compte = session.get(Compte, compte_id)
    if not compte or compte.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("compte.not_found"),
        )
    return compte

@router.post("/transactions", response_model=TransactionRead)
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


@router.get("/transactions/{id}", response_model=TransactionRead)
def get_transaction_by_id(
    id: str,
    session: Session = Depends(get_session),
):
    try:
        return TransactionService.list_by_id(session, id)
    except Exception:
        raise HTTPException(status_code=404, detail=msg("transaction.error.not_found"))

@router.get("/compte/{compte_id}/transactions", response_model=list[TransactionRead])
def list_by_compte_and_date(
    compte_id: str,
    date: date = Query(date, description="Filtre par date YYYY-MM-DD"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
): 
    _check_compte_owner(session, compte_id, current_user)
    return TransactionService.list_by_compte_and_date(
        session=session,
        date=date,
        compte_id=compte_id,
        )

