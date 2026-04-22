import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlmodel import Session, select
from datetime import date, timedelta
from app.database import engine
from app.services.cron_service import process_recurrences
from app.services.price_update_service import update_investment_prices
from app.services.savings_interest_service import apply_savings_interest

scheduler = AsyncIOScheduler()

def start_scheduler():
    scheduler.add_job(
        process_recurrences_job,
        "cron",
        hour="0",
        minute="5"
    )
    scheduler.add_job(
        apply_savings_interest_job,
        "cron",
        hour="0",
        minute="10"
    )
    scheduler.add_job(
        update_investment_prices_job,
        "cron",
        hour="1",
        minute="0"
    )
    scheduler.add_job(
        snapshot_job,
        "cron",
        hour="0",
        minute="1"
    )
    scheduler.start()


def process_recurrences_job():
    with Session(engine) as session:
        process_recurrences(session)


def apply_savings_interest_job():
    with Session(engine) as session:
        apply_savings_interest(session)


def update_investment_prices_job():
    with Session(engine) as session:
        update_investment_prices(session)


def snapshot_job():
    from app.models import Account, AccountType
    from app.services.snapshot_service import SnapshotService
    from app.utils.budget_cycle import get_budget_cycle_for_date, get_majority_year_month_for_date

    yesterday = date.today() - timedelta(days=1)
    with Session(engine) as session:
        accounts = session.exec(
            select(Account).where(Account.account_type == AccountType.NORMAL)
        ).all()
        for account in accounts:
            cycle = get_budget_cycle_for_date(yesterday, account.start_day)
            if cycle["end"] == yesterday:
                year, month = get_majority_year_month_for_date(yesterday, account.start_day)
                SnapshotService.take_for_account(session, account, year, month)
