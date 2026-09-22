import uuid
from contextvars import ContextVar
from typing import Optional, Any
from sqlalchemy import event, Select
from sqlalchemy.orm import Session, Query

# Global ContextVar storing the currently authenticated tenant ID for the request/thread
_current_tenant_id: ContextVar[Optional[uuid.UUID]] = ContextVar("current_tenant_id", default=None)
_fallback_tenant_id: Optional[uuid.UUID] = None
_tenant_bypass: ContextVar[bool] = ContextVar("tenant_bypass", default=False)
_fallback_tenant_bypass: bool = False


class TenantViolationError(RuntimeError):
    """Raised when an operation attempts cross-tenant data access or violates tenant isolation."""
    pass


class MissingTenantFilterError(RuntimeError):
    """Raised when a query executes against a tenant-scoped table without organization_id filtering."""
    pass


def get_current_tenant_id() -> Optional[uuid.UUID]:
    val = _current_tenant_id.get()
    if val is not None:
        return val
    return _fallback_tenant_id


def set_current_tenant_id(tenant_id: Optional[uuid.UUID]):
    global _fallback_tenant_id
    if isinstance(tenant_id, str):
        tenant_id = uuid.UUID(tenant_id)
    _current_tenant_id.set(tenant_id)
    _fallback_tenant_id = tenant_id


def reset_current_tenant_id():
    global _fallback_tenant_id, _fallback_tenant_bypass
    _current_tenant_id.set(None)
    _fallback_tenant_id = None
    _tenant_bypass.set(False)
    _fallback_tenant_bypass = False


class TenantScope:
    """Context manager to set and guarantee reset of tenant context."""
    def __init__(self, tenant_id: Optional[uuid.UUID]):
        if isinstance(tenant_id, str):
            tenant_id = uuid.UUID(tenant_id)
        self.tenant_id = tenant_id
        self.token = None
        self.prev_fallback = None

    def __enter__(self):
        global _fallback_tenant_id
        self.prev_fallback = _fallback_tenant_id
        self.token = _current_tenant_id.set(self.tenant_id)
        _fallback_tenant_id = self.tenant_id
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        global _fallback_tenant_id
        if self.token:
            _current_tenant_id.reset(self.token)
        _fallback_tenant_id = self.prev_fallback


class TenantBypassScope:
    """Context manager for system tasks (e.g. migration, super-admin aggregate jobs) to bypass tenant filter checks."""
    def __init__(self):
        self.token = None
        self.prev_bypass = None

    def __enter__(self):
        global _fallback_tenant_bypass
        self.prev_bypass = _fallback_tenant_bypass
        self.token = _tenant_bypass.set(True)
        _fallback_tenant_bypass = True
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        global _fallback_tenant_bypass
        if self.token:
            _tenant_bypass.reset(self.token)
        _fallback_tenant_bypass = self.prev_bypass


def register_tenancy_guard(session_factory):
    """
    Hooks into SQLAlchemy sessions to inspect executed queries.
    If a query accesses a tenant-isolated entity without an active tenant or matching filter,
    fails loudly in strict mode rather than leaking data.
    """
    @event.listens_for(session_factory, "do_orm_execute")
    def receive_do_orm_execute(execute_state):
        session_info = getattr(execute_state.session, "info", {})
        if session_info.get("tenant_bypass", False) or _tenant_bypass.get() or _fallback_tenant_bypass:
            return

        # Check if the execution is a SELECT statement
        if execute_state.is_select:
            tenant_id = session_info.get("tenant_id") or get_current_tenant_id()
            statement = execute_state.statement

            # Inspect selected entities
            for description in execute_state.all_mappers:
                mapped_class = description.class_
                if hasattr(mapped_class, "organization_id"):
                    # Table requires tenant isolation
                    if tenant_id is None:
                        # Users table can be queried during authentication before tenant is established
                        if mapped_class.__tablename__ == "users":
                            continue
                        raise MissingTenantFilterError(
                            f"Tenant Guard: Query against tenant-scoped table '{mapped_class.__tablename__}' "
                            f"executed with no active tenant context!"
                        )

                    # Automatically enforce filter on the statement if not explicitly scoped
                    execute_state.statement = statement.filter(
                        mapped_class.organization_id == tenant_id
                    )
