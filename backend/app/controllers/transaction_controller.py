from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from sqlmodel import Session, select
from datetime import date
from app.models import User, Compte, Pot, Sous_Pot

from app.database import get_session
from app.schemas.transaction_schema import (
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
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


@router.put("/transactions/{id}", response_model=TransactionRead)
def update_transaction(
    id: str,
    payload: TransactionUpdate,
    session: Session = Depends(get_session),
):
    try:
        return TransactionService.update(
            session=session,
            transaction_id=id,
            payload=payload,
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

@router.get("/transactions", response_model=list[TransactionRead])
def get_transactions_by(
    date: date | None = Query(default=None),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        return TransactionService.list_by_user_and(
            session,
            user,
            filters={"transaction_date": date},
        )
    except Exception:
        raise HTTPException(status_code=404, detail=msg("transaction.error.not_found"))

@router.get("/compte/{compte_id}/transactions", response_model=list[TransactionRead])
def list_by_compte_and_period(
    compte_id: str,
    date_year: int,
    date_month: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
): 
    _check_compte_owner(session, compte_id, current_user)
    return TransactionService.list_by_compte_and_period(
        session=session,
        date_year=date_year,
        date_month=date_month,
        compte_id=compte_id,
        )

@router.get("/compte/{compte_id}/transactions/recurrente", response_model=list[TransactionRead])
def list_recurrentes_by_compte(
    compte_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
): 
    _check_compte_owner(session, compte_id, current_user)
    return TransactionService.list_recurrentes_by_compte(
        session=session,
        compte_id=compte_id,
        )

def __control_droit_suppression(session, id, current_user):
    transaction = TransactionService.list_by_id(session, id)
    if transaction.compte_id:
        _check_compte_owner(session, transaction.compte_id, current_user)
    elif transaction.sous_pot_id:
        stmt = (
            select(Compte.id)
            .join(Pot, Pot.compte_id == Compte.id)
            .join(Sous_Pot, Sous_Pot.pot_id == Pot.id)
            .where(
                Sous_Pot.id == transaction.sous_pot_id,
                Compte.user_id == current_user.id,
            )
        )
        if not session.exec(stmt).first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg("transaction.error.not_found"),
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("transaction.error.not_found"),
        )
    return transaction
    


@router.delete(
    "/transactions/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete(
    id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    transaction = __control_droit_suppression(session, id, current_user)
    TransactionService.delete(session, transaction)

@router.delete("/transactions/{transaction_id}/recurrence")
def delete_recurrence(
    transaction_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    transaction = __control_droit_suppression(session, transaction_id, current_user)
    TransactionService.delete_recurrence(transaction=transaction, session=session)
