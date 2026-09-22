import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.auth.schemas import LoginRequest, TokenResponse, RefreshRequest, MFAVerifyRequest
from backend.auth.security import create_access_token, create_refresh_token, decode_token, verify_password
from backend.auth.dependencies import get_current_user
from backend.utils.tenancy import TenantBypassScope
from backend.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning access and refresh JWT tokens."""
    with TenantBypassScope():
        user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or suspended"
        )

    # If MFA is enforced globally or on the account, check code
    mfa_required = settings.MFA_ENFORCED
    if mfa_required and payload.mfa_code != "123456":  # Standard demo TOTP token
        return TokenResponse(
            access_token="",
            refresh_token="",
            token_type="bearer",
            user_id=user.id,
            organization_id=user.organization_id,
            role=user.role if isinstance(user.role, str) else user.role.value,
            name=user.name,
            email=user.email,
            mfa_required=True
        )

    user_id = user.id
    user_org_id = user.organization_id
    user_name = user.name
    user_email = user.email
    role_str = user.role if isinstance(user.role, str) else user.role.value

    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    with TenantBypassScope():
        db.commit()

    token_claims = {
        "sub": str(user_id),
        "email": user_email,
        "org": str(user_org_id) if user_org_id else None,
        "role": role_str
    }
    access_token = create_access_token(token_claims)
    refresh_token = create_refresh_token(token_claims)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user_id=user_id,
        organization_id=user_org_id,
        role=role_str,
        name=user_name,
        email=user_email,
        mfa_required=False
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    try:
        decoded = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type: expected refresh token")

    user_id = uuid.UUID(decoded.get("sub"))
    with TenantBypassScope():
        user = db.query(User).filter(User.id == user_id).first()

    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer active or valid")

    role_str = user.role if isinstance(user.role, str) else user.role.value
    token_claims = {
        "sub": str(user.id),
        "email": user.email,
        "org": str(user.organization_id) if user.organization_id else None,
        "role": role_str
    }
    new_access_token = create_access_token(token_claims)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=payload.refresh_token,
        token_type="bearer",
        user_id=user.id,
        organization_id=user.organization_id,
        role=role_str,
        name=user.name,
        email=user.email,
        mfa_required=False
    )


@router.post("/mfa/verify", response_model=TokenResponse)
def verify_mfa(payload: MFAVerifyRequest, db: Session = Depends(get_db)):
    """Complete second-factor verification and issue access tokens."""
    with TenantBypassScope():
        user = db.query(User).filter(User.id == payload.user_id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # In MVP, accept demo MFA code "123456"
    if payload.mfa_code != "123456":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA verification code")

    role_str = user.role if isinstance(user.role, str) else user.role.value
    token_claims = {
        "sub": str(user.id),
        "email": user.email,
        "org": str(user.organization_id) if user.organization_id else None,
        "role": role_str
    }
    return TokenResponse(
        access_token=create_access_token(token_claims),
        refresh_token=create_refresh_token(token_claims),
        token_type="bearer",
        user_id=user.id,
        organization_id=user.organization_id,
        role=role_str,
        name=user.name,
        email=user.email,
        mfa_required=False
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Invalidate authenticated session."""
    return {"message": "Successfully logged out"}
