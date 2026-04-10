from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.schemas.user_schema import (
    UserCreate,
    UserRead,
    UserLogin,
    TokenRead,
    UserChange,
    UserSettingsRead,
    UserSettingsUpdate,
)
from app.services.auth_service import AuthService
from app.security.dependencies import get_current_user
from app.security.jwt import create_access_token, validate_token, decode
from app.i18n.messages import msg

router = APIRouter(prefix="/auth", tags=["Auth"])

####################################
# PUBLIC

@router.post("/register", response_model=UserRead, status_code=201)
def create_user(
    payload: UserCreate,
    session: Session = Depends(get_session),
):
    try:
        return AuthService.create_user(
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
    user = AuthService.authenticate(
        session,
        username=payload.username,
        password=payload.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=msg("user.login.incorrect"),
        )

    token = create_access_token(user.id, session)
    return TokenRead(access_token=token)

@router.head("/me")
def me(
    _: dict = Depends(validate_token),
):
    return


@router.post("/change")
def changePassword(
    payload: UserChange,
    session: Session = Depends(get_session),
    _: dict = Depends(validate_token),
):
    username = decode(payload.access_token)["username"];

    AuthService.changePassword(username, session=session, password=payload.password)

    return


@router.delete("/me", status_code=204)
def delete_account(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    AuthService.delete_user(session, current_user)


@router.get("/settings", response_model=UserSettingsRead)
def get_settings(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return AuthService.get_settings(session, current_user)


@router.patch("/settings", response_model=UserSettingsRead)
def update_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return AuthService.update_settings(session, current_user, currency=payload.currency, language=payload.language)
