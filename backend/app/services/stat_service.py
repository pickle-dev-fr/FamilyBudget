from sqlmodel import Session, select

from app.models import Compte, User
from app.services.compte_service import CompteService


class StatService:

    @staticmethod
    def get_total_balance_by_user_id(
        session: Session,
        user: User,
    ) -> float:
        total = 0.0

        comptes = CompteService.list_by_user(session, user)
        for compte in comptes:
            total += CompteService.calculer_solde_compte(session, compte)

        return total
