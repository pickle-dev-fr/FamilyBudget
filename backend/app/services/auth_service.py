from sqlmodel import Session, select

from app.models import User
from app.security.password import hash_password, verify_password


class AuthService:

    ## REGISTER
    @staticmethod
    def create_user(
        session: Session,
        *,
        username: str,
        password: str,
    ) -> User:
        existing = session.exec(
            select(User).where(User.username == username)
        ).first()

        if existing:
            raise ValueError("user.username.exists")

        user = User(
            username=username,
            hashed_password=hash_password(password),
        )

        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    ## LOGIN
    @staticmethod
    def authenticate(
        session: Session,
        *,
        username: str,
        password: str,
    ) -> User | None:
        user = session.exec(
            select(User).where(User.username == username)
        ).first()

        if not user:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user
