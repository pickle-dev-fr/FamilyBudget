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

router = APIRouter(prefix="/users", tags=["Users"])

####################################
# PUBLIC

@router.post("", response_model=UserRead, status_code=201)
def create_user(
    payload: UserCreate,
    session: Session = Depends(get_session),
):
    try:
        return UserService.create_user(
            session,
            username=payload.username,
            password=payload.password,
        )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=msg("user.username.exists"),
        )


@router.post("/login", response_model=TokenRead)
def login(
    payload: UserLogin,
    session: Session = Depends(get_session),
):
    user = UserService.authenticate(
        session,
        username=payload.username,
        password=payload.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=msg("user.login.incorrect"),
        )

    token = create_access_token(user.id)
    return TokenRead(access_token=token)

####################################
# PRIVE

@router.get("", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session), current_user=Depends(get_current_user)):
    return UserService.list_all(session)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: str,
    session: Session = Depends(get_session), 
    current_user=Depends(get_current_user)
):
    user = UserService.get_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail=msg("user.not_found"))
    return user
