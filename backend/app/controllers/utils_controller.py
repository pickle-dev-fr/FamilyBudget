from fastapi import APIRouter, Depends, HTTPException, status
from datetime import date
from sqlmodel import Session
from typing import Dict, Tuple

from app.database import get_session
from app.schemas.utils_schema import UtilsPeriode
from app.services.compte_service import CompteService
from app.utils.budget_cycle import get_majority_year_month_for_date
from app.services.user_service import UserService
from app.security.dependencies import get_current_user
from app.security.jwt import create_access_token
from app.i18n.messages import msg

router = APIRouter(prefix="/utils", tags=["Utils"], dependencies=[Depends(get_current_user)],)

_periode_cache: Dict[str, Tuple[int, int]] = {}

@router.get("/{compte_id}/periode", response_model=UtilsPeriode)
def periode(compte_id: str, session: Session = Depends(get_session)):

    compte = CompteService.get_by_id(session=session, compte_id=compte_id)
    if not compte:
        raise HTTPException(status_code=404)

    start_day = compte.start_day
    today = date.today()

    cache_key = f"{compte_id}:{start_day}:{today.isoformat()}"

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

    return UtilsPeriode(year=year, month=month)
