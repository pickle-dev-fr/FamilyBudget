from typing import Optional
from sqlmodel import SQLModel


class UtilsPeriode(SQLModel):
    year: int
    month: int
