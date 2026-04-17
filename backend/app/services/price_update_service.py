import json
import logging
import os
import tempfile
from datetime import datetime, timezone, timedelta, date as date_type
from sqlmodel import Session, select
from app.models import InvestmentAsset, Account, AccountType, UserSettings, PortfolioSnapshot

_FX_TTL = timedelta(minutes=30)
_FX_CACHE_FILE = os.path.join(tempfile.gettempdir(), "familybudget_fx_cache.json")


def _load_fx_cache() -> dict[str, tuple[float, datetime]]:
    try:
        with open(_FX_CACHE_FILE) as f:
            data = json.load(f)
        return {
            k: (v[0], datetime.fromisoformat(v[1]).replace(tzinfo=timezone.utc))
            for k, v in data.items()
        }
    except Exception:
        return {}


def _save_fx_cache(cache: dict[str, tuple[float, datetime]]) -> None:
    try:
        with open(_FX_CACHE_FILE, "w") as f:
            json.dump({k: [v[0], v[1].isoformat()] for k, v in cache.items()}, f)
    except Exception:
        pass

logger = logging.getLogger(__name__)

# Devise déduite du suffixe du ticker — évite un appel HTTP par ticker
_SUFFIX_CURRENCY: list[tuple[str, str]] = [
    # Paires de change explicites (ex. BTC-USD)
    ("-USD", "USD"), ("-EUR", "EUR"), ("-GBP", "GBP"),
    ("-CHF", "CHF"), ("-JPY", "JPY"), ("-CAD", "CAD"), ("-AUD", "AUD"),
    # Bourses européennes → EUR
    (".PA", "EUR"), (".DE", "EUR"), (".AS", "EUR"), (".BR", "EUR"),
    (".MC", "EUR"), (".MI", "EUR"), (".VI", "EUR"), (".HE", "EUR"),
    (".LS", "EUR"), (".AT", "EUR"),
    # Londres → GBP
    (".L", "GBP"), (".IL", "GBP"),
    # Japon → JPY
    (".T", "JPY"),
    # Canada → CAD
    (".TO", "CAD"), (".V", "CAD"),
    # Australie → AUD
    (".AX", "AUD"),
    # Suisse → CHF
    (".SW", "CHF"),
]


def _infer_currency(ticker: str) -> str:
    upper = ticker.upper()
    for suffix, currency in _SUFFIX_CURRENCY:
        if upper.endswith(suffix.upper()):
            return currency
    return "USD"  # NASDAQ/NYSE par défaut


def snapshot_portfolio_today(session: Session, account_id: str) -> None:
    """Crée ou met à jour le snapshot du portefeuille pour aujourd'hui."""
    from app.models import Account
    account = session.get(Account, account_id)
    if not account:
        return
    total = round(sum(a.quantity * a.current_price for a in account.assets), 2)
    today = date_type.today()
    existing = session.exec(
        select(PortfolioSnapshot).where(
            PortfolioSnapshot.account_id == account_id,
            PortfolioSnapshot.snapshot_date == today,
        )
    ).first()
    if existing:
        existing.total_value = total
        session.add(existing)
    else:
        session.add(PortfolioSnapshot(
            account_id=account_id,
            snapshot_date=today,
            total_value=total,
        ))
    session.commit()


def update_investment_prices(session: Session, account_id: str | None = None) -> None:
    stmt = (
        select(InvestmentAsset)
        .join(Account, InvestmentAsset.account_id == Account.id)
        .where(Account.account_type == AccountType.INVESTMENT)
    )
    if account_id:
        stmt = stmt.where(InvestmentAsset.account_id == account_id)

    assets = session.exec(stmt).all()
    if not assets:
        return

    try:
        import yfinance as yf
    except ImportError:
        logger.error("yfinance non installé")
        return

    ticker_to_assets: dict[str, list[InvestmentAsset]] = {}
    for asset in assets:
        ticker_to_assets.setdefault(asset.ticker, []).append(asset)

    tickers = list(ticker_to_assets.keys())

    # Devise native déduite localement (pas d'appel HTTP)
    ticker_currency = {t: _infer_currency(t) for t in tickers}

    # Devise cible par compte (UserSettings)
    account_ids = list({asset.account_id for asset in assets})
    accounts = session.exec(select(Account).where(Account.id.in_(account_ids))).all()
    account_user_ids = {a.id: a.user_id for a in accounts}
    user_ids = list(set(account_user_ids.values()))
    settings = session.exec(select(UserSettings).where(UserSettings.user_id.in_(user_ids))).all()
    user_currency_map = {s.user_id: s.currency.value for s in settings}
    account_currency = {
        acc_id: user_currency_map.get(account_user_ids.get(acc_id, ""), "EUR")
        for acc_id in account_ids
    }

    # Paires FX nécessaires
    needed_pairs: set[tuple[str, str]] = set()
    for asset in assets:
        src = ticker_currency.get(asset.ticker, "USD")
        dst = account_currency.get(asset.account_id, "EUR")
        if src != dst:
            needed_pairs.add((src, dst))

    # Taux en cache / à télécharger
    now_dt = datetime.now(timezone.utc)
    _fx_cache = _load_fx_cache()
    fx_rates: dict[tuple[str, str], float] = {}
    pairs_to_fetch: list[tuple[str, str]] = []
    for pair in needed_pairs:
        cached = _fx_cache.get(f"{pair[0]}{pair[1]}")
        if cached and (now_dt - cached[1]) < _FX_TTL:
            fx_rates[pair] = cached[0]
        else:
            pairs_to_fetch.append(pair)

    fx_symbols = [f"{src}{dst}=X" for src, dst in pairs_to_fetch]

    # Un seul appel yfinance : prix actifs + taux FX non cachés
    all_symbols = tickers + fx_symbols
    try:
        data = yf.download(tickers=all_symbols, period="5d", auto_adjust=True, progress=False)
    except Exception as e:
        logger.error("Erreur lors du téléchargement yfinance : %s", e)
        return

    close = data["Close"]

    def get_price(symbol: str) -> float | None:
        """Retourne le dernier prix de clôture non-NaN du symbole."""
        try:
            # close est un DataFrame (multi-ticker) ou une Series (ticker unique)
            if isinstance(close, type(close)) and hasattr(close, "columns"):
                series = close[symbol]
            else:
                series = close
            valid = series.dropna()
            if valid.empty:
                return None
            return float(valid.iloc[-1])
        except Exception:
            return None

    # Taux de change fraîchement téléchargés → mise en cache
    for (src, dst), fx_sym in zip(pairs_to_fetch, fx_symbols):
        rate = get_price(fx_sym)
        if rate is not None:
            fx_rates[(src, dst)] = rate
            _fx_cache[f"{src}{dst}"] = (rate, now_dt)
        else:
            fx_rates[(src, dst)] = 1.0
            logger.warning("Taux %s→%s indisponible", src, dst)
    _save_fx_cache(_fx_cache)

    # Appliquer les prix convertis
    for ticker, asset_list in ticker_to_assets.items():
        price = get_price(ticker)
        if price is None:
            logger.warning("Prix indisponible pour %s", ticker)
            continue

        src_currency = ticker_currency.get(ticker, "USD")
        for asset in asset_list:
            dst_currency = account_currency.get(asset.account_id, "EUR")
            rate = fx_rates.get((src_currency, dst_currency), 1.0)
            asset.current_price = round(price * rate, 4)
            asset.last_price_update = now_dt
            session.add(asset)

    session.commit()

    # ── Snapshot de portefeuille ──────────────────────────────────────────
    today = date_type.today()
    account_totals: dict[str, float] = {}
    for asset in assets:
        account_totals[asset.account_id] = (
            account_totals.get(asset.account_id, 0.0) + asset.quantity * asset.current_price
        )

    for acc_id, total in account_totals.items():
        existing = session.exec(
            select(PortfolioSnapshot).where(
                PortfolioSnapshot.account_id == acc_id,
                PortfolioSnapshot.snapshot_date == today,
            )
        ).first()
        if existing:
            existing.total_value = round(total, 2)
            session.add(existing)
        else:
            session.add(PortfolioSnapshot(
                account_id=acc_id,
                snapshot_date=today,
                total_value=round(total, 2),
            ))

    session.commit()
