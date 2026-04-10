from sqlmodel import Session, select

from app.models import User, UserSettings, Currency, Language, Theme
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

    ## Change password
    def changePassword(username: str, password: str, session: Session):
        user = session.exec(
            select(User).where(User.username == username)
        ).first()

        user.hashed_password = hash_password(password)

        session.add(user)
        session.commit()
        session.refresh(user)

    ## Delete user
    @staticmethod
    def delete_user(session: Session, user: User) -> None:
        session.delete(user)
        session.commit()

    ## Settings
    @staticmethod
    def get_settings(session: Session, user: User) -> UserSettings:
        settings = session.exec(
            select(UserSettings).where(UserSettings.user_id == user.id)
        ).first()
        if not settings:
            settings = UserSettings(user_id=user.id)
            session.add(settings)
            session.commit()
            session.refresh(settings)
        return settings

    @staticmethod
    def update_settings(session: Session, user: User, currency: Currency | None = None, language: Language | None = None, theme: Theme | None = None) -> UserSettings:
        settings = AuthService.get_settings(session, user)
        if currency is not None:
            settings.currency = currency
        if language is not None:
            settings.language = language
        if theme is not None:
            settings.theme = theme
        session.add(settings)
        session.commit()
        session.refresh(settings)
        return settings
