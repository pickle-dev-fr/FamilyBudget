from sqlmodel import Session, select

from app.models import Pot, Compte, User, Sous_Pot
from app.services.sous_pot_service import SousPotService
from app.schemas.reorder_schema import PotReorderPayload
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

    @staticmethod
    def reorder(
        *,
        session: Session,
        user,
        payload: PotReorderPayload,
    ) -> None:

        # --- récupération pot défaut + sous-pot défaut ---
        pot_defaut = session.exec(
            select(Pot)
            .where(
                Pot.compte_id.in_(
                    select(Pot.compte_id)
                    .where(Pot.id == payload.pots[0].id)
                ),
                Pot.name == msg("pot.default.name"),
            )
        ).one_or_none()

        if not pot_defaut:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("pot.default.not_found"),
            )

        sous_pot_defaut = session.exec(
            select(Sous_Pot)
            .where(
                Sous_Pot.pot_id == pot_defaut.id,
                Sous_Pot.name == msg("sous_pot.default.name"),
            )
        ).one()

        # --- validations structure ---
        first = payload.pots[0]

        if first.id != pot_defaut.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("pot.default.must_be_first"),
            )

        if first.sous_pots != [{"id": sous_pot_defaut.id}]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg("sous_pot.default.invalid_position"),
            )

        seen_pots = set()
        seen_sous_pots = set()

        # --- transaction SQL ---
        with session.begin():

            # pots utilisateurs
            for pot_position, pot_data in enumerate(payload.pots):

                if pot_data.id in seen_pots:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=msg("pot.duplicate"),
                    )
                seen_pots.add(pot_data.id)

                pot = session.get(Pot, pot_data.id)
                if not pot:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=msg("pot.not_found"),
                    )

                # pot défaut → déjà OK
                if pot_position == 0:
                    continue

                pot.position = pot_position
                session.add(pot)

                # sous-pots utilisateurs
                sous_position = 1
                for sp in pot_data.sous_pots:

                    if sp.id == sous_pot_defaut.id:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=msg("sous_pot.default.forbidden_move"),
                        )

                    if sp.id in seen_sous_pots:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=msg("sous_pot.duplicate"),
                        )

                    seen_sous_pots.add(sp.id)

                    sous_pot = session.get(Sous_Pot, sp.id)
                    if not sous_pot:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=msg("sous_pot.not_found"),
                        )

                    sous_pot.pot_id = pot.id
                    sous_pot.position = sous_position
                    sous_position += 1

                    session.add(sous_pot)
