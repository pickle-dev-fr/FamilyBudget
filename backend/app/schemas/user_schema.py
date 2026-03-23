from typing import Optional
from sqlmodel import SQLModel


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
