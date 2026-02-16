from datetime import date
from sqlmodel import Session, select
from sqlalchemy import or_
from typing import List


from app.models import (
    Transaction,
    Compte,
    Pot,
    Sous_Pot,
    TypeTransaction,
)
from app.utils import get_period_start, get_period_end
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
        )

        session.add(transaction)
        session.commit()
        session.refresh(transaction)
        return transaction

    @staticmethod
    def list_by_id (session: Session, id :str) -> list[Transaction]:
        query = select(Transaction).where(Transaction.id == id)
        return session.exec(query).one()

    def list_by_compte_and_date(session: Session, compte_id: str, date: date) -> List[Transaction]:
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

        start_date = get_period_start(date, compte.start_day)
        end_date = get_period_end(start_date)

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
    def delete(session: Session, transaction_id: str) -> None:
        transaction_id = TransactionService.get_by_id(session, transaction_id)
        session.delete(sous_pot)
        session.commit()
