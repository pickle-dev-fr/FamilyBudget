from sqlmodel import Session, select

from app.models import Compte, User, Sous_Pot, Pot, Transaction, TypeTransaction
from app.i18n.messages import msg
from sqlalchemy import or_, func

from app.schemas.compte_schema import CompteCreate



class CompteService:

    @staticmethod
    def create(session: Session, data: CompteCreate, user: User) -> Compte:
        compte = Compte(
            **data.model_dump(),
            user_id=user.id,
            position=CompteService._get_next_position(session, user.id),
        )
        session.add(compte)
        session.flush()

        pot_defaut = Pot(
            name=msg("pot.default"),
            compte_id=compte.id,
            position=0,
        )
        session.add(pot_defaut)
        session.flush()

        sous_pot_defaut = Sous_Pot(
            name=msg("sous_pot.default"),
            prevision=0.0,
            pot_id=pot_defaut.id,
            position=0,
        )
        session.add(sous_pot_defaut)

        session.commit()
        session.refresh(compte)
        return compte

    @staticmethod
    def list_by_user(session: Session, user: User) -> list[Compte]:
        query = (
            select(Compte)
            .where(Compte.user_id == user.id)
            .order_by(Compte.position)
        )
        return session.exec(query).all()

    @staticmethod
    def get_by_id(
        session: Session,
        *,
        user: User,
        compte_id: str,
    ) -> Compte:
        compte = session.get(Compte, compte_id)
        if not compte:
            raise ValueError(msg("compte.not_found"))

        if compte.user_id != user.id:
            raise ValueError(msg("compte.forbidden"))

        return compte

    @staticmethod
    def update(
        session: Session,
        *,
        user: User,
        compte_id: str,
        data,
    ) -> Compte:
        compte = CompteService.get_by_id(
            session=session,
            user=user,
            compte_id=compte_id,
        )

        if data.name is not None:
            compte.name = data.name

        if data.initial_value is not None:
            compte.initial_value = data.initial_value

        if data.start_day is not None:
            if data.start_day < 1 or data.start_day > 31:
                raise ValueError(msg("compte.invalid_start_day"))
            compte.start_day = data.start_day

        session.add(compte)
        session.commit()
        session.refresh(compte)
        return compte

    def calculer_solde_compte(
        session: Session,
        compte: Compte,
    ) -> float:
        """
        Calcule la somme des transactions d'un compte.
        Inclut :
        - transactions liées directement au compte
        - transactions liées aux sous-pots du compte
        """

        query = (
            select(Transaction)
            .outerjoin(
                Sous_Pot,
                Transaction.sous_pot_id == Sous_Pot.id,
            )
            .outerjoin(
                Pot,
                Sous_Pot.pot_id == Pot.id,
            )
            .where(
                or_(
                    Transaction.compte_id == compte.id,
                    Pot.compte_id == compte.id,
                )
            )
        )

        transactions = session.exec(query).all()

        total = 0.0
        for t in transactions:
            if t.transaction_type == TypeTransaction.DEBIT:
                total -= t.amount
            else:
                total += t.amount

        total += compte.initial_value
        total += compte.archived_value
        return total

    @staticmethod
    def _get_next_position(session: Session, user_id: str) -> int:
        stmt = (
            select(func.coalesce(func.max(Compte.position), -1) + 1)
            .where(Compte.user_id == user_id)
        )
        return session.exec(stmt).one()

    @staticmethod
    def reorder(
        session: Session,
        *,
        user: User,
        ordered_ids: list[str],
    ) -> None:
        comptes = CompteService.list_by_user(session, user)

        compte_map = {c.id: c for c in comptes}
        print(compte_map)

        if set(ordered_ids) != set(compte_map.keys()):
            raise ValueError(msg("compte.reorder.invalid_payload"))

        for index, compte_id in enumerate(ordered_ids):
            compte_map[compte_id].position = index

        session.commit()

    @staticmethod
    def delete(session: Session, compte_id: str, user_id: str) -> None:
        statement = select(Compte).where(
            Compte.id == compte_id,
            Compte.user_id == user_id,
        )
        compte = session.exec(statement).first()

        if not compte:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Compte not found",
            )

        session.delete(compte)
        session.commit()