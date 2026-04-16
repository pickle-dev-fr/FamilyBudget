from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from sqlmodel import Session, select
from datetime import date
from app.models import User, Account, AccountType, Pot, Sub_Pot

from app.database import get_session
from app.schemas.transaction_schema import (
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
    TransferCreate
)
from app.security.dependencies import get_current_user
from app.services.transaction_service import TransactionService
from app.i18n.messages import msg

router = APIRouter(prefix="", tags=["Transactions"], dependencies=[Depends(get_current_user)])

def _check_account_owner(session: Session, account_id: str, user: User) -> Account:
    account = session.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("account.not_found"),
        )
    if account.account_type == AccountType.INVESTMENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=msg("account.investment_no_transactions"),
        )
    return account

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

@router.get("/account/{account_id}/transactions", response_model=list[TransactionRead])
def list_by_account_and_period(
    account_id: str,
    date_year: int,
    date_month: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
): 
    _check_account_owner(session, account_id, current_user)
    return TransactionService.list_by_account_and_period(
        session=session,
        date_year=date_year,
        date_month=date_month,
        account_id=account_id,
        )

@router.get("/account/{account_id}/transactions/recurrente", response_model=list[TransactionRead])
def list_recurrentes_by_account(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
): 
    _check_account_owner(session, account_id, current_user)
    return TransactionService.list_recurrentes_by_account(
        session=session,
        account_id=account_id,
        )

@router.post("/transfers", response_model=list[TransactionRead])
def create_transfer(
    payload: TransferCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _check_account_owner(session, payload.account_source_id, current_user)
    _check_account_owner(session, payload.account_destination_id, current_user)        

    return TransactionService.create_transfer(
        session=session,
        payload=payload,
        user=current_user
    )

def __control_droit_suppression(session, id, current_user):
    transaction = TransactionService.list_by_id(session, id)
    if transaction.account_id:
        _check_account_owner(session, transaction.account_id, current_user)
    elif transaction.sub_pot_id:
        stmt = (
            select(Account.id)
            .join(Pot, Pot.account_id == Account.id)
            .join(Sub_Pot, Sub_Pot.pot_id == Pot.id)
            .where(
                Sub_Pot.id == transaction.sub_pot_id,
                Account.user_id == current_user.id,
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
