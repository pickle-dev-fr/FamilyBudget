from fastapi import APIRouter, Depends, HTTPException, status
from datetime import date
from sqlmodel import Session
from typing import Dict, Tuple

from app.database import get_session
from app.schemas.utils_schema import UtilsPeriod
from app.services.account_service import AccountService
from app.utils.budget_cycle import get_majority_year_month_for_date
from app.services.user_service import UserService
from app.security.dependencies import get_current_user
from app.security.jwt import create_access_token
from app.i18n.messages import msg

router = APIRouter(prefix="/utils", tags=["Utils"], dependencies=[Depends(get_current_user)],)

_periode_cache: Dict[str, Tuple[int, int]] = {}

@router.get("/{account_id}/period", response_model=UtilsPeriod)
def period(account_id: str, session: Session = Depends(get_session)):

    account = AccountService.get_by_id(session=session, account_id=account_id)
    if not account:
        raise HTTPException(status_code=404)

    start_day = account.start_day
    today = date.today()

    cache_key = f"{account_id}:{start_day}:{today.isoformat()}"

    if cache_key in _periode_cache:
        year, month = _periode_cache[cache_key]
    else:
        cycle = get_majority_year_month_for_date(
            target_date=today,
            start_day=start_day
        )
        year, month = cycle

        _periode_cache.clear()  # simple stratégie : on vide tout
        _periode_cache[cache_key] = (year, month)

    return UtilsPeriod(year=year, month=month)
