from sqlmodel import Session, select
from sqlalchemy import or_, func
from datetime import date

from app.models import Account, User, Sub_Pot, Pot, Transaction, TypeTransaction
from app.services.account_service import AccountService
from app.utils.budget_cycle import get_budget_cycle_for_month, previous_month
from app.schemas.stats_schema import BalancePoint, MonthlySummaryPoint, PotAmount, HeatmapPoint


class StatService:

    @staticmethod
    def get_total_balance_by_user_id(session: Session, user: User) -> float:
        total = 0.0
        accounts = AccountService.list_by_user(session, user)
        for account in accounts:
            total += AccountService.calculer_balance_account(session, account)
        return total

    @staticmethod
    def _last_n_months(n: int) -> list[tuple[int, int]]:
        today = date.today()
        y, m = today.year, today.month
        months = []
        for _ in range(n):
            months.append((y, m))
            y, m = previous_month(y, m)
        return list(reversed(months))

    @staticmethod
    def _account_transactions_query(account: Account):
        return (
            select(Transaction)
            .outerjoin(Sub_Pot, Transaction.sub_pot_id == Sub_Pot.id)
            .outerjoin(Pot, Sub_Pot.pot_id == Pot.id)
            .where(
                or_(
                    Transaction.account_id == account.id,
                    Pot.account_id == account.id,
                )
            )
        )

    @staticmethod
    def balance_history(session: Session, account: Account, n_months: int = 12) -> list[BalancePoint]:
        result = []
        for year, month in StatService._last_n_months(n_months):
            cycle = get_budget_cycle_for_month(year, month, account.start_day)
            txs = session.exec(
                StatService._account_transactions_query(account).where(
                    Transaction.transaction_date <= cycle["end"]
                )
            ).all()
            balance = account.initial_value + account.archived_value
            for t in txs:
                balance += t.amount if t.transaction_type == TypeTransaction.CREDIT else -t.amount
            result.append(BalancePoint(year=year, month=month, balance=round(balance, 2)))
        return result

    @staticmethod
    def monthly_summary(session: Session, account: Account, n_months: int = 12) -> list[MonthlySummaryPoint]:
        result = []
        for year, month in StatService._last_n_months(n_months):
            cycle = get_budget_cycle_for_month(year, month, account.start_day)
            txs = session.exec(
                StatService._account_transactions_query(account).where(
                    Transaction.transaction_date >= cycle["start"],
                    Transaction.transaction_date <= cycle["end"],
                )
            ).all()
            income = round(sum(t.amount for t in txs if t.transaction_type == TypeTransaction.CREDIT), 2)
            expenses = round(sum(t.amount for t in txs if t.transaction_type == TypeTransaction.DEBIT), 2)
            result.append(MonthlySummaryPoint(
                year=year, month=month,
                income=income, expenses=expenses,
                delta=round(income - expenses, 2),
            ))
        return result

    @staticmethod
    def by_pot(session: Session, account: Account, year: int, month: int) -> list[PotAmount]:
        cycle = get_budget_cycle_for_month(year, month, account.start_day)
        pots = session.exec(
            select(Pot)
            .where(Pot.account_id == account.id, Pot.position != 0)
            .order_by(Pot.position)
        ).all()

        result = []
        for pot in pots:
            sub_pot_ids = session.exec(
                select(Sub_Pot.id).where(Sub_Pot.pot_id == pot.id)
            ).all()
            if not sub_pot_ids:
                continue
            total = session.exec(
                select(func.coalesce(func.sum(Transaction.amount), 0.0))
                .where(
                    Transaction.sub_pot_id.in_(sub_pot_ids),
                    Transaction.transaction_type == TypeTransaction.DEBIT,
                    Transaction.transaction_date >= cycle["start"],
                    Transaction.transaction_date <= cycle["end"],
                )
            ).one()
            result.append(PotAmount(pot=pot.name, amount=round(float(total), 2)))

        return sorted(result, key=lambda x: x.amount, reverse=True)

    @staticmethod
    def heatmap(session: Session, account: Account, year: int) -> list[HeatmapPoint]:
        start = date(year, 1, 1)
        end = date(year, 12, 31)

        rows = session.exec(
            select(
                Transaction.transaction_date,
                func.sum(Transaction.amount),
                func.count(Transaction.id),
            )
            .outerjoin(Sub_Pot, Transaction.sub_pot_id == Sub_Pot.id)
            .outerjoin(Pot, Sub_Pot.pot_id == Pot.id)
            .where(
                or_(Transaction.account_id == account.id, Pot.account_id == account.id),
                Transaction.transaction_type == TypeTransaction.DEBIT,
                Transaction.transaction_date >= start,
                Transaction.transaction_date <= end,
            )
            .group_by(Transaction.transaction_date)
            .order_by(Transaction.transaction_date)
        ).all()

        return [HeatmapPoint(date=str(d), amount=round(float(a), 2), count=c) for d, a, c in rows]
