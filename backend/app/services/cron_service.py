from datetime import date
from calendar import monthrange
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Transaction, TypeRecurrence

def process_recurrences(session: Session) -> None:

    today = date.today()

    with session.begin():

        transactions = get_due_recurrent_transactions(session, today)

        for tx in transactions:

            next_date = compute_next_date(tx)

            tx.is_processed = True

            if tx.recurrence_end_date and next_date > tx.recurrence_end_date:
                continue

            new_tx = Transaction(
                amount=tx.amount,
                transaction_type=tx.transaction_type,
                transaction_date=next_date,
                motif=tx.motif,
                compte_id=tx.compte_id,
                sous_pot_id=tx.sous_pot_id,
                recurrence_type=tx.recurrence_type,
                recurrence_end_date=tx.recurrence_end_date,
                recurrence_day=tx.recurrence_day,
                is_processed=False,
                recurrent=True
            )

            tx.is_processed=True

            session.add(new_tx)

def get_due_recurrent_transactions(session: Session, today: date):

    return session.execute(
        select(Transaction).where(
            Transaction.recurrent.is_(True),
            Transaction.recurrence_type.is_not(None),
            Transaction.transaction_date <= today,
            Transaction.is_processed.is_(False)
        )
    ).scalars().all()

def compute_next_date(tx: Transaction) -> date:

    current = tx.transaction_date

    if tx.recurrence_type == TypeRecurrence.DAY:
        return current + timedelta(days=1)

    if tx.recurrence_type == TypeRecurrence.WEEK:
        return current + timedelta(days=7)

    if tx.recurrence_type == TypeRecurrence.MONTH:

        year = current.year
        month = current.month + 1

        if month == 13:
            month = 1
            year += 1

        target_day = tx.recurrence_day or current.day

        last_day_of_month = monthrange(year, month)[1]

        day = min(target_day, last_day_of_month)

        return date(year, month, day)

    raise ValueError("Invalid recurrence_type")