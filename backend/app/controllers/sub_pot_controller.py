from fastapi import APIRouter, Depends, Security, status, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.security.dependencies import get_current_user
from app.models import User, Account, Pot
from app.services.sub_pot_service import SousPotService
from app.services.account_service import AccountService
from app.schemas.sub_pot_schema import (
    SousPotCreate,
    SousPotRead,
    SousPotUpdate,
    SousPotReadCreate
)
from app.schemas.reorder_schema import SousPotReorderPayload
from app.i18n.messages import msg


router = APIRouter(
    prefix="",
    tags=["Sub-pots"],
)


def _check_pot_owner(session: Session, pot_id: str, user: User) -> Pot:
    pot = session.get(Pot, pot_id)
    if not pot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("pot.not_found"),
        )

    _check_account_owner(session, pot.account_id, user)

    return pot

def _check_account_owner(session: Session, account_id: str, user: User):
    account = session.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("pot.not_found"),
        )

@router.put("/accounts/{account_id}/sub-pots/reorder", status_code=204)
def reorder_sub_pots(
    account_id: str,
    payload: SousPotReorderPayload,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user),
):
    _check_account_owner(session, account_id, current_user)
    SousPotService.reorder(
        account_id=account_id,
        session=session,
        payload=payload,
    )

@router.post(
    "/pots/{pot_id}/sub-pots",
    response_model=SousPotReadCreate,
    status_code=status.HTTP_201_CREATED,
)
def create_sub_pot(
    pot_id: str,
    data: SousPotCreate,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    _check_pot_owner(session, pot_id, current_user)
    return SousPotService.create(
        session,
        pot_id,
        data.name,
        data.prevision,
    )


@router.get(
    "/pots/{pot_id}/sub-pots",
    response_model=list[SousPotRead],
)
def list_sub_pots(
    pot_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    _check_pot_owner(session, pot_id, current_user)
    return SousPotService.list_by_pot(session, pot_id)


@router.get(
    "/sub-pots/{sub_pot_id}",
    response_model=SousPotRead,
)
def get_sub_pot(
    sub_pot_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    sub_pot = SousPotService.get_by_id(session, sub_pot_id)
    _check_pot_owner(session, sub_pot.pot_id, current_user)
    return sub_pot

@router.get(
    "/accounts/{id}/sub-pots/",
    response_model=list[SousPotReadCreate],
)
def get_sub_pots_by_account(
    id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    _check_account_owner(session=session, account_id=id, user=current_user)
    sub_pot = SousPotService.get_by_account(session, id)
    return sub_pot


@router.put(
    "/sub-pots/{sub_pot_id}"
)
def update_sub_pot(
    sub_pot_id: str,
    data: SousPotUpdate,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    sub_pot = SousPotService.get_by_id(session, sub_pot_id)
    _check_pot_owner(session, sub_pot.pot_id, current_user)
    sub_pot = SousPotService.update(
        session,
        sub_pot_id,
        data.name,
        data.prevision,
    )


@router.delete(
    "/sub-pots/{sub_pot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_sub_pot(
    sub_pot_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    sub_pot = SousPotService.get_by_id(session, sub_pot_id)
    _check_pot_owner(session, sub_pot.pot_id, current_user)
    SousPotService.delete(session, sub_pot_id)

