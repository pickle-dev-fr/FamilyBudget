from sqlmodel import Session, select
from app.models import InvestmentAsset, Account, AccountType
from app.schemas.account_schema import InvestmentAssetCreate, InvestmentAssetUpdate
from app.i18n.messages import msg


class InvestmentAssetService:

    @staticmethod
    def add_asset(session: Session, account: Account, data: InvestmentAssetCreate) -> InvestmentAsset:
        if account.account_type != AccountType.INVESTMENT:
            raise ValueError(msg("investment_asset.account_not_investment"))
        asset = InvestmentAsset(**data.model_dump(), account_id=account.id)
        session.add(asset)
        session.commit()
        session.refresh(asset)
        return asset

    @staticmethod
    def list_by_account(session: Session, account_id: str) -> list[InvestmentAsset]:
        return session.exec(
            select(InvestmentAsset).where(InvestmentAsset.account_id == account_id)
        ).all()

    @staticmethod
    def get_by_id(session: Session, asset_id: str) -> InvestmentAsset:
        asset = session.get(InvestmentAsset, asset_id)
        if not asset:
            raise ValueError(msg("investment_asset.not_found"))
        return asset

    @staticmethod
    def update_asset(session: Session, asset_id: str, data: InvestmentAssetUpdate) -> InvestmentAsset:
        asset = InvestmentAssetService.get_by_id(session, asset_id)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(asset, field, value)
        session.add(asset)
        session.commit()
        session.refresh(asset)
        return asset

    @staticmethod
    def delete_asset(session: Session, asset_id: str) -> None:
        asset = InvestmentAssetService.get_by_id(session, asset_id)
        session.delete(asset)
        session.commit()
