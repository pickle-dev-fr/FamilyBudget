from sqlmodel import Session, select, update
from sqlalchemy import and_, func, or_, distinct, text
from fastapi import HTTPException, status
from datetime import date


from app.models import Sub_Pot, Transaction, TypeTransaction, Pot, Account
from app.utils.utils import get_default_for_account
from app.utils.budget_cycle import get_budget_cycle_for_date
from app.schemas.sub_pot_schema import SousPotRead
from app.schemas.reorder_schema import SousPotReorderPayload
from app.i18n.messages import msg


class SousPotService:

    @staticmethod
    def create(session: Session, pot_id: str, name: str, prevision: float) -> Sub_Pot:
        pot = session.get(Pot, pot_id)
        if not pot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg("pot.not_found"),
            )
        
        if pot.position == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("sub_pot.create.forbidden_on_default_pot"),
            )

        SousPotService._check_prevision(prevision)

        position = SousPotService._get_next_position(session, pot_id)

        sub_pot = Sub_Pot(
            name=name,
            prevision=prevision,
            pot_id=pot_id,
            position=position,  # toujours >= 1
        )

        session.add(sub_pot)
        session.commit()
        session.refresh(sub_pot)
        return sub_pot


    @staticmethod
    def list_by_pot(session: Session, pot_id: str, ref_date: date | None = None) -> list[SousPotRead]:
        sub_pots = session.exec(
            select(Sub_Pot).where(Sub_Pot.pot_id == pot_id).order_by(Sub_Pot.position)
        ).all()

        result: list[SousPotRead] = []

        for sp in sub_pots:
            current = SousPotService.calculer_current_mois(session, sp, ref_date=ref_date)

            result.append(
                SousPotRead(
                    id=sp.id,
                    name=sp.name,
                    pot_id=sp.pot_id,
                    prevision=sp.prevision,
                    position=sp.position,
                    current=current,
                )
            )

        return result

    @staticmethod
    def get_by_id(session: Session, sub_pot_id: str) -> Sub_Pot:
        sub_pot = session.get(Sub_Pot, sub_pot_id)
        if not sub_pot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg("sub_pot.not_found"),
            )
        return sub_pot

    @staticmethod
    def get_by_account(session: Session, account_id: str) -> Sub_Pot:
        query = (
            select(Sub_Pot)
            .join(Pot, Sub_Pot.pot_id == Pot.id)
            .where(Pot.account_id == account_id)
        )

        return session.exec(query).all()

    @staticmethod
    def update(
        session: Session,
        sub_pot_id: str,
        name: str,
        prevision: float,
    ) -> Sub_Pot:
        SousPotService._check_prevision(prevision)
        sub_pot = SousPotService.get_by_id(session, sub_pot_id)
        sub_pot.name = name
        sub_pot.prevision = prevision
        session.add(sub_pot)
        session.commit()
        session.refresh(sub_pot)
        return sub_pot

    @staticmethod
    def delete(session: Session, sub_pot_id: str):
        sub_pot = session.get(Sub_Pot, sub_pot_id)

        if not sub_pot:
            raise ValueError(msg("sub_pot.not_found"))

        if sub_pot.position == 0:
            raise ValueError(msg("sub_pot.default.delete_forbidden"))

        # Re-rattacher les transactions au sub-pot défaut du account
        default_sp = get_default_for_account(
            session,
            sub_pot.pot.account_id,
        )

        session.exec(
            update(Transaction)
            .where(Transaction.sub_pot_id == sub_pot.id)
            .values(sub_pot_id=default_sp["sub_pot_id"])
        )

        session.delete(sub_pot)
        session.commit()

    @staticmethod
    def _check_prevision(prevision: float) -> None:
        if prevision < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=msg("sub_pot.invalid_prevision"),
            )

    @staticmethod
    def calculer_current_mois(
        session: Session,
        sub_pot: Sub_Pot,
        ref_date: date | None = None,
    ) -> float:
        """
        Calcule le balance courant du sub-pot sur la période définie par le account.
        Si ref_date est fourni, utilise le cycle de ce mois-là.
        """

        # 1️⃣ Récupération du pot
        pot = session.get(Pot, sub_pot.pot_id)

        # 2️⃣ Récupération du account
        account = session.get(Account, pot.account_id)

        # 3️⃣ Calcul de la période
        target = ref_date or date.today()
        period = get_budget_cycle_for_date(target, account.start_day)
        start_date = period["start"]
        end_date = period["end"]

        # 4️⃣ Récupération des transactions du sub-pot sur la période
        query = (
            select(Transaction)
            .where(
                and_(
                    Transaction.sub_pot_id == sub_pot.id,
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
            select(func.coalesce(func.max(Sub_Pot.position), 0) + 1)
            .where(Sub_Pot.pot_id == pot_id)
        )
        return session.exec(stmt).one()

    @staticmethod
    def reorder(
        session: Session,
        account_id: str,
        payload: SousPotReorderPayload,
    ) -> None:

        ancien_id = payload.ancien_pot.pot_id
        nouveau_id = payload.nouveau_pot.pot_id

        # --------------------------------------------------
        # Vérification des pots et sub_pots
        # --------------------------------------------------

        ancien_id = payload.ancien_pot.pot_id
        nouveau_id = payload.nouveau_pot.pot_id

        all_sub_pot_ids = (
            payload.ancien_pot.sub_pot_ids
            + payload.nouveau_pot.sub_pot_ids
        )

        pot_count = session.exec(
            select(func.count())
            .select_from(Pot)
            .where(
                Pot.account_id == account_id,
                Pot.id.in_([ancien_id, nouveau_id]),
            )
        ).one()

        if (ancien_id == nouveau_id and pot_count != 1) or (ancien_id != nouveau_id and pot_count != 2):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("pot.missing_or_invalid"),
            )

        unique_ids = set(all_sub_pot_ids)

        sp_count = session.exec(
            select(func.count())
            .select_from(Sub_Pot)
            .join(Pot)
            .where(
                Sub_Pot.id.in_(unique_ids),
                Pot.account_id == account_id,
            )
        ).one()

        if sp_count != len(unique_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("sub_pot.missing_or_invalid"),
            )


        # --------------------------------------------------
        # Récupération des défauts (position == 0)
        # --------------------------------------------------

        default_sub_pot = session.exec(
            select(Sub_Pot)
            .join(Pot)
            .where(
                Pot.account_id == account_id,
                Pot.position == 0,
                Sub_Pot.position == 0,
            )
        ).one()


        if not default_sub_pot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("pot.default.not_found"),
            )

        default_pot_id = default_sub_pot.pot_id
        default_sub_pot_id = default_sub_pot.id

        # --------------------------------------------------
        # Refus immédiat si défaut dans payload
        # --------------------------------------------------

        if (
            ancien_id == default_pot_id
            or nouveau_id == default_pot_id
            or default_sub_pot_id in payload.ancien_pot.sub_pot_ids
            or default_sub_pot_id in payload.nouveau_pot.sub_pot_ids
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("sub_pot.default.forbidden_move"),
            )

        # --------------------------------------------------
        # traitement ancien pot (seulement si ancien != nouveau)
        # --------------------------------------------------

        if (nouveau_id != ancien_id):
            query = text("""
                UPDATE sub_pot sp
                SET position = new_order.pos,
                    pot_id = :pot_id
                FROM (
                    SELECT id, ordinality AS pos
                    FROM unnest(:ordered_ids) WITH ORDINALITY AS t(id, ordinality)
                ) AS new_order
                JOIN pot p ON p.id = :pot_id
                WHERE sp.id = new_order.id
                AND p.account_id = :account_id
            """)

            session.execute(
                query,
                {
                    "ordered_ids": payload.ancien_pot.sub_pot_ids,
                    "pot_id":ancien_id,
                    "account_id": account_id,
                },
            )
            
        # --------------------------------------------------
        # Traitement nouveau pot
        # --------------------------------------------------

        query = text("""
            UPDATE sub_pot sp
            SET position = new_order.pos,
                pot_id = :pot_id
            FROM (
                SELECT id, ordinality AS pos
                FROM unnest(:ordered_ids) WITH ORDINALITY AS t(id, ordinality)
            ) AS new_order
            JOIN pot p ON p.id = :pot_id
            WHERE sp.id = new_order.id
            AND p.account_id = :account_id
        """)

        session.execute(
            query,
            {
                "ordered_ids": payload.nouveau_pot.sub_pot_ids,
                "pot_id":nouveau_id,
                "account_id": account_id,
            },
        )
        
        session.commit()
