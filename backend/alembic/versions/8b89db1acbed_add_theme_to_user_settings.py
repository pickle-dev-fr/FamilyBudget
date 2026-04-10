"""add_theme_to_user_settings

Revision ID: 8b89db1acbed
Revises: 312552e5767a
Create Date: 2026-04-10 08:53:24.131906

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b89db1acbed'
down_revision: Union[str, Sequence[str], None] = '312552e5767a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    usertheme = sa.Enum('DARK', 'LIGHT', name='usertheme')
    usertheme.create(op.get_bind(), checkfirst=True)
    op.add_column('usersettings', sa.Column('theme', usertheme, server_default='DARK', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usersettings', 'theme')
    sa.Enum(name='usertheme').drop(op.get_bind(), checkfirst=True)
