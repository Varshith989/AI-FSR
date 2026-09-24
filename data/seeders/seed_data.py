import os
import json
import uuid
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
from backend.utils.security import hash_password
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.utils.tenancy import TenantBypassScope
from backend.models import (
    Organization, User, UserRole,
    RegulatoryDocument, RegulatoryClause,
    Site, Product, Supplier, Batch, BatchStatus,
    AIModelVersion
)


def seed_database(db: Session = None) -> dict:
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        with TenantBypassScope():
            # 1. Seed AI Model Versions
            model_rag = db.query(AIModelVersion).filter_by(model_name="safefood-fssai-rag").first()
            if not model_rag:
                model_rag = AIModelVersion(
                    id=uuid.uuid4(),
                    model_name="safefood-fssai-rag",
                    version="1.0.0",
                    provider="Enterprise Gateway / RAG",
                    purpose="FSSAI Regulatory Q&A and Clause Citation",
                    status="ACTIVE"
                )
                db.add(model_rag)

            model_recall = db.query(AIModelVersion).filter_by(model_name="safefood-recall-xgb").first()
            if not model_recall:
                model_recall = AIModelVersion(
                    id=uuid.uuid4(),
                    model_name="safefood-recall-xgb",
                    version="1.2.0",
                    provider="Scikit-Learn / XGBoost",
                    purpose="Batch Recall Risk Probability Scoring",
                    status="ACTIVE"
                )
                db.add(model_recall)

            # 2. Seed Regulatory Documents & Clauses
            reg_file = Path(__file__).parent / "fssai_regulations.json"
            if reg_file.exists():
                with open(reg_file, "r", encoding="utf-8") as f:
                    reg_data = json.load(f)

                for item in reg_data:
                    doc = db.query(RegulatoryDocument).filter_by(title=item["title"]).first()
                    if not doc:
                        doc = RegulatoryDocument(
                            id=uuid.uuid4(),
                            authority=item.get("authority", "FSSAI"),
                            title=item["title"],
                            document_type=item.get("document_type", "Regulation"),
                            version=item.get("version", "2024.1"),
                            publication_date=date.fromisoformat(item["publication_date"]) if item.get("publication_date") else None,
                            effective_date=date.fromisoformat(item["effective_date"]) if item.get("effective_date") else None,
                            source_url=item.get("source_url"),
                            status="ACTIVE"
                        )
                        db.add(doc)
                        db.flush()

                        for c in item.get("clauses", []):
                            clause = RegulatoryClause(
                                id=uuid.uuid4(),
                                document_id=doc.id,
                                section=c.get("section"),
                                clause=c.get("clause"),
                                heading=c.get("heading"),
                                content=c.get("content"),
                                page_number=c.get("page_number"),
                                effective_from=doc.effective_date,
                                embedding=None  # Can be populated by embedding worker
                            )
                            db.add(clause)

            # 3. Seed Organizations
            demo_org = db.query(Organization).filter_by(name="Apex Foods India Pvt Ltd").first()
            if not demo_org:
                demo_org = Organization(
                    id=uuid.uuid4(),
                    name="Apex Foods India Pvt Ltd",
                    legal_name="Apex Food Products & Beverages India Private Limited",
                    industry_type="Dairy & Bakery Manufacturer",
                    fssai_license_no="10019022009876",
                    gstin="27AABCA1234F1Z8",
                    country="IN",
                    status="ACTIVE"
                )
                db.add(demo_org)
                db.flush()

            # 4. Seed Users across Roles
            users_to_seed = [
                ("Super Admin", "superadmin@safefood.ai", UserRole.SUPER_ADMIN, None),
                ("Anita Sharma", "admin@apexfoods.com", UserRole.ORG_ADMIN, demo_org.id),
                ("Dr. Rajesh Varma", "fs.manager@apexfoods.com", UserRole.FOOD_SAFETY_MANAGER, demo_org.id),
                ("Pooja Nair", "qa.head@apexfoods.com", UserRole.QA_MANAGER, demo_org.id),
                ("Vikram Sen", "auditor@safefood.ai", UserRole.AUDITOR, demo_org.id),
                ("Rahul Deshmukh", "analyst@apexfoods.com", UserRole.QA_ANALYST, demo_org.id),
                ("Sanjay Kulkarni", "prod.lead@apexfoods.com", UserRole.PRODUCTION_MANAGER, demo_org.id),
                ("Sunil Gavaskar", "vendor@sahyadridairy.com", UserRole.SUPPLIER, demo_org.id),
                ("Meera Joshi", "inspector@fssai.gov.in", UserRole.VIEWER, demo_org.id),
            ]

            default_hashed_pwd = hash_password("SafeFood@2026")
            for name, email, role, org_id in users_to_seed:
                user = db.query(User).filter_by(email=email).first()
                if not user:
                    user = User(
                        id=uuid.uuid4(),
                        organization_id=org_id,
                        name=name,
                        email=email,
                        phone="+91-9876543210",
                        role=role,
                        password_hash=default_hashed_pwd,
                        status="ACTIVE"
                    )
                    db.add(user)

            # 5. Seed Sites
            site_pune = db.query(Site).filter_by(name="Apex Dairy Unit 1 - Pune", organization_id=demo_org.id).first()
            if not site_pune:
                site_pune = Site(
                    id=uuid.uuid4(),
                    organization_id=demo_org.id,
                    name="Apex Dairy Unit 1 - Pune",
                    address="Plot 45, Chakan MIDC Phase II",
                    city="Pune",
                    state="Maharashtra",
                    country="IN",
                    latitude=18.7606,
                    longitude=73.8643,
                    status="ACTIVE"
                )
                db.add(site_pune)

            site_mumbai = db.query(Site).filter_by(name="Apex Cold Hub - Mumbai", organization_id=demo_org.id).first()
            if not site_mumbai:
                site_mumbai = Site(
                    id=uuid.uuid4(),
                    organization_id=demo_org.id,
                    name="Apex Cold Hub - Mumbai",
                    address="Sector 19, Vashi Cold Storage Zone",
                    city="Navi Mumbai",
                    state="Maharashtra",
                    country="IN",
                    latitude=19.0760,
                    longitude=72.8777,
                    status="ACTIVE"
                )
                db.add(site_mumbai)

            db.flush()

            # 6. Seed Suppliers
            sup_dairy = db.query(Supplier).filter_by(supplier_code="SUP-001", organization_id=demo_org.id).first()
            if not sup_dairy:
                sup_dairy = Supplier(
                    id=uuid.uuid4(),
                    organization_id=demo_org.id,
                    supplier_code="SUP-001",
                    name="Sahyadri Dairy Farmers Co-op",
                    license_number="11518034000122",
                    risk_score=0.08,
                    health_score=94.5,
                    status="ACTIVE"
                )
                db.add(sup_dairy)

            sup_grains = db.query(Supplier).filter_by(supplier_code="SUP-002", organization_id=demo_org.id).first()
            if not sup_grains:
                sup_grains = Supplier(
                    id=uuid.uuid4(),
                    organization_id=demo_org.id,
                    supplier_code="SUP-002",
                    name="Deccan Agro & Milling Corp",
                    license_number="11520021000981",
                    risk_score=0.25,
                    health_score=81.0,
                    status="ACTIVE"
                )
                db.add(sup_grains)

            db.flush()

            # 7. Seed Products
            prod_milk = db.query(Product).filter_by(product_code="PRD-MILK-01", organization_id=demo_org.id).first()
            if not prod_milk:
                prod_milk = Product(
                    id=uuid.uuid4(),
                    organization_id=demo_org.id,
                    product_code="PRD-MILK-01",
                    name="Pasteurized Standardized Milk 500ml",
                    category="Dairy",
                    description="Standardized fresh cow milk, 4.5% fat, 8.5% SNF",
                    shelf_life_days=3,
                    allergen_profile=["Milk"],
                    status="ACTIVE"
                )
                db.add(prod_milk)

            prod_paneer = db.query(Product).filter_by(product_code="PRD-PAN-01", organization_id=demo_org.id).first()
            if not prod_paneer:
                prod_paneer = Product(
                    id=uuid.uuid4(),
                    organization_id=demo_org.id,
                    product_code="PRD-PAN-01",
                    name="Fresh Malai Paneer 200g",
                    category="Dairy",
                    description="Vacuum packed fresh cottage cheese blocks",
                    shelf_life_days=15,
                    allergen_profile=["Milk"],
                    status="ACTIVE"
                )
                db.add(prod_paneer)

            db.flush()

            # 8. Seed Batches
            today = date.today()
            b1 = db.query(Batch).filter_by(batch_number="BATCH-MILK-202609A", organization_id=demo_org.id).first()
            if not b1:
                b1 = Batch(
                    id=uuid.uuid4(),
                    organization_id=demo_org.id,
                    product_id=prod_milk.id,
                    supplier_id=sup_dairy.id,
                    batch_number="BATCH-MILK-202609A",
                    manufacturing_date=today - timedelta(days=1),
                    expiry_date=today + timedelta(days=2),
                    status=BatchStatus.RELEASED,
                    risk_score=0.12,
                    risk_level="LOW"
                )
                db.add(b1)

            b2 = db.query(Batch).filter_by(batch_number="BATCH-PAN-202609B", organization_id=demo_org.id).first()
            if not b2:
                b2 = Batch(
                    id=uuid.uuid4(),
                    organization_id=demo_org.id,
                    product_id=prod_paneer.id,
                    supplier_id=sup_dairy.id,
                    batch_number="BATCH-PAN-202609B",
                    manufacturing_date=today,
                    expiry_date=today + timedelta(days=15),
                    status=BatchStatus.HOLD,
                    risk_score=0.35,
                    risk_level="MEDIUM"
                )
                db.add(b2)

            db.commit()

            summary = {
                "organization": demo_org.name,
                "users_seeded": len(users_to_seed),
                "regulations_seeded": db.query(RegulatoryDocument).count(),
                "clauses_seeded": db.query(RegulatoryClause).count(),
                "sites_seeded": db.query(Site).filter_by(organization_id=demo_org.id).count(),
                "products_seeded": db.query(Product).filter_by(organization_id=demo_org.id).count(),
                "batches_seeded": db.query(Batch).filter_by(organization_id=demo_org.id).count(),
            }
            return summary

    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    print("Beginning SafeFood AI database seeding...")
    # Ensure tables exist if running against a blank DB
    Base.metadata.create_all(bind=engine)
    results = seed_database()
    print("Database seeding completed successfully!")
    print(json.dumps(results, indent=2))
