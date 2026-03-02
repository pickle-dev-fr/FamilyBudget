from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_session
from app.schemas.user_schema import (
    UserCreate,
    UserRead,
    UserLogin,
    TokenRead,
)
from app.services.user_service import UserService
from app.security.dependencies import get_current_user
from app.security.jwt import create_access_token
from app.i18n.messages import msg

router = APIRouter(prefix="/users", tags=["Users"], dependencies=[Depends(get_current_user)],)

#TODO ajouter controle pour admin
@router.get("", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)):
    return UserService.list_all(session)

#TODO recuperer le user_id dans token
@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: str,
    session: Session = Depends(get_session)
):
    user = UserService.get_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail=msg("user.not_found"))
    return user
