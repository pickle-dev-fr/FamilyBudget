from fastapi import APIRouter, Depends, Security, status
from sqlmodel import Session

from app.database import get_session
from app.security.dependencies import get_current_user
from app.models import User, Compte
from app.services.pot_service import PotService
from app.schemas.pot_schema import PotCreate, PotRead, PotUpdate, ControlPotRead
from app.schemas.reorder_schema import PotReorderPayload
from app.i18n.messages import msg
from fastapi import HTTPException


router = APIRouter(
    prefix="",
    tags=["Pots"],
)


def _check_compte_owner(session: Session, compte_id: str, user: User) -> Compte:
    compte = session.get(Compte, compte_id)
    if not compte or compte.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("compte.not_found"),
        )
    return compte
    
@router.put("/reorder", status_code=204)
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
    "/comptes/{compte_id}/pots",
    response_model=PotRead,
    status_code=status.HTTP_201_CREATED,
)
def create_pot(
    compte_id: str,
    data: PotCreate,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    _check_compte_owner(session, compte_id, current_user)
    return PotService.create(session, compte_id, data.name)


@router.get(
    "/comptes/{compte_id}/pots",
    response_model=list[PotRead],
)
def list_pots(
    compte_id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    _check_compte_owner(session, compte_id, current_user)
    return PotService.list_by_compte(session, compte_id)


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
    _check_compte_owner(session, pot.compte_id, current_user)
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
    _check_compte_owner(session, pot.compte_id, current_user)
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
    _check_compte_owner(session, pot.compte_id, current_user)
    PotService.delete(session, pot_id)

@router.get(
    "/pot/defaut",
    response_model=ControlPotRead,
)
def get_default_pot(
    compte_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    compte = session.get(Compte, compte_id)
    if not compte or compte.user_id != user.id:
        raise HTTPException(status_code=404, detail=msg("compte.not_found"))
    
    return PotService.get_default_for_compte(session, compte_id)
