"""add_account_type_savings_investment

Revision ID: f488089a6267
Revises: 8b89db1acbed
Create Date: 2026-04-16 14:15:02.652793

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'f488089a6267'
down_revision: Union[str, Sequence[str], None] = '8b89db1acbed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE accounttype AS ENUM ('NORMAL', 'SAVINGS', 'INVESTMENT')")
    op.execute("CREATE TYPE interestfrequency AS ENUM ('DAILY', 'MONTHLY', 'ANNUAL')")
    op.execute("CREATE TYPE assettype AS ENUM ('STOCK', 'ETF', 'CRYPTO')")
    op.execute("""
        CREATE TABLE investmentasset (
            id VARCHAR NOT NULL PRIMARY KEY,
            ticker VARCHAR NOT NULL,
            name VARCHAR NOT NULL,
            asset_type assettype NOT NULL,
            quantity FLOAT NOT NULL,
            current_price FLOAT NOT NULL DEFAULT 0.0,
            last_price_update TIMESTAMP,
            account_id VARCHAR NOT NULL REFERENCES account(id)
        )
    """)
    op.execute("ALTER TABLE account ADD COLUMN account_type accounttype NOT NULL DEFAULT 'NORMAL'")
    op.execute("ALTER TABLE account ADD COLUMN savings_goal FLOAT")
    op.execute("ALTER TABLE account ADD COLUMN interest_rate FLOAT")
    op.execute("ALTER TABLE account ADD COLUMN interest_frequency interestfrequency")


def downgrade() -> None:
    op.execute("ALTER TABLE account DROP COLUMN IF EXISTS interest_frequency")
    op.execute("ALTER TABLE account DROP COLUMN IF EXISTS interest_rate")
    op.execute("ALTER TABLE account DROP COLUMN IF EXISTS savings_goal")
    op.execute("ALTER TABLE account DROP COLUMN IF EXISTS account_type")
    op.execute("DROP TABLE IF EXISTS investmentasset")
    op.execute("DROP TYPE IF EXISTS accounttype")
    op.execute("DROP TYPE IF EXISTS interestfrequency")
    op.execute("DROP TYPE IF EXISTS assettype")
