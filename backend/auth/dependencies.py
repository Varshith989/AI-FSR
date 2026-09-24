import uuid
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, UserRole
from backend.auth.security import decode_token
from backend.utils.tenancy import set_current_tenant_id, TenantBypassScope

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Extracts and authenticates the current user from the JWT Bearer token.
    Sets the active tenant ID in the thread/request context for row-level isolation.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = uuid.UUID(user_id_str)

    # Use TenantBypassScope to fetch user record across tenants
    with TenantBypassScope():
        user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently inactive or suspended"
        )

    # Set active tenant context for the duration of this request
    if hasattr(db, "info"):
        db.info["tenant_id"] = user.organization_id
    set_current_tenant_id(user.organization_id)
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


def require_roles(*allowed_roles: UserRole):
    """
    Role-based authorization dependency factory.
    Denies by default unless user has one of the allowed roles or SUPER_ADMIN.
    """
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_role = current_user.role if isinstance(current_user.role, UserRole) else UserRole(current_user.role)
        if user_role == UserRole.SUPER_ADMIN:
            return current_user

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {[r.value for r in allowed_roles]}, user has {user_role.value}"
            )
        return current_user

    return role_checker
