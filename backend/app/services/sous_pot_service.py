from sqlmodel import Session, select
from sqlalchemy import and_, func
from fastapi import HTTPException, status
from datetime import date


from app.models import Sous_Pot, Transaction, TypeTransaction, Pot, Compte
from app.utils import get_period_start, get_period_end
from app.schemas.sous_pot_schema import SousPotRead
from app.i18n.messages import msg


class SousPotService:

    @staticmethod
    def create(session: Session, pot_id: str, name: str, prevision: float) -> Sous_Pot:
        pot = session.get(Pot, pot_id)
        if not pot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg("pot.not_found"),
            )
        
        if pot.position == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("sous_pot.create.forbidden_on_default_pot"),
            )

        SousPotService._check_prevision(prevision)

        position = SousPotService._get_next_position(session, pot_id)

        sous_pot = Sous_Pot(
            name=name,
            prevision=prevision,
            pot_id=pot_id,
            position=position,  # toujours >= 1
        )

        session.add(sous_pot)
        session.commit()
        session.refresh(sous_pot)
        return sous_pot


    @staticmethod
    def list_by_pot(session: Session, pot_id: str) -> list[SousPotRead]:
        sous_pots = session.exec(
            select(Sous_Pot).where(Sous_Pot.pot_id == pot_id).order_by(Sous_Pot.position)
        ).all()

        result: list[SousPotRead] = []

        for sp in sous_pots:
            current = SousPotService.calculer_current_mois(session, sp)

            result.append(
                SousPotRead(
                    id=sp.id,
                    name=sp.name,
                    pot_id=sp.pot_id,
                    prevision=sp.prevision,
                    current=current,
                )
            )

        return result

    @staticmethod
    def get_by_id(session: Session, sous_pot_id: str) -> Sous_Pot:
        sous_pot = session.get(Sous_Pot, sous_pot_id)
        if not sous_pot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg("sous_pot.not_found"),
            )
        return sous_pot

    @staticmethod
    def update(
        session: Session,
        sous_pot_id: str,
        name: str,
        prevision: float,
    ) -> Sous_Pot:
        SousPotService._check_prevision(prevision)
        sous_pot = SousPotService.get_by_id(session, sous_pot_id)
        sous_pot.name = name
        sous_pot.prevision = prevision
        session.add(sous_pot)
        session.commit()
        session.refresh(sous_pot)
        return sous_pot

    @staticmethod
    def delete(session: Session, sous_pot_id: str):
        sous_pot = session.get(Sous_Pot, sous_pot_id)

        if not sous_pot:
            raise ValueError(msg("sous_pot.not_found"))

        if sous_pot.position == 0:
            raise ValueError(msg("sous_pot.default.delete_forbidden"))

        # Re-rattacher les transactions au sous-pot défaut du compte
        default_sp = SousPotService.get_default_for_compte(
            session,
            sous_pot.pot.compte_id,
        )

        session.exec(
            update(Transaction)
            .where(Transaction.sous_pot_id == sous_pot.id)
            .values(sous_pot_id=default_sp["sous_pot_id"])
        )

        session.delete(sous_pot)
        session.commit()

    @staticmethod
    def _check_prevision(prevision: float) -> None:
        if prevision < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=msg("sous_pot.invalid_prevision"),
            )

    @staticmethod
    def calculer_current_mois(
        session: Session,
        sous_pot: Sous_Pot,
    ) -> float:
        """
        Calcule le solde courant du sous-pot sur la période définie par le compte.
        """

        # 1️⃣ Récupération du pot
        pot = session.get(Pot, sous_pot.pot_id)

        # 2️⃣ Récupération du compte
        compte = session.get(Compte, pot.compte_id)

        # 3️⃣ Calcul de la période
        start_date = get_period_start(date.today(), compte.start_day)
        end_date = get_period_end(start_date)

        # 4️⃣ Récupération des transactions du sous-pot sur la période
        query = (
            select(Transaction)
            .where(
                and_(
                    Transaction.sous_pot_id == sous_pot.id,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date <= end_date,
                )
            )
        )

        transactions = session.exec(query).all()

        # 5️⃣ Calcul du total
        total = 0.0
        for t in transactions:
            if t.transaction_type == TypeTransaction.DEBIT:
                total += t.amount
            else:
                total -= t.amount

        return total

    @staticmethod
    def _get_next_position(session: Session, pot_id: str) -> int:
        stmt = (
            select(func.coalesce(func.max(Sous_Pot.position), 0) + 1)
            .where(Sous_Pot.pot_id == pot_id)
        )
        return session.exec(stmt).one()

    @staticmethod
    def reorder(
        session: Session,
        pot_id: str,
        ordered_ids: list[str],
    ) -> None:
        pot = session.get(Pot, pot_id)
        if not pot:
            raise ValueError(msg("pot.not_found"))

        # 🔒 Pot défaut : aucun reorder possible
        if pot.position == 0:
            raise ValueError(msg("sous_pot.reorder.forbidden_on_default_pot"))

        sous_pots = session.exec(
            select(Sous_Pot).where(Sous_Pot.pot_id == pot_id)
        ).all()

        sp_map = {sp.id: sp for sp in sous_pots}

        if set(ordered_ids) != set(sp_map.keys()):
            raise ValueError(msg("sous_pot.reorder.invalid_payload"))

        for index, sp_id in enumerate(ordered_ids, start=1):
            sp_map[sp_id].position = index

        session.commit()

