import json
from sqlalchemy.types import TypeDecorator, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector


class SafeVector(TypeDecorator):
    """
    Vector type that compiles to native PostgreSQL pgvector 'vector(dim)'
    and gracefully falls back to Text (storing JSON string) on SQLite/other dialects for unit tests.
    """
    impl = Text
    cache_ok = True

    def __init__(self, dim: int = 1536, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        if isinstance(value, (list, tuple)):
            return json.dumps(list(value))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return value
        return value


class SafeJSON(TypeDecorator):
    """
    JSON type that uses PostgreSQL JSONB for efficient binary indexing
    and standard JSON on SQLite/other dialects.
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())
