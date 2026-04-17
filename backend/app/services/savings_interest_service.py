import logging
from datetime import date, datetime, timezone
from sqlmodel import Session, select
from app.models import Account, AccountType, InterestFrequency, Transaction, TypeTransaction
from app.services.account_service import AccountService
from app.i18n.messages import msg

logger = logging.getLogger(__name__)

_PERIODS_PER_YEAR = {
    InterestFrequency.DAILY: 365,
    InterestFrequency.MONTHLY: 12,
    InterestFrequency.ANNUAL: 1,
}


def _should_apply_today(frequency: InterestFrequency, today: date) -> bool:
    if frequency == InterestFrequency.DAILY:
        return True
    if frequency == InterestFrequency.MONTHLY:
        return today.day == 1
    if frequency == InterestFrequency.ANNUAL:
        return today.month == 1 and today.day == 1
    return False


def apply_savings_interest(session: Session) -> None:
    today = date.today()

    accounts = session.exec(
        select(Account).where(Account.account_type == AccountType.SAVINGS)
    ).all()

    for account in accounts:
        if not account.interest_rate or not account.interest_frequency:
            continue
        if not _should_apply_today(account.interest_frequency, today):
            continue

        balance = AccountService.calculer_balance_account(session, account)
        periods = _PERIODS_PER_YEAR[account.interest_frequency]
        amount = round(balance * (account.interest_rate / 100) / periods, 2)

        if amount <= 0:
            continue

        motif_keys = {
            InterestFrequency.DAILY: "savings_interest.daily",
            InterestFrequency.MONTHLY: "savings_interest.monthly",
            InterestFrequency.ANNUAL: "savings_interest.annual",
        }

        tx = Transaction(
            amount=amount,
            transaction_date=today,
            transaction_type=TypeTransaction.CREDIT,
            motif=msg(motif_keys[account.interest_frequency]),
            account_id=account.id,
        )
        session.add(tx)
        logger.info("Intérêts appliqués sur compte %s : +%.2f", account.id, amount)

    session.commit()
