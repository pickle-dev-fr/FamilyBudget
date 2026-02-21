from fastapi import APIRouter, Depends, HTTPException, Security, status
from sqlmodel import Session

from app.database import get_session
from app.schemas.compte_schema import (
    CompteCreate,
    CompteUpdate,
    CompteRead,
)
from app.schemas.reorder_schema import ReorderIds
from app.security.dependencies import get_current_user
from app.services.compte_service import CompteService
from app.i18n.messages import msg
from app.models import User, Compte

router = APIRouter(
    prefix="/comptes",
    tags=["Comptes"],
    dependencies=[Depends(get_current_user)],
)

def _check_compte_owner(session: Session, compte_id: str, user: User) -> Compte:
    compte = session.get(Compte, compte_id)
    if not compte or compte.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=msg("compte.not_found"),
        )
    return compte

@router.post("", response_model=CompteRead, status_code=201)
def create_compte(
    payload: CompteCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    try:
        return CompteService.create(
            session=session,
            user=user,
            data=payload
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[CompteRead])
def list_comptes(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    return CompteService.list_by_user(session, user)

# Avant get_compte
@router.put("/reorder", status_code=204)
def reorder_comptes(
    payload: ReorderIds,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    CompteService.reorder(
        session=session,
        user=user,
        ordered_ids=payload.ordered_ids,
    )

@router.get("/{compte_id}", response_model=CompteRead)
def get_compte(
    compte_id: str,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    try:
        return CompteService.get_by_id(
            session=session,
            user=user,
            compte_id=compte_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{compte_id}", response_model=CompteRead)
def update_compte(
    compte_id: str,
    payload: CompteUpdate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    try:
        return CompteService.update(
            session=session,
            user=user,
            compte_id=compte_id,
            data=payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{compte_id}/solde", response_model=float)
def get_solde_by_compte(
    compte_id: str,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user),
):
    compte = CompteService.get_by_id(
        session=session,
        compte_id=compte_id,
        user=current_user,
    )

    return CompteService.calculer_solde_compte(
        session=session,
        compte=compte,
    )

@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete(
    id: str,
    session: Session = Depends(get_session),
    current_user: User = Security(get_current_user),
):
    compte = CompteService.get_by_id(session, id)
    _check_compte_owner(session, compte.id, current_user)
    CompteService.delete(session, id)

