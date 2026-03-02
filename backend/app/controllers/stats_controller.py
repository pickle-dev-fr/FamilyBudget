# app/controllers/transaction_controller.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.security.dependencies import get_current_user
from app.services.stat_service import StatService
from app.models import User
from app.i18n.messages import msg

router = APIRouter(prefix="/stats", tags=["Statistiques"], dependencies=[Depends(get_current_user)])

@router.get("/total-balance", response_model=float)
def get_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return StatService.get_total_balance_by_user_id(
        session=session,
        user=current_user,
    )