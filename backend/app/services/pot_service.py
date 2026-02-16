from sqlmodel import Session, select, update

from app.models import Pot, Compte, User, Sous_Pot, Transaction
from app.utils import get_default_for_compte
from app.services.sous_pot_service import SousPotService
from app.schemas.reorder_schema import PotReorderPayload
from app.schemas.pot_schema import PotRead
from app.i18n.messages import msg
from fastapi import HTTPException, status
from sqlalchemy import func


class PotService:

    @staticmethod
    def create(session: Session, compte_id: str, name: str) -> Pot:
        compte = session.get(Compte, compte_id)
        if not compte:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg("compte.not_found"),
            )

        pot = Pot(name=name, compte_id=compte_id, position=PotService._get_next_position(session, compte.id))
        session.add(pot)
        session.commit()
        session.refresh(pot)
        return pot

    @staticmethod
    def list_by_compte(
        session: Session,
        compte_id: str,
        include: bool = False,
    ) -> list[PotRead]:

        pots = session.exec(
            select(Pot)
            .where(Pot.compte_id == compte_id)
            .order_by(Pot.position)
        ).all()

        result: list[PotRead] = []

        for pot in pots:

            sous_pots = None

            if include:
                sous_pots = SousPotService.list_by_pot(
                    session,
                    pot.id,
                )

            result.append(
                PotRead(
                    id=pot.id,
                    name=pot.name,
                    compte_id=pot.compte_id,
                    position=pot.position,
                    sous_pots=sous_pots,
                )
            )

        return result


    @staticmethod
    def get_by_id(session: Session, pot_id: str) -> Pot:
        pot = session.get(Pot, pot_id)
        if not pot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg("pot.not_found"),
            )
        return pot

    @staticmethod
    def update(session: Session, pot_id: str, name: str) -> Pot:
        pot = PotService.get_by_id(session, pot_id)
        if pot.position == 0 and any(
            field is not None for field in [data.name]
        ):
            raise ValueError(msg("pot.default.update_forbidden"))
        pot.name = name
        session.add(pot)
        session.commit()
        session.refresh(pot)
        return pot

    @staticmethod
    def delete(session: Session, pot_id: str):
        pot = PotService.get_by_id(session, pot_id)

        # Pot par défaut : non supprimable
        if pot.position == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=msg("pot.default.delete_forbidden"),
            )

        # Sous-pot par défaut du compte
        default_sous_pot = get_default_for_compte(
            session,
            pot.compte_id,
        )
        # Re-rattachement des transactions
        session.exec(
            update(Transaction)
            .where(
                Transaction.sous_pot_id.in_(
                    select(Sous_Pot.id).where(Sous_Pot.pot_id == pot.id)
                )
            )
            .values(sous_pot_id=default_sous_pot["sous_pot_id"])
        )

        # Suppression explicite des sous-pots
        for sous_pot in pot.sous_pots:
            session.delete(sous_pot)

        session.delete(pot)
        session.commit()


    @staticmethod
    def _get_next_position(session: Session, compte_id: str) -> int:
        stmt = (
            select(func.coalesce(func.max(Pot.position), 0) + 1)
            .where(Pot.compte_id == compte_id)
        )
        return session.exec(stmt).one()

    @staticmethod
    def reorder(
        session: Session,
        user,
        payload: PotReorderPayload,
    ) -> None:

        default = PotService.get_default_for_compte(
            session,
            payload.compte_id,
        )

        if not default["pot_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("pot.default.not_found"),
            )

        if payload.ordered_ids[0] != default["pot_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("pot.default.must_be_first"),
            )

        seen = set()

        for position, pot_id in enumerate(payload.ordered_ids):

            if pot_id in seen:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=msg("pot.duplicate"),
                )
            seen.add(pot_id)

            pot = session.get(Pot, pot_id)
            if not pot:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=msg("pot.not_found"),
                )

            if position == 0:
                continue  # pot défaut

            pot.position = position
            session.add(pot)

        session.commit()

