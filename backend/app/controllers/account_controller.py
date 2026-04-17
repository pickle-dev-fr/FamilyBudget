from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Security, status
from sqlmodel import Session

from app.database import get_session, engine
from app.schemas.account_schema import (
    AccountCreate,
    AccountUpdate,
    AccountRead,
)
from app.schemas.reorder_schema import ReorderIds
from app.security.dependencies import get_current_user
from app.services.account_service import AccountService
from app.services.price_update_service import update_investment_prices
from app.i18n.messages import msg
from app.models import User, Account, AccountType

_PRICE_STALENESS = timedelta(minutes=15)


def _update_prices_bg(account_id: str) -> None:
    with Session(engine) as session:
        update_investment_prices(session, account_id=account_id)

router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"],
    dependencies=[Depends(get_current_user)],
)

def _check_account_owner(session: Session, account_id: str, user: User) -> Account:
    account = session.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("account.not_found"),
        )
    return account

@router.post("", response_model=AccountRead, status_code=201)
def create_account(
    payload: AccountCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    try:
        return AccountService.create(
            session=session,
            user=user,
            data=payload
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[AccountRead])
def list_accounts(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    return AccountService.list_by_user(session, user)

# Before get_acocunt
@router.put("/reorder", status_code=204)
def reorder_accounts(
    payload: ReorderIds,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    AccountService.reorder(
        session=session,
        user=user,
        ordered_ids=payload.ordered_ids,
    )

@router.get("/{account_id}", response_model=AccountRead)
def get_account(
    account_id: str,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    try:
        _check_account_owner(session=session, account_id=account_id, user=user)
        return AccountService.get_by_id(
            session=session,
            account_id=account_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{account_id}", response_model=AccountRead)
def update_account(
    account_id: str,
    payload: AccountUpdate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    try:
        _check_account_owner(session=session, account_id=account_id, user=user)
        return AccountService.update(
            session=session,
            user=user,
            account_id=account_id,
            data=payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{account_id}/balance", response_model=float)
def get_balance_by_account(
    account_id: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user),
):
    _check_account_owner(session=session, account_id=account_id, user=current_user)
    account = AccountService.get_by_id(session=session, account_id=account_id)

    if account.account_type == AccountType.INVESTMENT:
        now = datetime.now(timezone.utc)
        stale = not account.assets or any(
            a.last_price_update is None
            or (now - a.last_price_update.replace(tzinfo=timezone.utc)) > _PRICE_STALENESS
            for a in account.assets
        )
        if stale:
            background_tasks.add_task(_update_prices_bg, account_id)

    return AccountService.calculer_balance_account(session=session, account=account)

@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete(
    id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    account = AccountService.get_by_id(session, id)
    _check_account_owner(session, account.id, current_user)
    AccountService.delete(session, id)

