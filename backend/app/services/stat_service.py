from sqlmodel import Session, select

from app.models import Account, User
from app.services.account_service import AccountService


class StatService:

    @staticmethod
    def get_total_balance_by_user_id(
        session: Session,
        user: User,
    ) -> float:
        total = 0.0

        accounts = AccountService.list_by_user(session, user)
        for account in accounts:
            total += AccountService.calculer_balance_account(session, account)

        return total
