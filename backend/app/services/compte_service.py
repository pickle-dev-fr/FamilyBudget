from sqlmodel import Session, select

from app.models import Compte, User
from app.i18n.messages import msg


class CompteService:

    @staticmethod
    def create(
        session: Session,
        *,
        user: User,
        name: str,
        initial_value: float,
        start_day: int,
    ) -> Compte:
        if not name:
            raise ValueError(msg("compte.name_required"))

        if start_day < 1 or start_day > 31:
            raise ValueError(msg("compte.invalid_start_day"))

        compte = Compte(
            name=name,
            initial_value=initial_value,
            start_day=start_day,
            user_id=user.id,
        )

        session.add(compte)
        session.commit()
        session.refresh(compte)
        return compte

    @staticmethod
    def list_by_user(session: Session, user: User) -> list[Compte]:
        query = select(Compte).where(Compte.user_id == user.id)
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
