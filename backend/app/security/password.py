import os
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
PEPPER = os.getenv("PASSWORD_PEPPER", "")


def hash_password(password: str) -> str:
    return pwd_context.hash(password + PEPPER)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password + PEPPER, hashed_password)
