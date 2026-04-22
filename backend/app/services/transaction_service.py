from datetime import date
from sqlmodel import Session, select
from sqlalchemy import or_, asc
from typing import List


from app.models import (
    Transaction,
    Account,
    Pot,
    Sub_Pot,
    TypeTransaction,
    TypeRecurrence,
    User
)
from app.schemas.transaction_schema import (TransactionUpdate, TransferCreate)
from app.utils.budget_cycle import get_budget_cycle_for_month
from app.i18n.messages import msg
from typing import Optional


class TransactionService:

    @staticmethod
    def create_transaction(
        session: Session,
        *,
        amount: float,
        transaction_type: TypeTransaction,
        transaction_date: date | None = None,
        motif: str | None = None,
        account_id: str | None = None,
        sub_pot_id: str | None = None,
        recurrent: bool = False,
        recurrence_type=None,
        recurrence_end_date=None,
    ) -> Transaction:
        # --- règles générales ---
        if amount <= 0:
            raise ValueError(msg("transaction.amount.positive"))

        # --- règles DEBIT ---
        if transaction_type == TypeTransaction.DEBIT:
            if sub_pot_id is None:
                raise ValueError(msg("transaction.debit.requires_sub_pot"))
            if account_id is not None:
                raise ValueError(msg("transaction.debit.forbidden_account"))

            sub_pot = session.get(Sub_Pot, sub_pot_id)
            if not sub_pot:
                raise ValueError(msg("sub_pot.not_found"))

        # --- règles CREDIT ---
        elif transaction_type == TypeTransaction.CREDIT:
            if account_id is None:
                raise ValueError(msg("transaction.credit.requires_account"))
            if sub_pot_id is not None:
                raise ValueError(msg("transaction.credit.forbidden_sub_pot"))

            account = session.get(Account, account_id)
            if not account:
                raise ValueError(msg("account.not_found"))

        # --- gestion récurrence ---

        recurrence_day = None

        if recurrent:

            if recurrence_type is None:
                raise ValueError(msg("transaction.recurrence_type.required"))

            if recurrence_type == TypeRecurrence.MONTH:
                base_date = transaction_date or date.today()
                recurrence_day = base_date.day
        if not recurrent:
            recurrence_type = None
            recurrence_end_date = None
            recurrence_day = None

        transaction = Transaction(
            amount=amount,
            transaction_type=transaction_type,
            transaction_date=transaction_date or date.today(),
            motif=motif,
            account_id=account_id,
            sub_pot_id=sub_pot_id,
            recurrent=recurrent,
            recurrence_type=recurrence_type,
            recurrence_end_date=recurrence_end_date,
            recurrence_day=recurrence_day,
            is_processed=False
        )

        session.add(transaction)
        session.commit()
        session.refresh(transaction)
        return transaction

    @staticmethod
    def create_transfer(
        session: Session,
        payload: TransferCreate,
        user: User
    ):

        if payload.account_source_id == payload.account_destination_id:
            raise ValueError(msg("transaction.transfer.same_account"))

        if payload.amount <= 0:
            raise ValueError(msg("transaction.amount.positive"))

        if payload.recurrent and not payload.recurrence_type:
            raise ValueError(msg("transaction.recurrence_type.required"))

        debit_payload = {
            "amount": payload.amount,
            "transaction_type": TypeTransaction.DEBIT,
            "transaction_date": payload.transaction_date,
            "motif": payload.motif,
            "sub_pot_id": payload.sub_pot_id,
            "recurrent": payload.recurrent,
            "recurrence_type": payload.recurrence_type,
            "recurrence_end_date": payload.recurrence_end_date,
        }

        credit_payload = {
            "amount": payload.amount,
            "transaction_type": TypeTransaction.CREDIT,
            "transaction_date": payload.transaction_date,
            "motif": payload.motif,
            "account_id": payload.account_destination_id,
            "recurrent": payload.recurrent,
            "recurrence_type": payload.recurrence_type,
            "recurrence_end_date": payload.recurrence_end_date,
        }

        debit = TransactionService.create_transaction(
            session=session,
            **debit_payload
        )

        credit = TransactionService.create_transaction(
            session=session,
            **credit_payload
        )

        debit.linked_transaction_id = credit.id
        credit.linked_transaction_id = debit.id
        session.add(debit)
        session.add(credit)
        session.commit()
        session.refresh(debit)
        session.refresh(credit)

        return [debit, credit]

    @staticmethod
    def list_by_id (session: Session, id :str) -> Transaction:
        query = select(Transaction).where(Transaction.id == id)
        return session.exec(query).one()

    def list_by_account_and_period(
        session: Session, 
        account_id: str, 
        date_year: int,
        date_month: int
    ) -> List[Transaction]:
        """
        Retourne toutes les transactions pour un account donné dans le cycle budgétaire courant,
        triées par date croissante.
        - Transactions CREDIT directes sur le account
        - Transactions DEBIT via les Sub_Pot du account
        """
        # Récupérer le account pour son start_day
        account = session.get(Account, account_id)
        if not account:
            return []

        period = get_budget_cycle_for_month(year=date_year, month=date_month, start_day= account.start_day)

        start_date = period["start"]
        end_date = period["end"]

        # Requête unique avec jointures pour inclure DEBIT via Sub_Pot
        stmt = (
            select(Transaction)
            .outerjoin(Sub_Pot, Transaction.sub_pot_id == Sub_Pot.id)
            .outerjoin(Pot, Sub_Pot.pot_id == Pot.id)
            .where(
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                (
                    (Transaction.account_id == account_id) |  # CREDIT direct
                    (Pot.account_id == account_id)           # DEBIT via SubPot -> Pot -> account
                )
            )
            .order_by(Transaction.transaction_date.asc())
        )

        transactions = session.exec(stmt).all()
        return transactions


    @staticmethod
    def list_by_sub_pot(
        session: Session,
        sub_pot_id: str,
    ) -> list[Transaction]:
        query = select(Transaction).where(Transaction.sub_pot_id == sub_pot_id)
        return session.exec(query).all()

    @staticmethod
    def list_by_user_and(
        session: Session,
        user,
        filters: dict | None = None,
    ) -> list[Transaction]:
        user_account_ids = (
            select(Account.id)
            .where(Account.user_id == user.id)
        )

        stmt = (
            select(Transaction)
            .outerjoin(Sub_Pot, Transaction.sub_pot_id == Sub_Pot.id)
            .outerjoin(Pot, Sub_Pot.pot_id == Pot.id)
            .where(
                or_(
                    Transaction.account_id.in_(user_account_ids),
                    Pot.account_id.in_(user_account_ids),
                )
            )
        )

        if filters:
            if filters.get("transaction_date") is not None:
                stmt = stmt.where(
                    Transaction.transaction_date == filters["transaction_date"]
                )

        stmt = stmt.order_by(asc(Transaction.transaction_date))
        return session.exec(stmt).all()

    @staticmethod
    def list_recurrentes_by_account(
        session: Session,
        account_id: str,
    ) -> list[Transaction]:
        query = (
            select(Transaction)
            .outerjoin(Sub_Pot, Transaction.sub_pot_id == Sub_Pot.id)
            .outerjoin(Pot, Sub_Pot.pot_id == Pot.id)
            .where(
                (
                    (Transaction.account_id == account_id) |
                    (Pot.account_id == account_id)
                )
                & (Transaction.recurrent.is_(True))
                & (Transaction.is_processed.is_(False))
            )
            .order_by(asc(Transaction.transaction_date))
        )

        return session.exec(query).all()

    @staticmethod
    def update(
        session: Session,
        transaction_id: str,
        payload: TransactionUpdate
    ) -> Transaction:

        transaction = session.get(Transaction, transaction_id)

        if not transaction:
            raise HTTPException(status_code=404, detail="transaction.not_found")

        # ----- Mise à jour des champs simples -----

        if payload.amount is not None:
            if payload.amount <= 0:
                raise HTTPException(status_code=400, detail="transaction.amount_positive")
            transaction.amount = payload.amount

        if payload.transaction_date is not None:
            transaction.transaction_date = payload.transaction_date

        if payload.motif is not None:
            transaction.motif = payload.motif

        # ----- Gestion changement de type -----

        if payload.transaction_type is not None:
            transaction.transaction_type = payload.transaction_type

        # ----- Règles métier DEBIT / CREDIT -----

        if transaction.transaction_type == TypeTransaction.DEBIT:

            if payload.sub_pot_id is not None:
                transaction.sub_pot_id = payload.sub_pot_id

            if not transaction.sub_pot_id:
                raise HTTPException(status_code=400, detail="transaction.debit_requires_sub_pot")

            if payload.account_id is not None:
                raise HTTPException(status_code=400, detail="transaction.debit_forbids_account")

            transaction.account_id = None

        elif transaction.transaction_type == TypeTransaction.CREDIT:

            if payload.account_id is not None:
                transaction.account_id = payload.account_id

            if not transaction.account_id:
                raise HTTPException(status_code=400, detail="transaction.credit_requires_account")

            if payload.sub_pot_id is not None:
                raise HTTPException(status_code=400, detail="transaction.credit_forbids_sub_pot")

            transaction.sub_pot_id = None

        # ----- Transactions récurrentes -----
        # Rappel règle :
        # Une seule transaction future existe.
        # Modifier = modifie uniquement celle-ci.

        if payload.recurrent is not None:
            transaction.recurrent = payload.recurrent
            transaction.recurrence_type = payload.recurrence_type
            transaction.recurrence_end_date = payload.recurrence_end_date

        if transaction.linked_transaction_id:
            linked = session.get(Transaction, transaction.linked_transaction_id)
            if linked:
                if payload.amount is not None:
                    linked.amount = transaction.amount
                if payload.transaction_date is not None:
                    linked.transaction_date = transaction.transaction_date
                if payload.motif is not None:
                    linked.motif = transaction.motif
                session.add(linked)

        session.add(transaction)
        session.commit()
        session.refresh(transaction)

        return transaction

    @staticmethod
    def delete(session: Session, transaction: Transaction) -> None:
        if transaction.linked_transaction_id:
            linked = session.get(Transaction, transaction.linked_transaction_id)
            if linked:
                linked.linked_transaction_id = None
                session.add(linked)
                session.flush()
                session.delete(linked)
        session.delete(transaction)
        session.commit()

    @staticmethod
    def delete_recurrence(session: Session, transaction: Transaction) -> Transaction:
        transaction.recurrent = False
        transaction.recurrence_type = None
        transaction.recurrence_end_date = None
        transaction.recurrence_day = None
        session.add(transaction)
        session.commit()
