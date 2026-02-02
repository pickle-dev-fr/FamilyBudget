from sqlmodel import Session, select
from fastapi import HTTPException, status

from app.models import Sous_Pot, Pot
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
        SousPotService._check_prevision(prevision)
        sous_pot = Sous_Pot(
            name=name,
            prevision=prevision,
            pot_id=pot_id,
        )
        session.add(sous_pot)
        session.commit()
        session.refresh(sous_pot)
        return sous_pot

    @staticmethod
    def list_by_pot(session: Session, pot_id: str) -> list[Sous_Pot]:
        query = select(Sous_Pot).where(Sous_Pot.pot_id == pot_id)
        return session.exec(query).all()

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
    def delete(session: Session, sous_pot_id: str) -> None:
        sous_pot = SousPotService.get_by_id(session, sous_pot_id)
        session.delete(sous_pot)
        session.commit()

    @staticmethod
    def _check_prevision(prevision: float) -> None:
        if prevision < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=msg("sous_pot.invalid_prevision"),
            )
