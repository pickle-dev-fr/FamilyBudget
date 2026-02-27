from datetime import date
from sqlmodel import Session, select
from sqlalchemy import or_, asc
from typing import List


from app.models import (
    Transaction,
    Compte,
    Pot,
    Sous_Pot,
    TypeTransaction,
    TypeRecurrence
)
from app.schemas.transaction_schema import TransactionUpdate
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
        compte_id: str | None = None,
        sous_pot_id: str | None = None,
        recurrent: bool = False,
        recurrence_type=None,
        recurrence_end_date=None,
    ) -> Transaction:
        # --- règles générales ---
        if amount <= 0:
            raise ValueError(msg("transaction.amount.positive"))

        # --- règles DEBIT ---
        if transaction_type == TypeTransaction.DEBIT:
            if sous_pot_id is None:
                raise ValueError(msg("transaction.debit.requires_sous_pot"))
            if compte_id is not None:
                raise ValueError(msg("transaction.debit.forbidden_compte"))

            sous_pot = session.get(Sous_Pot, sous_pot_id)
            if not sous_pot:
                raise ValueError(msg("sous_pot.not_found"))

        # --- règles CREDIT ---
        elif transaction_type == TypeTransaction.CREDIT:
            if compte_id is None:
                raise ValueError(msg("transaction.credit.requires_compte"))
            if sous_pot_id is not None:
                raise ValueError(msg("transaction.credit.forbidden_sous_pot"))

            compte = session.get(Compte, compte_id)
            if not compte:
                raise ValueError(msg("compte.not_found"))

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
            compte_id=compte_id,
            sous_pot_id=sous_pot_id,
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
    def list_by_id (session: Session, id :str) -> Transaction:
        query = select(Transaction).where(Transaction.id == id)
        return session.exec(query).one()

    def list_by_compte_and_period(
        session: Session, 
        compte_id: str, 
        date_year: int,
        date_month: int
    ) -> List[Transaction]:
        """
        Retourne toutes les transactions pour un compte donné dans le cycle budgétaire courant,
        triées par date croissante.
        - Transactions CREDIT directes sur le compte
        - Transactions DEBIT via les Sous_Pot du compte
        """
        # Récupérer le compte pour son start_day
        compte = session.get(Compte, compte_id)
        if not compte:
            return []

        period = get_budget_cycle_for_month(year=date_year, month=date_month, start_day= compte.start_day)

        start_date = period["start"]
        end_date = period["end"]

        # Requête unique avec jointures pour inclure DEBIT via Sous_Pot
        stmt = (
            select(Transaction)
            .outerjoin(Sous_Pot, Transaction.sous_pot_id == Sous_Pot.id)
            .outerjoin(Pot, Sous_Pot.pot_id == Pot.id)
            .where(
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                (
                    (Transaction.compte_id == compte_id) |  # CREDIT direct
                    (Pot.compte_id == compte_id)           # DEBIT via SousPot -> Pot -> Compte
                )
            )
            .order_by(Transaction.transaction_date.asc())
        )

        transactions = session.exec(stmt).all()
        return transactions


    @staticmethod
    def list_by_sous_pot(
        session: Session,
        sous_pot_id: str,
    ) -> list[Transaction]:
        query = select(Transaction).where(Transaction.sous_pot_id == sous_pot_id)
        return session.exec(query).all()

    @staticmethod
    def list_by_user_and(
        session: Session,
        user,
        filters: dict | None = None,
    ) -> list[Transaction]:
        user_compte_ids = (
            select(Compte.id)
            .where(Compte.user_id == user.id)
        )

        stmt = (
            select(Transaction)
            .outerjoin(Sous_Pot, Transaction.sous_pot_id == Sous_Pot.id)
            .outerjoin(Pot, Sous_Pot.pot_id == Pot.id)
            .where(
                or_(
                    Transaction.compte_id.in_(user_compte_ids),
                    Pot.compte_id.in_(user_compte_ids),
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
    def list_recurrentes_by_compte(
        session: Session,
        compte_id: str,
    ) -> list[Transaction]:
        query = (
            select(Transaction)
            .outerjoin(Sous_Pot, Transaction.sous_pot_id == Sous_Pot.id)
            .outerjoin(Pot, Sous_Pot.pot_id == Pot.id)
            .where(
                (
                    (Transaction.compte_id == compte_id) |
                    (Pot.compte_id == compte_id)
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

            if payload.sous_pot_id is not None:
                transaction.sous_pot_id = payload.sous_pot_id

            if not transaction.sous_pot_id:
                raise HTTPException(status_code=400, detail="transaction.debit_requires_sous_pot")

            if payload.compte_id is not None:
                raise HTTPException(status_code=400, detail="transaction.debit_forbids_compte")

            transaction.compte_id = None

        elif transaction.transaction_type == TypeTransaction.CREDIT:

            if payload.compte_id is not None:
                transaction.compte_id = payload.compte_id

            if not transaction.compte_id:
                raise HTTPException(status_code=400, detail="transaction.credit_requires_compte")

            if payload.sous_pot_id is not None:
                raise HTTPException(status_code=400, detail="transaction.credit_forbids_sous_pot")

            transaction.sous_pot_id = None

        # ----- Transactions récurrentes -----
        # Rappel règle :
        # Une seule transaction future existe.
        # Modifier = modifie uniquement celle-ci.

        if payload.recurrent is not None:
            transaction.recurrent = payload.recurrent
            transaction.recurrence_type = payload.recurrence_type
            transaction.recurrence_end_date = payload.recurrence_end_date

        session.add(transaction)
        session.commit()
        session.refresh(transaction)

        return transaction

    @staticmethod
    def delete(session: Session, transaction: Transaction) -> None:
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
