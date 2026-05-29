import uuid
from typing import Annotated

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import mapped_column

UUIDPK = Annotated[
    uuid.UUID,
    mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
]


def fk_uuid(target: str, *, nullable: bool = False, ondelete: str = "CASCADE"):
    return mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(target, ondelete=ondelete),
        nullable=nullable,
    )
