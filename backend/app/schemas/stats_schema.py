from pydantic import BaseModel


class BalancePoint(BaseModel):
    year: int
    month: int
    balance: float


class MonthlySummaryPoint(BaseModel):
    year: int
    month: int
    income: float
    expenses: float
    delta: float


class PotAmount(BaseModel):
    pot: str
    amount: float


class SubPotAmount(BaseModel):
    pot: str
    sub_pot: str
    amount: float


class HeatmapPoint(BaseModel):
    date: str
    amount: float
    count: int


class DailyBalancePoint(BaseModel):
    date: str
    balance: float
    is_future: bool = False


class TransactionStat(BaseModel):
    date: str
    amount: float
    motif: str | None
    sub_pot: str
    pot: str
    transaction_type: str
    is_planned: bool = False


class SubPotSnapshotPoint(BaseModel):
    sub_pot_id: str
    sub_pot: str
    pot: str
    year: int
    month: int
    prevision: float
    current: float
    remaining: float
