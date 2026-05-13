from datetime import date, timedelta
from calendar import monthrange
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Transaction, TypeRecurrence


def process_recurrences(session: Session) -> None:
    """
    Traite toutes les transactions récurrentes échues.

    Pour chaque transaction dont la date est <= aujourd'hui et non encore traitée :
    marque la transaction courante comme traitée et crée l'occurrence suivante,
    sauf si la date suivante dépasse la date de fin de récurrence.

    Les paires de virements (transactions liées via linked_transaction_id) sont
    traitées ensemble pour conserver leur lien sur les occurrences suivantes.
    """
    today = date.today()

    with session.begin():
        transactions = get_due_recurrent_transactions(session, today)
        already_processed: set[str] = set()

        for tx in transactions:
            if tx.id in already_processed:
                continue

            next_date = compute_next_date(tx)
            tx.is_processed = True
            past_end = bool(tx.recurrence_end_date and next_date > tx.recurrence_end_date)

            if tx.linked_transaction_id:
                linked = session.get(Transaction, tx.linked_transaction_id)
                if linked and not linked.is_processed:
                    linked.is_processed = True
                    already_processed.add(linked.id)

                    if not past_end:
                        linked_next_date = compute_next_date(linked)
                        new_tx = _build_next_tx(tx, next_date)
                        new_linked = _build_next_tx(linked, linked_next_date)
                        # Rétablir le lien entre les deux nouvelles occurrences
                        new_tx.linked_transaction_id = new_linked.id
                        new_linked.linked_transaction_id = new_tx.id
                        session.add(new_tx)
                        session.add(new_linked)
                elif not past_end:
                    session.add(_build_next_tx(tx, next_date))
            elif not past_end:
                session.add(_build_next_tx(tx, next_date))


def _build_next_tx(tx: Transaction, next_date: date) -> Transaction:
    """
    Construit la prochaine occurrence d'une transaction récurrente.

    @param tx - La transaction récurrente source
    @param next_date - La date calculée pour l'occurrence suivante
    @returns Une nouvelle Transaction non traitée avec les mêmes paramètres de récurrence
    """
    return Transaction(
        amount=tx.amount,
        transaction_type=tx.transaction_type,
        transaction_date=next_date,
        motif=tx.motif,
        account_id=tx.account_id,
        sub_pot_id=tx.sub_pot_id,
        recurrence_type=tx.recurrence_type,
        recurrence_end_date=tx.recurrence_end_date,
        recurrence_day=tx.recurrence_day,
        is_processed=False,
        recurrent=True,
    )


def get_due_recurrent_transactions(session: Session, today: date) -> list[Transaction]:
    """
    Retourne toutes les transactions récurrentes non traitées dont la date est échue.

    @param session - Session SQLAlchemy active
    @param today - Date de référence pour le traitement
    @returns Liste des transactions à traiter, triées par date croissante
    """
    return session.execute(
        select(Transaction).where(
            Transaction.recurrent.is_(True),
            Transaction.recurrence_type.is_not(None),
            Transaction.transaction_date <= today,
            Transaction.is_processed.is_(False)
        )
    ).scalars().all()


def compute_next_date(tx: Transaction) -> date:
    """
    Calcule la date de la prochaine occurrence d'une transaction récurrente.

    Pour les récurrences mensuelles, utilise recurrence_day pour ancrer le
    jour cible et gère les mois courts (ex: 31 → 28 en février).

    @param tx - La transaction récurrente source
    @returns La date de la prochaine occurrence
    @throws ValueError Si le type de récurrence est invalide ou absent
    """
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

    raise ValueError(f"Invalid recurrence_type: {tx.recurrence_type}")
