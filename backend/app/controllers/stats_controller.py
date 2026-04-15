from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session
from typing import Optional

from app.database import get_session
from app.security.dependencies import get_current_user
from app.services.stat_service import StatService
from app.schemas.stats_schema import BalancePoint, MonthlySummaryPoint, PotAmount, SubPotAmount, HeatmapPoint, TransactionStat, DailyBalancePoint
from app.models import User, Account
from app.i18n.messages import msg

router = APIRouter(prefix="/stats", tags=["Statistiques"], dependencies=[Depends(get_current_user)])


def _get_account(session: Session, account_id: str, user: User) -> Account:
    account = session.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg("account.not_found"))
    return account


@router.get("/total-balance", response_model=float)
def get_total_balance(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return StatService.get_total_balance_by_user_id(session=session, user=current_user)


@router.get("/accounts/{account_id}/balance-history", response_model=list[BalancePoint])
def get_balance_history(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    account = _get_account(session, account_id, current_user)
    return StatService.balance_history(session, account)


@router.get("/accounts/{account_id}/monthly", response_model=list[MonthlySummaryPoint])
def get_monthly_summary(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    account = _get_account(session, account_id, current_user)
    return StatService.monthly_summary(session, account)


@router.get("/accounts/{account_id}/daily-balance", response_model=list[DailyBalancePoint])
def get_daily_balance(
    account_id: str,
    year: int = Query(...),
    month: int = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    account = _get_account(session, account_id, current_user)
    return StatService.daily_balance_for_month(session, account, year, month)


@router.get("/accounts/{account_id}/by-pot", response_model=list[PotAmount])
def get_by_pot(
    account_id: str,
    year: int = Query(...),
    month: int = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    account = _get_account(session, account_id, current_user)
    return StatService.by_pot(session, account, year, month)


@router.get("/accounts/{account_id}/top-transactions", response_model=list[TransactionStat])
def get_top_transactions(
    account_id: str,
    year: int = Query(...),
    month: int = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    account = _get_account(session, account_id, current_user)
    return StatService.top_transactions(session, account, year, month)


@router.get("/accounts/{account_id}/by-subpot", response_model=list[SubPotAmount])
def get_by_subpot(
    account_id: str,
    year: int = Query(...),
    month: int = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    account = _get_account(session, account_id, current_user)
    return StatService.by_subpot(session, account, year, month)


@router.get("/accounts/{account_id}/heatmap", response_model=list[HeatmapPoint])
def get_heatmap(
    account_id: str,
    year: int = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    account = _get_account(session, account_id, current_user)
    return StatService.heatmap(session, account, year)
