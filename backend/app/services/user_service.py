from sqlmodel import Session, select

from app.models import User


class UserService:

    @staticmethod
    def get_by_id(session: Session, user_id: str) -> User | None:
        return session.get(User, user_id)

    @staticmethod
    def list_all(session: Session) -> list[User]:
        return session.exec(select(User)).all()
