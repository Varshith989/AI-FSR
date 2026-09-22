import uuid
import pytest
from backend.models import Organization, Product, Supplier, Document
from backend.utils.tenancy import (
    TenantScope,
    TenantBypassScope,
    MissingTenantFilterError,
    set_current_tenant_id,
    reset_current_tenant_id
)


def test_missing_tenant_filter_fails_loudly(db_session, sample_orgs):
    """
    Asserts that executing a query against a tenant-scoped table without an active
    tenant context raises MissingTenantFilterError loudly instead of leaking all data.
    """
    reset_current_tenant_id()
    
    with pytest.raises(MissingTenantFilterError) as exc_info:
        # Querying Product with no active tenant context
        db_session.query(Product).all()

    assert "Tenant Guard: Query against tenant-scoped table 'products' executed with no active tenant context!" in str(exc_info.value)


def test_cross_tenant_isolation(db_session, sample_orgs):
    """
    Asserts that Tenant A cannot read Tenant B's data under any circumstances.
    """
    org_a, org_b = sample_orgs

    # Seed products into Org A and Org B
    with TenantBypassScope():
        prod_a = Product(
            id=uuid.uuid4(),
            organization_id=org_a.id,
            product_code="A-100",
            name="Alpha Organic Ghee",
            allergen_profile=["Milk"],
            status="ACTIVE"
        )
        prod_b = Product(
            id=uuid.uuid4(),
            organization_id=org_b.id,
            product_code="B-200",
            name="Beta Sourdough Loaf",
            allergen_profile=["Gluten"],
            status="ACTIVE"
        )
        db_session.add_all([prod_a, prod_b])
        db_session.flush()
        prod_b_id = prod_b.id
        prod_a_id = prod_a.id

    # Query as Org A
    with TenantScope(org_a.id):
        products_a = db_session.query(Product).all()
        assert len(products_a) == 1
        assert products_a[0].name == "Alpha Organic Ghee"
        assert products_a[0].organization_id == org_a.id

        # Attempt explicit query trying to fetch Org B's product while in Org A's session
        b_read_attempt = db_session.query(Product).filter(Product.id == prod_b_id).first()
        # Must return None because tenancy guard prevents cross-tenant data leakage
        assert b_read_attempt is None

    # Query as Org B
    with TenantScope(org_b.id):
        products_b = db_session.query(Product).all()
        assert len(products_b) == 1
        assert products_b[0].name == "Beta Sourdough Loaf"
        assert products_b[0].organization_id == org_b.id


def test_tenant_bypass_scope_for_platform_admins(db_session, sample_orgs):
    """
    Asserts that TenantBypassScope allows system/migration tasks to access all entities.
    """
    org_a, org_b = sample_orgs

    with TenantBypassScope():
        # Should not raise MissingTenantFilterError
        all_products = db_session.query(Product).all()
        assert isinstance(all_products, list)
