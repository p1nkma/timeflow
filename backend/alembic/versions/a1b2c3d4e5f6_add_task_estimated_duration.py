"""add_task_estimated_duration_minutes

Revision ID: a1b2c3d4e5f6
Revises: da462b50d7e8
Create Date: 2026-05-30 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: str | Sequence[str] | None = 'da462b50d7e8'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'tasks',
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('tasks', 'estimated_duration_minutes')
