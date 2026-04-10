from typing import Optional
from sqlmodel import SQLModel
from app.models import Currency, Language, Theme


class UserCreate(SQLModel):
    username: str
    password: str


class UserRead(SQLModel):
    id: str
    username: str


class UserLogin(SQLModel):
    username: str
    password: str


class TokenRead(SQLModel):
    access_token: str
    token_type: str = "bearer"

class UserChange(SQLModel):
    access_token: str
    password: str

class UserSettingsRead(SQLModel):
    currency: Currency
    language: Language
    theme: Theme

class UserSettingsUpdate(SQLModel):
    currency: Optional[Currency] = None
    language: Optional[Language] = None
    theme: Optional[Theme] = None
