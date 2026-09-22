import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    legal_name: Optional[str] = None
    industry_type: Optional[str] = None
    fssai_license_no: Optional[str] = None
    gstin: Optional[str] = None
    country: str = "IN"


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    industry_type: Optional[str] = None
    fssai_license_no: Optional[str] = None
    gstin: Optional[str] = None
    status: Optional[str] = None


class OrganizationResponse(BaseModel):
    id: uuid.UUID
    name: str
    legal_name: Optional[str] = None
    industry_type: Optional[str] = None
    fssai_license_no: Optional[str] = None
    gstin: Optional[str] = None
    country: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SiteCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "IN"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SiteResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
