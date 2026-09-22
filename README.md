# SafeFood AI (AI-FSR)

> **Enterprise AI-Powered Food Safety Compliance, Audit, and Recall Risk Intelligence Platform**  
> Tailored for the Indian market and regulated under the Food Safety and Standards Authority of India (**FSSAI**).

---

## 1. Product Vision & Core Pillars

SafeFood AI bridges statutory regulatory standards and factory shopfloor reality for food manufacturers, cloud kitchens, retail chains, and quality assurance teams across India.

- **Regulatory Intelligence**: FSSAI statutory RAG pipeline, versioned Gazette tracking, Schedule 4 hygiene standards, and precise clause citation.
- **Document Intelligence**: Automated compliance analysis of SOPs, HACCP plans, laboratory reports, and pest control logs with gap detection.
- **Audit & CAPA**: Full lifecycle digital inspections, photo evidence capture, severity classification, and root cause corrective actions.
- **Food Risk Intelligence**: Machine-learning batch recall risk prediction with SHAP factor explainability and supplier scorecards.
- **AI Food Safety Copilot**: Trilingual shopfloor voice & text assistant (English, Hindi, Tamil) with security confirmation gates for high-impact actions.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic |
| **Database** | PostgreSQL 16 with `pgvector` extension (UUID PKs, JSONB, row-level multi-tenancy) |
| **Cache & Tasks** | Redis 7, In-process / Celery task queues |
| **Storage** | MinIO (local S3-compatible) / AWS S3 |
| **Search Engine** | OpenSearch 2 (hybrid semantic + BM25 keyword search) |
| **Frontend** | React / Next.js, TypeScript, Tailwind CSS |
| **Auth & RBAC** | JWT Bearer tokens (access + refresh), Deny-by-default policy engine, MFA |
| **Security** | Query-level tenancy isolation guard, AES encryption at rest, TLS 1.2+ |

---

## 3. Repository Structure

```
safefood-ai/
├── backend/                  # Python + FastAPI modular monolith
│   ├── auth/                 # Identity, JWT, MFA, RBAC policy engine
│   ├── compliance/           # FSSAI regulatory knowledge & RAG engine
│   ├── documents/            # SOP / HACCP document analysis pipeline
│   ├── labels/               # Food label validator & OCR rule engine
│   ├── audits/               # Inspection checklists, findings, & CAPA
│   ├── suppliers/            # Supplier profiles & health scoring
│   ├── batches/              # Production batches & lot traceability
│   ├── recall/               # ML recall prediction & incident events
│   ├── logs/                 # AI model versions, predictions, audit logs
│   ├── utils/                # Tenancy isolation guard, security, DB engine
│   ├── config.py             # Pydantic configuration & env settings
│   ├── database.py           # SQLAlchemy sessionmaker & connection pool
│   └── models.py             # Central registry of all 18 domain models
├── data/
│   ├── migrations/           # Alembic schema versioning scripts
│   ├── seeders/              # FSSAI regulations, demo tenant, & seed scripts
│   ├── raw_data/             # Statutory acts, notifications, sample labels
│   ├── processed/            # Extracted clauses and vector embeddings
│   └── datasets/             # Training datasets for recall prediction ML
├── docs/
│   ├── architecture/         # System architecture, data dictionary, UX wireframes
│   └── requirements/         # Spec clarifications & open questions register
├── frontend/                 # React / Next.js TypeScript application
│   ├── components/           # Reusable UI components
│   ├── pages/                # Application views & dashboards
│   ├── hooks/                # Custom React state hooks
│   └── services/             # API client services
├── infrastructure/
│   ├── docker/               # Backend and frontend container images
│   ├── terraform/            # Cloud infrastructure as code
│   └── k8s/                  # Kubernetes deployment manifests
└── tests/
    ├── unit/                 # Unit tests (models, tenancy guard, seeders)
    ├── integration/          # Migration & database integration tests
    ├── e2e/                  # End-to-end user journey tests
    └── security/             # Penetration and tenant isolation tests
```

---

## 4. Local Development Quickstart

### Prerequisites
- Docker & Docker Compose (or standalone Postgres 16 with pgvector)
- Python 3.12+ (or `uv` package manager)
- Node.js 18+

### Step 1: Start Local Infrastructure
Run the containerized stack (PostgreSQL with pgvector, Redis, MinIO, and OpenSearch):
```bash
docker-compose up -d
```

### Step 2: Set Up Python Virtual Environment
```bash
# Using uv (fastest):
uv venv .venv
uv pip install -r requirements.txt

# Or standard python venv:
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Run Database Migrations
Initialize all 18 core tables and PostgreSQL extensions:
```bash
alembic upgrade head
```

### Step 4: Seed Initial FSSAI Regulations & Demo Tenant
Populate statutory regulations (Schedule 4 hygiene standards, Licensing regulations, Labelling standards), demo organization (`Apex Foods Ltd`), and test accounts:
```bash
python -m data.seeders.seed_data
```

### Step 5: Run Automated Verification Suite
Run unit tests, tenant isolation checks, and migration tests:
```bash
pytest tests/ -v
```

---

## 5. Security & Multi-Tenancy Architecture

Every query executed against tenant-isolated tables (`products`, `suppliers`, `batches`, `documents`, `audits`, `capa_actions`, `recall_events`, etc.) is intercepted by the query-level Tenancy Guard in `backend/utils/tenancy.py`. 

1. **Automatic Tenant Scoping**: When an authenticated tenant session is active, queries are automatically filtered by `organization_id == current_tenant_id`.
2. **Fail-Loud Protection**: If a developer or background worker queries a tenant-isolated entity without an active tenant context, the guard raises `MissingTenantFilterError` loudly in test environments, preventing silent cross-tenant data leaks.
3. **Admin Bypass**: Platform-wide jobs (e.g. Alembic migrations and database seeders) execute safely within `TenantBypassScope()`.

---

## 6. 12-Week MVP Delivery Plan

| Week | Milestone Deliverable | Status |
|---|---|---|
| **Week 1** | Architecture, UX wireframes, DB schema + migrations | **Completed** |
| **Week 2** | Authentication + RBAC (JWT, 9 roles, MFA) | **Completed** |
| **Week 3** | Organization / site / user multi-tenant management | **Completed** |
| **Week 4** | Regulatory knowledge ingestion (FSSAI documents → clauses → pgvector embeddings) | **Completed** |
| **Week 5** | RAG + Regulatory Assistant (`POST /compliance/query`) | **Completed** |
| **Week 6** | Document Intelligence (SOP/HACCP analysis + gap detection) | **Completed** |
| **Week 7** | Label Validator (FSSAI 2020 deterministic rule engine) | **Completed** |
| **Week 8** | Audit Management (checklist → findings → CAPA verification) | **Completed** |
| **Week 9** | Supplier + Batch Management (health index & status state machine) | **Completed** |
| **Week 10**| Recall Prediction Engine (ML probability + SHAP feature attribution) | **Completed** |
| **Week 11**| Dashboard + Reports (executive aggregated metrics) | **Completed** |
| **Week 12**| Security hardening + AI Guardrails + Trilingual Voice Copilot + Deployment | **Completed** |