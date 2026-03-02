from typing import Optional
from sqlmodel import SQLModel


class UtilsPeriod(SQLModel):
    year: int
    month: int
