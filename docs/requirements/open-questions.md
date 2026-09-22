# SafeFood AI — Architectural Assumptions & Open Questions

This document records architectural decisions, assumptions, and spec clarifications made during development to maintain complete traceability.

---

## 1. Regulatory Documents Multi-Tenancy Scope
- **Spec Context**: §5.3, §6.1, §9.
- **Decision / Assumption**: FSSAI regulations, circulars, Gazette notifications, and Codex references in `regulatory_documents` and `regulatory_clauses` are **global reference knowledge** (authority: FSSAI/Govt of India). They do not possess an `organization_id` column.
- **Tenant Documents**: In contrast, internal company SOPs, HACCP plans, CCP logs, batch records, and audit findings reside in `documents`, `batches`, and `audits` and are strictly bound to `organization_id` with row-level isolation.

---

## 2. Vector Embeddings Dimension & Storage
- **Spec Context**: §2 ("Vector DB: pgvector initially; OpenSearch/dedicated vector DB at scale"), §6.1 (`regulatory_clauses.embedding (VECTOR)`).
- **Decision / Assumption**: The default embedding vector dimensionality is set to **1536** (compatible with OpenAI text-embedding-3-small, Azure text-embedding-ada-002, and standard enterprise gateways).
- **Dialect Portability**: Implemented a `SafeVector` TypeDecorator in `backend/utils/types.py` that emits native `vector(1536)` on PostgreSQL (via `pgvector`) while cleanly falling back to serialized JSON on in-memory SQLite instances to enable sub-second test execution.

---

## 3. Query-Level Multi-Tenancy Enforcement Guard
- **Spec Context**: §9 ("Tenant isolation: every query must filter by organization_id; add a query-layer guard so a missing organization_id filter fails loudly in tests").
- **Decision / Assumption**: Built a SQLAlchemy ORM execution listener (`backend/utils/tenancy.py:register_tenancy_guard`). When executing queries against tenant-scoped tables:
  1. If no tenant context is active, it raises `MissingTenantFilterError` loudly in tests.
  2. If a tenant is active, it automatically injects `organization_id == current_tenant_id`.
  3. Administrative maintenance, migrations, and seeders execute within an explicit `TenantBypassScope()`.

---

## 4. Password Security & Cryptography
- **Spec Context**: §5.1 ("JWT access + refresh tokens, MFA verification endpoint"), §9 ("Security Requirements").
- **Decision / Assumption**: Employing direct native `bcrypt` cryptographic hashing with adaptive work factor (default 12 rounds) in `backend/utils/security.py`, ensuring compatibility across Python 3.12 without legacy passlib attribute deprecation bottlenecks.

---

## 5. Bounded Service Modular Monolith Structure
- **Spec Context**: §3 ("A modular monolith with clear service boundaries is acceptable for MVP, but keep interfaces so services can be split out later. Target 12–15 bounded services").
- **Decision / Assumption**: Organized into bounded modules (`auth`, `compliance`, `documents`, `labels`, `audits`, `suppliers`, `batches`, `recall`, `logs`, `utils`). Each bounded domain contains its domain models, services, schemas, and endpoints while sharing core utilities (`database`, `tenancy`, `security`).
