from fastapi import APIRouter, Depends, HTTPException, status
from datetime import date
from sqlmodel import Session

from app.database import get_session
from app.schemas.utils_schema import UtilsPeriode
from app.services.compte_service import CompteService
from app.utils.budget_cycle import get_majority_year_month_for_date
from app.services.user_service import UserService
from app.security.dependencies import get_current_user
from app.security.jwt import create_access_token
from app.i18n.messages import msg

router = APIRouter(prefix="/utils", tags=["Utils"], dependencies=[Depends(get_current_user)],)

@router.get("/{compte_id}/periode", response_model=UtilsPeriode)
def periode(compte_id: str, session: Session = Depends(get_session)):
    start_day = CompteService.get_by_id(session=session, compte_id=compte_id).start_day
    today = date.today()
    cycle = get_majority_year_month_for_date(target_date=today, start_day=start_day)
    return UtilsPeriode(
        year=cycle[0],
        month=cycle[1],
    )
