"""add_language_to_user_settings

Revision ID: 312552e5767a
Revises: 7fcc7863ff2a
Create Date: 2026-04-10 08:39:46.728875

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '312552e5767a'
down_revision: Union[str, Sequence[str], None] = '7fcc7863ff2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    userlanguage = sa.Enum('FR', 'EN', name='userlanguage')
    userlanguage.create(op.get_bind(), checkfirst=True)
    op.add_column('usersettings', sa.Column('language', userlanguage, server_default='FR', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usersettings', 'language')
    sa.Enum(name='userlanguage').drop(op.get_bind(), checkfirst=True)
