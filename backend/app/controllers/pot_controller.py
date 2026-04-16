from fastapi import APIRouter, Depends, Security, status, Query
from sqlmodel import Session
from datetime import date
from typing import Optional

from app.database import get_session
from app.security.dependencies import get_current_user
from app.models import User, Account, AccountType
from app.services.pot_service import PotService
from app.schemas.pot_schema import PotCreate, PotRead, PotUpdate, ControlPotRead
from app.schemas.reorder_schema import PotReorderPayload
from app.i18n.messages import msg
from app.utils.budget_cycle import get_budget_cycle_for_month
from fastapi import HTTPException


router = APIRouter(
    prefix="",
    tags=["Pots"],
)


def _check_account_owner(session: Session, account_id: str, user: User) -> Account:
    account = session.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("account.not_found"),
        )
    if account.account_type in (AccountType.INVESTMENT, AccountType.SAVINGS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=msg("account.no_pots"),
        )
    return account

    
@router.put("/pots/reorder", status_code=204)
def reorder_pots(
    payload: PotReorderPayload,
    session: Session = Depends(get_session),
    user = Depends(get_current_user),
):
    PotService.reorder(
        session=session,
        user=user,
        payload=payload,
    )

@router.post(
    "/accounts/{account_id}/pots",
    response_model=PotRead,
    status_code=status.HTTP_201_CREATED,
)
def create_pot(
    account_id: str,
    data: PotCreate,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    _check_account_owner(session, account_id, current_user)
    return PotService.create(session, account_id, data.name)


@router.get(
    "/accounts/{account_id}/pots",
    response_model=list[PotRead],
)
def list_pots(
    account_id: str,
    include: bool = Query(False, description="Inclure les sub-pots"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    account = _check_account_owner(session, account_id, current_user)

    ref_date = None
    if year and month:
        cycle = get_budget_cycle_for_month(year, month, account.start_day)
        ref_date = cycle["start"]

    return PotService.list_by_account(
        session,
        account_id,
        include=include,
        ref_date=ref_date,
    )

@router.get(
    "/pots/{pot_id}",
    response_model=PotRead,
)
def get_pot(
    pot_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    pot = PotService.get_by_id(session, pot_id)
    _check_account_owner(session, pot.account_id, current_user)
    return pot

@router.put(
    "/pots/{pot_id}",
    response_model=PotRead,
)
def update_pot(
    pot_id: str,
    data: PotUpdate,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    pot = PotService.get_by_id(session, pot_id)
    _check_account_owner(session, pot.account_id, current_user)
    return PotService.update(session, pot_id, data.name)


@router.delete(
    "/pots/{pot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_pot(
    pot_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    pot = PotService.get_by_id(session, pot_id)
    _check_account_owner(session, pot.account_id, current_user)
    PotService.delete(session, pot_id)

@router.get(
    "/pot/defaut",
    response_model=ControlPotRead,
)
def get_default_pot(
    account_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    account = session.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(status_code=404, detail=msg("account.not_found"))
    
    return PotService.get_default_for_account(session, account_id)
