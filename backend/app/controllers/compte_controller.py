from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.schemas.compte_schema import (
    CompteCreate,
    CompteUpdate,
    CompteRead,
)
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
            name=payload.name,
            initial_value=payload.initial_value,
            start_day=payload.start_day,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[CompteRead])
def list_comptes(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    return CompteService.list_by_user(session, user)


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
