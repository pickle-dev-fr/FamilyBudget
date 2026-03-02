from sqlmodel import Session, select
from datetime import date

from app.models import Account, User, Sub_Pot, Pot, Transaction, TypeTransaction
from app.i18n.messages import msg
from sqlalchemy import or_, func

from app.schemas.account_schema import AccountCreate



class AccountService:

    @staticmethod
    def create(session: Session, data: AccountCreate, user: User) -> Account:
        account = Account(
            **data.model_dump(),
            user_id=user.id,
            position=AccountService._get_next_position(session, user.id),
        )
        session.add(account)
        session.flush()

        pot_defaut = Pot(
            name=msg("pot.default"),
            account_id=account.id,
            position=0,
        )
        session.add(pot_defaut)
        session.flush()

        sub_pot_defaut = Sub_Pot(
            name=msg("sub_pot.default"),
            prevision=0.0,
            pot_id=pot_defaut.id,
            position=0,
        )
        session.add(sub_pot_defaut)

        session.commit()
        session.refresh(account)
        return account

    @staticmethod
    def list_by_user(session: Session, user: User) -> list[Account]:
        query = (
            select(Account)
            .where(Account.user_id == user.id)
            .order_by(Account.position)
        )
        return session.exec(query).all()

    @staticmethod
    def get_by_id(
        session: Session,
        account_id: str,
    ) -> Account:
        account = session.get(Account, account_id)
        if not account:
            raise ValueError(msg("account.not_found"))

        return account

    @staticmethod
    def update(
        session: Session,
        *,
        user: User,
        account_id: str,
        data,
    ) -> Account:
        account = AccountService.get_by_id(
            session=session,
            account_id=account_id,
        )

        if data.name is not None:
            account.name = data.name

        if data.initial_value is not None:
            account.initial_value = data.initial_value

        if data.start_day is not None:
            if data.start_day < 1 or data.start_day > 31:
                raise ValueError(msg("account.invalid_start_day"))
            account.start_day = data.start_day

        session.add(account)
        session.commit()
        session.refresh(account)
        return account

    def calculer_balance_account(
        session: Session,
        account: Account,
    ) -> float:
        """
        Calcule la somme des transactions d'un account.
        Inclut :
        - transactions liées directement au account
        - transactions liées aux sub-pots du account
        """

        query = (
            select(Transaction)
            .outerjoin(
                Sub_Pot,
                Transaction.sub_pot_id == Sub_Pot.id,
            )
            .outerjoin(
                Pot,
                Sub_Pot.pot_id == Pot.id,
            )
            .where(
                or_(
                    Transaction.account_id == account.id,
                    Pot.account_id == account.id,
                ),
                (Transaction.transaction_date < date.today())
            )
        )

        transactions = session.exec(query).all()

        total = 0.0
        for t in transactions:
            if t.transaction_type == TypeTransaction.DEBIT:
                total -= t.amount
            else:
                total += t.amount

        total += account.initial_value
        total += account.archived_value
        return total

    @staticmethod
    def _get_next_position(session: Session, user_id: str) -> int:
        stmt = (
            select(func.coalesce(func.max(Account.position), -1) + 1)
            .where(Account.user_id == user_id)
        )
        return session.exec(stmt).one()

    @staticmethod
    def reorder(
        session: Session,
        *,
        user: User,
        ordered_ids: list[str],
    ) -> None:
        accounts = AccountService.list_by_user(session, user)

        account_map = {c.id: c for c in accounts}
        print(account_map)

        if set(ordered_ids) != set(account_map.keys()):
            raise ValueError(msg("account.reorder.invalid_payload"))

        for index, account_id in enumerate(ordered_ids):
            account_map[account_id].position = index

        session.commit()

    @staticmethod
    def delete(session: Session, account_id: str, user_id: str) -> None:
        statement = select(Account).where(
            Account.id == account_id,
            Account.user_id == user_id,
        )
        account = session.exec(statement).first()

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="account not found",
            )

        session.delete(account)
        session.commit()