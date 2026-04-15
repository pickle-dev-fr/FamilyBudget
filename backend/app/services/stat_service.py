from sqlmodel import Session, select
from sqlalchemy import or_, func
from datetime import date, timedelta
from collections import defaultdict

from app.models import Account, User, Sub_Pot, Pot, Transaction, TypeTransaction
from app.services.account_service import AccountService
from app.utils.budget_cycle import get_budget_cycle_for_month, previous_month
from app.schemas.stats_schema import BalancePoint, MonthlySummaryPoint, PotAmount, SubPotAmount, HeatmapPoint, TransactionStat, DailyBalancePoint


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
    def _months_since(start_year: int, start_month: int) -> list[tuple[int, int]]:
        today = date.today()
        months = []
        y, m = today.year, today.month
        while (y > start_year) or (y == start_year and m >= start_month):
            months.append((y, m))
            y, m = previous_month(y, m)
        return list(reversed(months))

    @staticmethod
    def balance_history(session: Session, account: Account) -> list[BalancePoint]:
        earliest = session.exec(
            select(func.min(Transaction.transaction_date))
            .outerjoin(Sub_Pot, Transaction.sub_pot_id == Sub_Pot.id)
            .outerjoin(Pot, Sub_Pot.pot_id == Pot.id)
            .where(or_(Transaction.account_id == account.id, Pot.account_id == account.id))
        ).one()

        today = date.today()
        if earliest:
            start_year, start_month = earliest.year, earliest.month
        else:
            start_year, start_month = today.year, today.month

        result = []
        for year, month in StatService._months_since(start_year, start_month):
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
    def by_subpot(session: Session, account: Account, year: int, month: int) -> list[SubPotAmount]:
        cycle = get_budget_cycle_for_month(year, month, account.start_day)
        pots = session.exec(
            select(Pot)
            .where(Pot.account_id == account.id, Pot.position != 0)
            .order_by(Pot.position)
        ).all()

        result = []
        for pot in pots:
            sub_pots = session.exec(
                select(Sub_Pot).where(Sub_Pot.pot_id == pot.id, Sub_Pot.position != 0)
            ).all()
            for sp in sub_pots:
                total = session.exec(
                    select(func.coalesce(func.sum(Transaction.amount), 0.0))
                    .where(
                        Transaction.sub_pot_id == sp.id,
                        Transaction.transaction_type == TypeTransaction.DEBIT,
                        Transaction.transaction_date >= cycle["start"],
                        Transaction.transaction_date <= cycle["end"],
                    )
                ).one()
                if float(total) > 0:
                    result.append(SubPotAmount(pot=pot.name, sub_pot=sp.name, amount=round(float(total), 2)))

        return sorted(result, key=lambda x: x.amount, reverse=True)

    @staticmethod
    def balance_for_range(session: Session, account: Account, from_date: date, to_date: date) -> list[DailyBalancePoint]:
        today = date.today()

        txs_before = session.exec(
            StatService._account_transactions_query(account).where(
                Transaction.transaction_date < from_date
            )
        ).all()
        balance = account.initial_value + account.archived_value
        for t in txs_before:
            balance += t.amount if t.transaction_type == TypeTransaction.CREDIT else -t.amount

        txs_in_range = session.exec(
            StatService._account_transactions_query(account).where(
                Transaction.transaction_date >= from_date,
                Transaction.transaction_date <= to_date,
            ).order_by(Transaction.transaction_date)
        ).all()

        by_date: dict[date, list] = defaultdict(list)
        for t in txs_in_range:
            by_date[t.transaction_date].append(t)

        result = []
        current = from_date
        while current <= to_date:
            for t in by_date.get(current, []):
                balance += t.amount if t.transaction_type == TypeTransaction.CREDIT else -t.amount
            result.append(DailyBalancePoint(
                date=str(current),
                balance=round(balance, 2),
                is_future=current > today,
            ))
            current += timedelta(days=1)

        return result

    @staticmethod
    def daily_balance_for_month(session: Session, account: Account, year: int, month: int) -> list[DailyBalancePoint]:
        cycle = get_budget_cycle_for_month(year, month, account.start_day)
        return StatService.balance_for_range(session, account, cycle["start"], cycle["end"])

    @staticmethod
    def all_transactions(session: Session, account: Account, year: int, month: int) -> list[TransactionStat]:
        today = date.today()
        cycle = get_budget_cycle_for_month(year, month, account.start_day)
        txs = session.exec(
            StatService._account_transactions_query(account)
            .where(
                Transaction.transaction_date >= cycle["start"],
                Transaction.transaction_date <= cycle["end"],
            )
            .order_by(Transaction.transaction_date.desc())
        ).all()

        result = []
        for t in txs:
            sp = session.get(Sub_Pot, t.sub_pot_id) if t.sub_pot_id else None
            pot = session.get(Pot, sp.pot_id) if sp else None
            is_planned = t.transaction_date > today and t.recurrent and not t.is_processed
            result.append(TransactionStat(
                date=str(t.transaction_date),
                amount=round(t.amount, 2),
                motif=t.motif,
                sub_pot=sp.name if sp else "—",
                pot=pot.name if pot else "—",
                transaction_type=t.transaction_type.value,
                is_planned=is_planned,
            ))
        return result

    @staticmethod
    def top_transactions(session: Session, account: Account, year: int, month: int) -> list[TransactionStat]:
        return StatService.all_transactions(session, account, year, month)

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
