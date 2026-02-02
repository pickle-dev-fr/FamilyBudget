from sqlmodel import Session, select

from app.models import Pot, Compte
from app.i18n.messages import msg
from fastapi import HTTPException, status


class PotService:

    @staticmethod
    def create(session: Session, compte_id: str, name: str) -> Pot:
        compte = session.get(Compte, compte_id)
        if not compte:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg("compte.not_found"),
            )

        pot = Pot(name=name, compte_id=compte_id)
        session.add(pot)
        session.commit()
        session.refresh(pot)
        return pot

    @staticmethod
    def list_by_compte(session: Session, compte_id: str) -> list[Pot]:
        query = select(Pot).where(Pot.compte_id == compte_id)
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
        pot.name = name
        session.add(pot)
        session.commit()
        session.refresh(pot)
        return pot

    @staticmethod
    def delete(session: Session, pot_id: str) -> None:
        pot = PotService.get_by_id(session, pot_id)
        session.delete(pot)
        session.commit()
