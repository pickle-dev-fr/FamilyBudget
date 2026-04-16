import logging
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select
from app.models import InvestmentAsset, Account, AccountType, UserSettings

# Cache en mémoire des taux de change (TTL 30 min)
_fx_cache: dict[str, tuple[float, datetime]] = {}
_FX_TTL = timedelta(minutes=30)

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
        data = yf.download(tickers=all_symbols, period="1d", auto_adjust=True, progress=False)
    except Exception as e:
        logger.error("Erreur lors du téléchargement yfinance : %s", e)
        return

    close = data["Close"]
    single = len(all_symbols) == 1

    def get_price(symbol: str) -> float | None:
        try:
            if single:
                return float(close.iloc[-1, 0])
            return float(close[symbol].iloc[-1])
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
