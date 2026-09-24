# SafeFood AI — System Architecture Overview

## 1. Executive Summary
SafeFood AI (AI-FSR) is an enterprise SaaS platform engineered for food safety compliance, digital audits, regulatory intelligence, and proactive recall risk prediction under the Food Safety and Standards Authority of India (FSSAI) regulatory framework.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                           Frontend Layer (React / Next.js)                        |
|   - Executive Dashboard     - Regulatory RAG Assistant    - Document Intelligence |
|   - Food Label Validator    - Digital Audit & CAPA        - Voice AI Assistant    |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / REST / WebSockets
                                           v
+-----------------------------------------------------------------------------------+
|                       FastAPI Gateway & Security Middleware                       |
|   - TLS 1.2+ Termination    - JWT Bearer Authentication   - Rate Limiting         |
|   - Deny-by-Default RBAC    - Query Tenancy Guard         - Audit Trail Logging   |
+------------------------------------------+----------------------------------------+
                                           |
         +---------------------------------+--------------------------------+
         v                                 v                                v
+-----------------------+     +--------------------------+     +--------------------+
|  Application Services |     | AI & ML Engine           |     | Asynchronous Tasks |
|  - Identity & Org     |     | - AI Guardrail Pipeline  |     | - Celery / Redis   |
|  - Compliance & Regs  |     | - RAG Orchestrator       |     | - Notification Bus |
|  - Audits & Findings  |     | - XGBoost Recall Model   |     | - Document Parsers |
|  - CAPA Workflow      |     | - Label Rule Engine      |     | - Vector Ingestion |
|  - Supplier & Batch   |     | - Voice (En, Hi, Ta)     |     +--------------------+
+-----------+-----------+     +------------+-------------+
            |                              |
            +------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                                 Persistence Layer                                 |
|  +--------------------+  +-------------------+  +---------------+  +------------+ |
|  | PostgreSQL 16      |  | Redis 7           |  | MinIO / S3    |  | OpenSearch | |
|  | - 18 core tables   |  | - Auth session    |  | - Raw SOPs    |  | - Full-text| |
|  | - pgvector         |  | - Cache           |  | - Lab reports |  | - Search   | |
|  | - Row-level tenancy|  | - Event queue     |  | - Label images|  | - Analytics| |
|  +--------------------+  +-------------------+  +---------------+  +------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 3. Bounded Services (12–15 Core Modules)

1. **Identity & Access Management (IAM)**: OAuth2/OIDC, JWT tokens, 9 RBAC roles, MFA verification.
2. **Organization & Site Management**: Multi-tier hierarchy: Organization → Sites → Units/Warehouses.
3. **Compliance Knowledge Base**: FSSAI Regulations, Gazette notifications, Schedule 4 hygiene standards with effective date awareness.
4. **Regulatory RAG Service**: Hybrid dense vector retrieval + full text keyword search with strict citation contracts.
5. **Document Intelligence Service**: Multi-format SOP/HACCP parser, clause gap detection, risk scoring.
6. **Food Label Validator**: Deterministic FSSAI rule engine with OCR layout extraction and mandatory declaration validation.
7. **Recall Prediction Engine**: Multi-factor machine learning (XGBoost/LightGBM) with SHAP explainability.
8. **Supplier Risk Management**: Supplier health score calculation across compliance, delivery, audits, and lab tests.
9. **Batch Management**: Lot tracking, lifecycle status (`RELEASED`, `HOLD`, `QUARANTINED`, `RECALLED`), shelf-life monitoring.
10. **Audit Management**: Plan, checklist generator, inspection execution, evidence capture, finding classification.
11. **CAPA Workflow**: Root cause analysis, corrective/preventive actions, ownership assignment, verification.
12. **Voice AI Service**: Trilingual voice processing (English, Hindi, Tamil) with high-impact safety confirmations.
13. **Pluggable Notification Dispatcher**: Event-driven decoupled notification system across Email, SMS, Push, Slack.
14. **AI Guardrails Pipeline**: 8-stage verification pipeline (PII detection, confidence check, hallucination mitigation).
15. **Audit Logging & Observability**: Immutable audit trail of all state changes and OpenTelemetry metrics.

---

## 4. Multi-Tenancy Architecture
- **Isolation Model**: Shared Database, Shared Schema with strict row-level isolation via `organization_id`.
- **Query Guard**: Custom SQLAlchemy query hook (`backend.utils.tenancy.register_tenancy_guard`) validates that every query targeting tenant-isolated models enforces an active tenant filter. Cross-tenant access is physically blocked at the ORM layer.
- **Future Scale**: Pre-designed foreign key models and migration boundaries enable zero-downtime migration to Shared DB / Separate Schema or Dedicated Databases for large enterprise clients.
