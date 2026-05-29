"""add_user_planner_settings

Revision ID: f63fd21f1343
Revises: 557015c3d189
Create Date: 2026-05-29 19:43:54.228561

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f63fd21f1343'
down_revision: str | Sequence[str] | None = '557015c3d189'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    chronotype_enum = sa.Enum('lark', 'owl', 'pigeon', name='chronotype')
    chronotype_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('users', sa.Column('chronotype', chronotype_enum, nullable=False, server_default='pigeon'))
    op.add_column('users', sa.Column('work_start', sa.Integer(), nullable=False, server_default='540'))
    op.add_column('users', sa.Column('work_end', sa.Integer(), nullable=False, server_default='1200'))


def downgrade() -> None:
    op.drop_column('users', 'work_end')
    op.drop_column('users', 'work_start')
    op.drop_column('users', 'chronotype')
    sa.Enum(name='chronotype').drop(op.get_bind(), checkfirst=True)
