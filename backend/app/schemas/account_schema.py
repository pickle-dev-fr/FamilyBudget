from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel
from pydantic import field_validator
from app.models import AccountType, InterestFrequency, AssetType


class TickerSearchResult(SQLModel):
    ticker: str
    name: str
    asset_type: str


class InvestmentAssetCreate(SQLModel):
    ticker: str
    name: str
    asset_type: AssetType
    quantity: float

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La quantité doit être strictement positive.")
        return v


class InvestmentAssetUpdate(SQLModel):
    ticker: Optional[str] = None
    name: Optional[str] = None
    asset_type: Optional[AssetType] = None
    quantity: Optional[float] = None

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("La quantité doit être strictement positive.")
        return v


class InvestmentAssetRead(SQLModel):
    id: str
    ticker: str
    name: str
    asset_type: AssetType
    quantity: float
    current_price: float
    last_price_update: Optional[datetime]
    account_id: str


class AccountCreate(SQLModel):
    name: str
    initial_value: float = 0.0
    start_day: int = 1
    account_type: AccountType = AccountType.NORMAL
    savings_goal: Optional[float] = None
    interest_rate: Optional[float] = None
    interest_frequency: Optional[InterestFrequency] = None


class AccountUpdate(SQLModel):
    name: Optional[str] = None
    initial_value: Optional[float] = None
    start_day: Optional[int] = None
    savings_goal: Optional[float] = None
    interest_rate: Optional[float] = None
    interest_frequency: Optional[InterestFrequency] = None


class AccountRead(SQLModel):
    id: str
    name: str
    initial_value: float
    start_day: int
    account_type: AccountType
    savings_goal: Optional[float] = None
    interest_rate: Optional[float] = None
    interest_frequency: Optional[InterestFrequency] = None
    assets: List[InvestmentAssetRead] = []
