from fastapi import APIRouter, Depends, Security, status, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.security.dependencies import get_current_user
from app.models import User, Compte, Pot
from app.services.sous_pot_service import SousPotService
from app.services.compte_service import CompteService
from app.schemas.sous_pot_schema import (
    SousPotCreate,
    SousPotRead,
    SousPotUpdate
)
from app.i18n.messages import msg


router = APIRouter(
    prefix="",
    tags=["Sous-pots"],
)


def _check_pot_owner(session: Session, pot_id: str, user: User) -> Pot:
    pot = session.get(Pot, pot_id)
    if not pot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("pot.not_found"),
        )

    compte = session.get(Compte, pot.compte_id)
    if not compte or compte.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("pot.not_found"),
        )

    return pot

@router.post(
    "/pots/{pot_id}/sous-pots",
    response_model=SousPotRead,
    status_code=status.HTTP_201_CREATED,
)
def create_sous_pot(
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
    "/pots/{pot_id}/sous-pots",
    response_model=list[SousPotRead],
)
def list_sous_pots(
    pot_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    _check_pot_owner(session, pot_id, current_user)
    return SousPotService.list_by_pot(session, pot_id)


@router.get(
    "/sous-pots/{sous_pot_id}",
    response_model=SousPotRead,
)
def get_sous_pot(
    sous_pot_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    sous_pot = SousPotService.get_by_id(session, sous_pot_id)
    _check_pot_owner(session, sous_pot.pot_id, current_user)
    return sous_pot


@router.put(
    "/sous-pots/{sous_pot_id}",
    response_model=SousPotRead,
)
def update_sous_pot(
    sous_pot_id: str,
    data: SousPotUpdate,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    sous_pot = SousPotService.get_by_id(session, sous_pot_id)
    _check_pot_owner(session, sous_pot.pot_id, current_user)
    return SousPotService.update(
        session,
        sous_pot_id,
        data.name,
        data.prevision,
    )


@router.delete(
    "/sous-pots/{sous_pot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_sous_pot(
    sous_pot_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    sous_pot = SousPotService.get_by_id(session, sous_pot_id)
    _check_pot_owner(session, sous_pot.pot_id, current_user)
    SousPotService.delete(session, sous_pot_id)

