# SafeFood AI — Data Dictionary & ER Specification

This document details the 18 core relational entities, schemas, constraints, and relationships in the SafeFood AI database engine.

---

### Core Entity-Relationship Diagram

```
organizations (1) ────< users (N)
              ├───< sites (N) ────< audits (N) ────< audit_findings (N) ────< capa_actions (N)
              ├───< suppliers (N) ────< batches (N) ────< recall_predictions (N)
              │                   │                 └───< recall_events (N)
              ├───< products (N) ─┘
              ├───< documents (N) ────< document_analysis (N)
              ├───< ai_predictions (N)
              └───< capa_actions (N)

regulatory_documents (1) ────< regulatory_clauses (N) (pgvector)
                         └───< audit_findings (FK clause_id)

ai_model_versions (1) ────< ai_predictions (N)
                      └───< ai_audit_logs (N)
```

---

## 1. Tenancy & Access Control

### 1.1 `organizations`
Represents an enterprise tenant (food manufacturer, restaurant chain, cloud kitchen, distributor).
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique tenant identifier |
| `name` | VARCHAR(255) | NOT NULL | Display name of the business |
| `legal_name` | VARCHAR(255) | Nullable | Registered corporate entity name |
| `industry_type` | VARCHAR(100) | Nullable | Sector (Dairy, Bakery, Catering, Beverage) |
| `fssai_license_no` | VARCHAR(50) | Nullable | 14-digit FSSAI primary license number |
| `gstin` | VARCHAR(50) | Nullable | 15-digit Indian GSTIN number |
| `country` | VARCHAR(50) | NOT NULL, default 'IN' | Operating country jurisdiction |
| `status` | VARCHAR(50) | NOT NULL, default 'ACTIVE'| Tenant status (`ACTIVE`, `SUSPENDED`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Timestamp of onboarding |
| `updated_at` | TIMESTAMPTZ | NOT NULL, auto onupdate | Timestamp of last modification |

### 1.2 `users`
User accounts belonging to an organization or platform administration.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique user identifier |
| `organization_id` | UUID | FK → `organizations.id`, Nullable | Owning tenant (NULL for SUPER_ADMIN) |
| `name` | VARCHAR(255) | NOT NULL | Full name of user |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, Indexed | Login email address |
| `phone` | VARCHAR(50) | Nullable | Contact mobile number |
| `role` | VARCHAR(50) | NOT NULL, default 'VIEWER' | RBAC role enum |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt-hashed password |
| `status` | VARCHAR(50) | NOT NULL, default 'ACTIVE'| Account state (`ACTIVE`, `INACTIVE`) |
| `last_login_at` | TIMESTAMPTZ | Nullable | Last authenticated session timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Account creation timestamp |

---

## 2. Infrastructure & Physical Entities

### 2.1 `sites`
Manufacturing facilities, plants, dark kitchens, or central warehouses.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique site identifier |
| `organization_id` | UUID | FK → `organizations.id`, NOT NULL | Tenant isolation key |
| `name` | VARCHAR(255) | NOT NULL | Facility name |
| `address` | TEXT | Nullable | Street address |
| `city` | VARCHAR(100) | Nullable | City |
| `state` | VARCHAR(100) | Nullable | Indian State (e.g. Maharashtra, Karnataka)|
| `country` | VARCHAR(50) | NOT NULL, default 'IN' | Country code |
| `latitude` | FLOAT | Nullable | Geographic latitude |
| `longitude` | FLOAT | Nullable | Geographic longitude |
| `status` | VARCHAR(50) | NOT NULL, default 'ACTIVE'| Operational status |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Record creation timestamp |

### 2.2 `products`
Catalogue of food products produced, processed, or packaged.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique product identifier |
| `organization_id` | UUID | FK → `organizations.id`, NOT NULL | Tenant isolation key |
| `product_code` | VARCHAR(100) | NOT NULL | SKU or Internal product code |
| `name` | VARCHAR(255) | NOT NULL | Commercial product name |
| `category` | VARCHAR(100) | Nullable | Category (Dairy, Confectionery, etc.) |
| `description` | TEXT | Nullable | Product specification summary |
| `shelf_life_days` | INTEGER | Nullable | Declared shelf life in days |
| `allergen_profile` | JSONB / JSON | NOT NULL, default `[]` | List of allergens present |
| `status` | VARCHAR(50) | NOT NULL, default 'ACTIVE'| Product status |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Creation timestamp |

### 2.3 `suppliers`
Raw material and packaging suppliers.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique supplier identifier |
| `organization_id` | UUID | FK → `organizations.id`, NOT NULL | Tenant isolation key |
| `supplier_code` | VARCHAR(100) | NOT NULL | Unique vendor code |
| `name` | VARCHAR(255) | NOT NULL | Supplier business name |
| `license_number` | VARCHAR(100) | Nullable | FSSAI License or Registration |
| `risk_score` | FLOAT | NOT NULL, default 0.0 | Calculated supplier risk (0.0 to 1.0) |
| `health_score` | FLOAT | NOT NULL, default 100.0 | Composite health index (0 to 100) |
| `status` | VARCHAR(50) | NOT NULL, default 'ACTIVE'| Status (`ACTIVE`, `SUSPENDED`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Onboarding timestamp |

### 2.4 `batches`
Production lots and inventory batches.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique batch identifier |
| `organization_id` | UUID | FK → `organizations.id`, NOT NULL | Tenant isolation key |
| `product_id` | UUID | FK → `products.id`, NOT NULL | Associated product SKU |
| `supplier_id` | UUID | FK → `suppliers.id`, Nullable | Primary raw material supplier |
| `batch_number` | VARCHAR(100) | NOT NULL, Indexed | Lot / Batch number |
| `manufacturing_date` | DATE | NOT NULL | Date of manufacture |
| `expiry_date` | DATE | NOT NULL | Expiry / Best before date |
| `status` | VARCHAR(50) | NOT NULL, default 'HOLD' | Batch status (`RELEASED`, `HOLD`, `QUARANTINED`, `RECALLED`, `DESTROYED`, `CLOSED`) |
| `risk_score` | FLOAT | NOT NULL, default 0.0 | Machine learning predicted risk score |
| `risk_level` | VARCHAR(50) | NOT NULL, default 'LOW' | Categorical risk (`LOW`, `MEDIUM`, `HIGH`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Ingestion timestamp |

---

## 3. Regulatory & Document Intelligence

### 3.1 `regulatory_documents`
Global regulatory instruments published by FSSAI, MoFPI, and Codex.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique document identifier |
| `authority` | VARCHAR(100) | NOT NULL, default 'FSSAI'| Publishing regulatory body |
| `title` | VARCHAR(500) | NOT NULL | Official title of regulation / act |
| `document_type` | VARCHAR(100) | NOT NULL | `Regulation`, `Act`, `Amendment`, `Circular` |
| `version` | VARCHAR(50) | NOT NULL | Regulatory revision version |
| `publication_date` | DATE | Nullable | Gazette publication date |
| `effective_date` | DATE | Nullable | Statutory effective enforcement date |
| `source_url` | VARCHAR(1000)| Nullable | Official PDF source link |
| `content_hash` | VARCHAR(128) | Nullable | SHA-256 integrity hash |
| `status` | VARCHAR(50) | NOT NULL, default 'ACTIVE'| Status (`ACTIVE`, `SUPERSEDED`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Ingestion timestamp |

### 3.2 `regulatory_clauses`
Individual clauses, sections, and embedded vectors for semantic search.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique clause identifier |
| `document_id` | UUID | FK → `regulatory_documents.id` | Parent regulation document |
| `section` | VARCHAR(100) | Nullable | Chapter or section designation |
| `clause` | VARCHAR(100) | NOT NULL | Clause number (e.g. `2.1.1`, `Schedule 4`) |
| `heading` | VARCHAR(500) | Nullable | Descriptive heading |
| `content` | TEXT | NOT NULL | Full normative legal text |
| `page_number` | INTEGER | Nullable | Official PDF page reference |
| `effective_from` | DATE | Nullable | Clause effective start date |
| `effective_to` | DATE | Nullable | Repeal or sunset date |
| `embedding` | VECTOR(1536) | Nullable | 1536-dimensional semantic vector |

### 3.3 `documents`
Internal organization food safety artifacts (SOPs, HACCP plans, water test reports).
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique internal document identifier |
| `organization_id` | UUID | FK → `organizations.id`, NOT NULL | Tenant isolation key |
| `uploaded_by` | UUID | FK → `users.id`, Nullable | Uploader user |
| `document_type` | VARCHAR(100) | NOT NULL | `SOP`, `HACCP_PLAN`, `LAB_REPORT`, etc. |
| `file_name` | VARCHAR(255) | NOT NULL | Original uploaded filename |
| `storage_key` | VARCHAR(500) | NOT NULL | S3 / MinIO storage object path |
| `mime_type` | VARCHAR(100) | NOT NULL | `application/pdf`, `application/docx` |
| `version` | VARCHAR(50) | NOT NULL, default '1.0' | Internal revision |
| `status` | VARCHAR(50) | NOT NULL, default 'PENDING'| Analysis status (`PENDING`, `ANALYZED`) |
| `checksum` | VARCHAR(128) | Nullable | SHA-256 file checksum |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Upload timestamp |

### 3.4 `document_analysis`
Automated AI gap detection, compliance scoring, and recommendations.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique analysis identifier |
| `document_id` | UUID | FK → `documents.id`, NOT NULL | Analyzed document |
| `model_version` | VARCHAR(50) | Nullable | AI pipeline version tag |
| `compliance_score`| FLOAT | Nullable | Compliance index (0 to 100) |
| `risk_level` | VARCHAR(50) | Nullable | Risk category (`LOW`, `MEDIUM`, `HIGH`) |
| `summary` | TEXT | Nullable | Executive executive summary |
| `findings` | JSONB / JSON | NOT NULL, default `[]` | Identified gaps & non-conformances |
| `recommendations`| JSONB / JSON | NOT NULL, default `[]` | Suggested remediation steps |
| `confidence` | FLOAT | Nullable | Model confidence score (0.0 to 1.0) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Analysis run timestamp |

---

## 4. Audits & Corrective Actions (CAPA)

### 4.1 `audits`
Digital inspection events.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique audit identifier |
| `organization_id` | UUID | FK → `organizations.id`, NOT NULL | Tenant isolation key |
| `site_id` | UUID | FK → `sites.id`, Nullable | Inspection location |
| `audit_type` | VARCHAR(100) | NOT NULL | `Internal`, `FSSAI_Regulatory`, `HACCP` |
| `auditor_id` | UUID | FK → `users.id`, Nullable | Assigned lead auditor |
| `scheduled_date` | TIMESTAMPTZ | Nullable | Target audit date |
| `completed_date` | TIMESTAMPTZ | Nullable | Actual completion timestamp |
| `status` | VARCHAR(50) | NOT NULL, default 'SCHEDULED'| State (`SCHEDULED`, `COMPLETED`) |
| `score` | FLOAT | Nullable | Total audit score percentage |

### 4.2 `audit_findings`
Identified non-conformances or observations during inspections.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique finding identifier |
| `audit_id` | UUID | FK → `audits.id`, NOT NULL | Associated audit |
| `clause_id` | UUID | FK → `regulatory_clauses.id` | Violated regulatory clause |
| `severity` | VARCHAR(50) | NOT NULL, default 'MEDIUM' | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `OBSERVATION` |
| `finding` | TEXT | NOT NULL | Detailed finding narrative |
| `evidence` | TEXT | Nullable | Photo URI or documentation proof |
| `status` | VARCHAR(50) | NOT NULL, default 'OPEN' | Status (`OPEN`, `RESOLVED`, `CLOSED`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Finding timestamp |

### 4.3 `capa_actions`
Corrective and Preventive Action assignments.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique CAPA identifier |
| `organization_id` | UUID | FK → `organizations.id`, NOT NULL | Tenant isolation key |
| `finding_id` | UUID | FK → `audit_findings.id`, NOT NULL | Root non-conformance |
| `action_type` | VARCHAR(50) | NOT NULL | `CORRECTIVE` or `PREVENTIVE` |
| `description` | TEXT | NOT NULL | Specific action steps |
| `owner_id` | UUID | FK → `users.id`, Nullable | Responsible assignee |
| `due_date` | TIMESTAMPTZ | Nullable | Target completion deadline |
| `completion_date` | TIMESTAMPTZ | Nullable | Actual completion date |
| `verification_status`| VARCHAR(50)| NOT NULL, default 'PENDING' | Verification (`PENDING`, `VERIFIED`) |
| `status` | VARCHAR(50) | NOT NULL, default 'OPEN' | Workflow state (`OPEN`, `CLOSED`) |

---

## 5. Recall Risk & Event Management

### 5.1 `recall_predictions`
ML model recall risk forecasts.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique prediction identifier |
| `batch_id` | UUID | FK → `batches.id`, NOT NULL | Evaluated production batch |
| `model_version` | VARCHAR(50) | NOT NULL | XGBoost/LightGBM model version |
| `risk_probability`| FLOAT | NOT NULL | Continuous risk probability (0.0 to 1.0)|
| `risk_level` | VARCHAR(50) | NOT NULL | Risk rating (`LOW`, `MEDIUM`, `HIGH`) |
| `confidence` | FLOAT | NOT NULL | Statistical model confidence |
| `reason_codes` | JSONB / JSON | NOT NULL, default `[]` | Feature importance / SHAP weights |
| `recommended_actions`| JSONB / JSON| NOT NULL, default `[]` | Preventive actions recommended |
| `predicted_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Inference timestamp |

### 5.2 `recall_events`
Active or historical product recall incidents.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique recall event identifier |
| `organization_id` | UUID | FK → `organizations.id`, NOT NULL | Tenant isolation key |
| `batch_id` | UUID | FK → `batches.id`, NOT NULL | Recalled batch |
| `reason` | TEXT | NOT NULL | Root cause rationale |
| `severity` | VARCHAR(50) | NOT NULL | Severity classification (`CLASS_I`, etc.)|
| `status` | VARCHAR(50) | NOT NULL, default 'INITIATED'| Event lifecycle status |
| `initiated_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Initiation timestamp |
| `closed_at` | TIMESTAMPTZ | Nullable | Official closure timestamp |

---

## 6. AI Model Registry & Governance Logs

### 6.1 `ai_model_versions`
Registry of all deployed AI/ML models.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Model version identifier |
| `model_name` | VARCHAR(100) | NOT NULL | Canonical model identifier |
| `version` | VARCHAR(50) | NOT NULL | Semantic version (e.g. `1.0.0`) |
| `provider` | VARCHAR(100) | NOT NULL | Provider (`OpenAI`, `Local XGBoost`) |
| `purpose` | VARCHAR(100) | NOT NULL | Domain (`RAG`, `Recall_Risk`, `OCR`) |
| `deployment_date` | TIMESTAMPTZ | NOT NULL, default UTC now | Deployment release timestamp |
| `status` | VARCHAR(50) | NOT NULL, default 'ACTIVE'| `ACTIVE`, `RETIRED`, `CANDIDATE` |

### 6.2 `ai_predictions`
Audit trail of every inference output for explainability and regulatory auditing.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique prediction log record |
| `model_id` | UUID | FK → `ai_model_versions.id` | Model utilized |
| `organization_id` | UUID | FK → `organizations.id`, NOT NULL | Tenant isolation key |
| `input_hash` | VARCHAR(128) | NOT NULL, Indexed | SHA-256 hash of input payload |
| `output` | JSONB / JSON | NOT NULL | Raw or structured JSON output |
| `confidence` | FLOAT | Nullable | Confidence metric |
| `explanation` | JSONB / JSON | Nullable | SHAP values or citation references |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Prediction timestamp |

### 6.3 `ai_audit_logs`
Compliance audit log of every human interaction and system decision made by AI.
| Column Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | UUID | Primary Key, default UUIDv4 | Unique log ID |
| `user_id` | UUID | FK → `users.id`, Nullable | Acting user |
| `model_id` | UUID | FK → `ai_model_versions.id` | Referenced model |
| `action` | VARCHAR(100) | NOT NULL | Action type (e.g. `RAG_QUERY`, `BATCH_HOLD`)|
| `input_reference` | VARCHAR(255) | Nullable | Document ID, query ID, batch ID |
| `output_reference`| VARCHAR(255) | Nullable | Generated finding ID or report ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, default UTC now | Action execution timestamp |
