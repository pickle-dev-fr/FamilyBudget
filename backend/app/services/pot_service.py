from sqlmodel import Session, select

from app.models import Pot, Compte, User, Sous_Pot
from app.services.sous_pot_service import SousPotService
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
    ) -> list[Pot]:
        query = (
            select(Pot)
            .where(Pot.compte_id == compte_id)
            .order_by(Pot.position)
        )
        return session.exec(query).all()

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
            raise ValueError(msg("pot.default.delete_forbidden"))

        # Sous-pot par défaut du compte
        default_sous_pot = SousPotService.get_default_for_compte(
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
            .values(sous_pot_id=default_sous_pot.id)
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
        *,
        user: User,
        compte_id: str,
        ordered_ids: list[str],
    ) -> None:
        compte = session.get(Compte, compte_id)
        if not compte:
            raise ValueError(msg("compte.not_found"))

        if compte.user_id != user.id:
            raise ValueError(msg("compte.forbidden"))

        pots = session.exec(
            select(Pot).where(Pot.compte_id == compte_id)
        ).all()

        pot_map = {p.id: p for p in pots}

        if set(ordered_ids) != set(pot_map.keys()):
            raise ValueError(msg("pot.reorder.invalid_payload"))

        # Pot par défaut
        default_pot = next(
            (p for p in pots if p.position == 0),
            None,
        )

        if not default_pot:
            raise ValueError(msg("pot.default.missing"))

        if ordered_ids[0] != default_pot.id:
            raise ValueError(msg("pot.default.not_movable"))

        for index, pot_id in enumerate(ordered_ids):
            pot_map[pot_id].position = index

        session.commit()

    @staticmethod
    def get_default_for_compte(session: Session, compte_id: str) -> dict[str, str]:
        sous_pot = session.exec(
            select(Sous_Pot)
            .join(Pot)
            .where(
                Pot.compte_id == compte_id,
                Pot.position == 0,
                Sous_Pot.position == 0,
            )
        ).one()

        return {
            "pot_id": sous_pot.pot_id,
            "sous_pot_id": sous_pot.id,
        }