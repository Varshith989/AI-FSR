import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Organization, User, Site, UserRole
from backend.organizations.schemas import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    SiteCreate, SiteResponse
)
from backend.auth.schemas import UserCreate, UserUpdate, UserResponse
from backend.auth.dependencies import get_current_user, require_roles
from backend.auth.security import hash_password
from backend.utils.tenancy import TenantBypassScope, TenantScope, get_current_tenant_id

router = APIRouter(tags=["Organizations, Sites & Users"])


# --- Organizations ---

@router.get("/organizations", response_model=List[OrganizationResponse])
def list_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List organizations. Super admins see all tenants; other roles see their own tenant."""
    if current_user.role == UserRole.SUPER_ADMIN:
        with TenantBypassScope():
            return db.query(Organization).all()
    if not current_user.organization_id:
        return []
    with TenantBypassScope():
        return db.query(Organization).filter(Organization.id == current_user.organization_id).all()


@router.post("/organizations", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new organization tenant."""
    with TenantBypassScope():
        org = Organization(
            id=uuid.uuid4(),
            name=payload.name,
            legal_name=payload.legal_name,
            industry_type=payload.industry_type,
            fssai_license_no=payload.fssai_license_no,
            gstin=payload.gstin,
            country=payload.country,
            status="ACTIVE"
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        return org


@router.get("/organizations/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details for a specific organization."""
    if current_user.role != UserRole.SUPER_ADMIN and current_user.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access forbidden")

    with TenantBypassScope():
        org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


@router.patch("/organizations/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: uuid.UUID,
    payload: OrganizationUpdate,
    current_user: User = Depends(require_roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """Update organization settings."""
    if current_user.role != UserRole.SUPER_ADMIN and current_user.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access forbidden")

    with TenantBypassScope():
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(org, key, value)

        db.commit()
        db.refresh(org)
        return org


# --- Sites ---

@router.get("/sites", response_model=List[SiteResponse])
def list_sites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List facility sites for the active organization."""
    return db.query(Site).all()


@router.post("/sites", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
def create_site(
    payload: SiteCreate,
    current_user: User = Depends(require_roles(UserRole.ORG_ADMIN, UserRole.FOOD_SAFETY_MANAGER)),
    db: Session = Depends(get_db)
):
    """Register a new production facility, warehouse, or plant."""
    site = Site(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        name=payload.name,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        country=payload.country,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="ACTIVE"
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


# --- Users ---

@router.get("/users", response_model=List[UserResponse])
def list_users(
    current_user: User = Depends(require_roles(UserRole.ORG_ADMIN, UserRole.FOOD_SAFETY_MANAGER, UserRole.QA_MANAGER)),
    db: Session = Depends(get_db)
):
    """List users in the current organization."""
    if current_user.role == UserRole.SUPER_ADMIN:
        with TenantBypassScope():
            return db.query(User).all()
    with TenantBypassScope():
        return db.query(User).filter(User.organization_id == current_user.organization_id).all()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_roles(UserRole.ORG_ADMIN)),
    db: Session = Depends(get_db)
):
    """Provision a new user account with role assignment."""
    target_org_id = current_user.organization_id if current_user.role != UserRole.SUPER_ADMIN else (payload.organization_id or current_user.organization_id)

    with TenantBypassScope():
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        new_user = User(
            id=uuid.uuid4(),
            organization_id=target_org_id,
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            role=payload.role,
            password_hash=hash_password(payload.password),
            status="ACTIVE"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single user profile."""
    with TenantBypassScope():
        user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if current_user.role != UserRole.SUPER_ADMIN and user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access forbidden")
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    current_user: User = Depends(require_roles(UserRole.ORG_ADMIN)),
    db: Session = Depends(get_db)
):
    """Update user role or status."""
    with TenantBypassScope():
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if current_user.role != UserRole.SUPER_ADMIN and user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access forbidden")

        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(user, key, value)

        db.commit()
        db.refresh(user)
        return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ORG_ADMIN)),
    db: Session = Depends(get_db)
):
    """Deactivate or remove user account."""
    with TenantBypassScope():
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if current_user.role != UserRole.SUPER_ADMIN and user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access forbidden")

        user.status = "INACTIVE"
        db.commit()
    return None
