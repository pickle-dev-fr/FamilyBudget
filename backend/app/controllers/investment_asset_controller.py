import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.database import get_session
from app.security.dependencies import get_current_user
from app.services.account_service import AccountService
from app.services.investment_asset_service import InvestmentAssetService
from app.services.price_update_service import update_investment_prices, snapshot_portfolio_today
from app.schemas.account_schema import InvestmentAssetCreate, InvestmentAssetUpdate, InvestmentAssetRead, TickerSearchResult
from app.models import User, Account
from app.i18n.messages import msg

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/accounts",
    tags=["Investment Assets"],
    dependencies=[Depends(get_current_user)],
)

search_router = APIRouter(
    prefix="/investment",
    tags=["Investment"],
    dependencies=[Depends(get_current_user)],
)


def _check_investment_account(session: Session, account_id: str, user: User) -> Account:
    account = session.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg("account.not_found"))
    return account


@router.get("/{account_id}/assets", response_model=list[InvestmentAssetRead])
def list_assets(
    account_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _check_investment_account(session, account_id, user)
    return InvestmentAssetService.list_by_account(session, account_id)


@router.post("/{account_id}/assets", response_model=InvestmentAssetRead, status_code=201)
def add_asset(
    account_id: str,
    payload: InvestmentAssetCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    account = _check_investment_account(session, account_id, user)
    try:
        result = InvestmentAssetService.add_asset(session, account, payload)
        update_investment_prices(session, account_id=account_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{account_id}/assets/{asset_id}", response_model=InvestmentAssetRead)
def update_asset(
    account_id: str,
    asset_id: str,
    payload: InvestmentAssetUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _check_investment_account(session, account_id, user)
    try:
        result = InvestmentAssetService.update_asset(session, asset_id, payload)
        update_investment_prices(session, account_id=account_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{account_id}/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    account_id: str,
    asset_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _check_investment_account(session, account_id, user)
    try:
        InvestmentAssetService.delete_asset(session, asset_id)
        snapshot_portfolio_today(session, account_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{account_id}/assets/refresh", status_code=200)
def refresh_prices(
    account_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _check_investment_account(session, account_id, user)
    update_investment_prices(session, account_id=account_id)
    return {"ok": True}


_QUOTE_TYPE_MAP = {
    "EQUITY": "STOCK",
    "ETF": "ETF",
    "CRYPTOCURRENCY": "CRYPTO",
}


@search_router.get("/search", response_model=list[TickerSearchResult])
def search_tickers(q: str = Query(..., min_length=1)):
    try:
        import yfinance as yf
        results = yf.Search(q, max_results=8, enable_fuzzy_query=True).quotes
    except Exception as e:
        logger.error("Erreur recherche yfinance : %s", e)
        raise HTTPException(status_code=502, detail="Erreur lors de la recherche de tickers")

    out = []
    for r in results:
        symbol = r.get("symbol", "")
        name = r.get("shortname") or r.get("longname") or symbol
        quote_type = r.get("quoteType", "")
        asset_type = _QUOTE_TYPE_MAP.get(quote_type)
        if not asset_type:
            continue
        out.append(TickerSearchResult(ticker=symbol, name=name, asset_type=asset_type))
    return out
