from fastapi import APIRouter, Depends, HTTPException
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

router = APIRouter(
    prefix="/comptes",
    tags=["Comptes"],
    dependencies=[Depends(get_current_user)],
)


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

