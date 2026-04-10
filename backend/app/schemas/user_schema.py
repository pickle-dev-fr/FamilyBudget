from typing import Optional
from sqlmodel import SQLModel
from app.models import Currency


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

class UserSettingsUpdate(SQLModel):
    currency: Currency
