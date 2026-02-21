"""fix typerecurrence enum values

Revision ID: e3f4aa67fd89
Revises: 92213f4c192f
Create Date: 2026-02-21 15:56:45.710163

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3f4aa67fd89'
down_revision: Union[str, Sequence[str], None] = '92213f4c192f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():

    op.execute("ALTER TABLE transaction DROP COLUMN recurrence_type;")

    op.execute("DROP TYPE typerecurrence;")

    op.execute("""
        CREATE TYPE typerecurrence AS ENUM (
            'DAY',
            'WEEK',
            'MONTH'
        );
    """)

    op.execute("""
        ALTER TABLE transaction
        ADD COLUMN recurrence_type typerecurrence;
    """)


def downgrade():

    op.execute("ALTER TABLE transaction DROP COLUMN recurrence_type;")

    op.execute("DROP TYPE typerecurrence;")

    op.execute("""
        CREATE TYPE typerecurrence AS ENUM (
            'day',
            'week',
            'month'
        );
    """)

    op.execute("""
        ALTER TABLE transaction
        ADD COLUMN recurrence_type typerecurrence;
    """)