# SafeFood AI — UX Wireframes & Frontend Specification

This document maps the user experience wireframes and frontend interaction flows for SafeFood AI, providing a seamless progression from the initial UI prototype into the full React/Next.js SaaS application.

---

## 1. Executive Dashboard (Overview)
**Goal**: Instant situational awareness of enterprise food safety health index, open non-conformances, and high-risk batches.

```
+-----------------------------------------------------------------------------------------+
| [SafeFood AI]  (Site: Apex Chakan Unit 1)           [Alerts (3)]  [Dr. Varma (QA Mgr)]  |
+-----------------------------------------------------------------------------------------+
| [Overview]  [Regulatory RAG]  [Doc Intel]  [Label Validator]  [Recall ML]  [Audit/CAPA] |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  +--------------------+  +--------------------+  +--------------------+  +------------+ |
|  | Compliance Index   |  | Open Non-Conform.  |  | At-Risk Batches    |  | FSSAI Sync | |
|  |     [ 94% ]        |  |     3 High / 1 Crit|  |   2 Batches (Hold) |  |   Active   | |
|  | Status: Optimal    |  | CAPA Due in < 48h  |  | Risk Score > 0.70  |  | Live 2026  | |
|  +--------------------+  +--------------------+  +--------------------+  +------------+ |
|                                                                                         |
|  +--------------------------------------------+  +------------------------------------+ |
|  | Compliance Trend (Last 6 Months)           |  | Live Risk & Batch Alerts           | |
|  |  98% |           _--~                      |  | [CRIT] Batch BATCH-202609B:        | |
|  |  94% |    _--~--~                          |  |        Cold chain temp spike 7.2°C | |
|  |  90% | --~                                 |  | [HIGH] Water Lab Test Due: Pune 1  | |
|  |  86% +----------------------------         |  | [INFO] FSSAI Gazette 2026 Sync Ok  | |
|  |        Apr  May  Jun  Jul  Aug  Sep        |  |                                    | |
|  +--------------------------------------------+  +------------------------------------+ |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Regulatory RAG Assistant (`/compliance/query`)
**Goal**: Instant answers to FSSAI questions backed by authoritative citations, effective dates, and confidence scoring.

```
+-----------------------------------------------------------------------------------------+
| SafeFood AI > Regulatory Assistant                                                      |
+-----------------------------------------------------------------------------------------+
| [Search FSSAI Regulations & Gazette Notifications...]                   [Filter: Dairy] |
+-----------------------------------------------------------------------------------------+
| User Query: "What are the temperature control mandates for pasteurized milk transport?" |
+-----------------------------------------------------------------------------------------+
| AI Response [Confidence: 96%]                                    [Copy] [Export PDF]   |
|                                                                                         |
| Pasteurized milk must be stored and transported at or below 4°C throughout the cold     |
| chain to prevent microbial proliferation. Insulated reefer containers with continuous   |
| temperature dataloggers are mandatory under Schedule 4 Part 3.                          |
|                                                                                         |
| Verified Sources & Citations:                                                           |
| 1. FSSAI Licensing & Registration Regulations 2011                                      |
|    Clause: Schedule 4 - Part 3 Clause 2.1 (Specific Hygiene for Dairy Processing)       |
|    Effective Date: 2011-08-05 (Current Version 2024.1)                                  |
|    [View Official PDF Source]                                                           |
|                                                                                         |
| Status Badge: [HUMAN REVIEW NOT REQUIRED - HIGH CONFIDENCE]                             |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Document Intelligence Studio (`/documents`)
**Goal**: Automated compliance audit of uploaded SOPs and HACCP plans against statutory standards.

```
+-----------------------------------------------------------------------------------------+
| SafeFood AI > Document Intelligence Studio                                              |
+-----------------------------------------------------------------------------------------+
| [ Drag & Drop SOP / HACCP / Lab Test PDF here ]  or  [ Browse Files ]                   |
| Supported: PDF, DOCX (Max 25MB)                                                         |
+-----------------------------------------------------------------------------------------+
| Analysis Results: "SOP-SANI-04: CIP Cleaning of Dairy Pasteurizer Unit 1"               |
| Overall Compliance Score: 82% (Review Required)                                         |
|                                                                                         |
| Identified Compliance Gaps:                                                             |
| +----------+-------------+---------------------------------------+--------------------+ |
| | Severity | Regulation  | Missing Requirement                   | Action             | |
| +----------+-------------+---------------------------------------+--------------------+ |
| | HIGH     | Sched 4 P3  | Caustic rinse temp logged manually    | Convert to auto CIP| |
| | MEDIUM   | IS 10500    | Bi-annual water test report missing   | Upload lab cert    | |
| +----------+-------------+---------------------------------------+--------------------+ |
|                                                                                         |
| [Generate Corrective Action Plan (CAPA)]  [Download Executive PDF Report]               |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Food Label Validator (`/labels`)
**Goal**: Rapid OCR analysis of pre-packaged food labels with deterministic FSSAI compliance verification.

```
+-----------------------------------------------------------------------------------------+
| SafeFood AI > Food Label Validator                                                      |
+-----------------------------------------------------------------------------------------+
| [ Upload Product Label Image / Artwork ]                                                |
| Preview: [ Front of Pack Artwork - Malai Paneer 200g ]                                  |
+-----------------------------------------------------------------------------------------+
| Verification Summary: SCORE 88/100 - [REVIEW REQUIRED]                                 |
|                                                                                         |
| [PASS] Veg / Non-Veg Green Logo: Present and properly sized (3mm min diameter)          |
| [PASS] FSSAI Logo & 14-Digit License: Verified valid (Lic: 10019022009876)              |
| [WARN] Allergen Warning: "Milk" present in ingredients but lacks bold allergen box      |
| [FAIL] Nutritional Per-Serve Table: Missing added sugars breakdown under FSSAI 2020     |
|                                                                                         |
| Mandated Correction:                                                                    |
| "Under FSSAI Labelling Regulation 5(1), added sugars and saturated fats must be listed  |
| separately in the nutritional panel per 100g and per serving."                          |
+-----------------------------------------------------------------------------------------+
```

---

## 5. Recall Risk Intelligence (`/recall`)
**Goal**: ML-driven recall risk probability forecasting with SHAP explainability and rapid batch quarantine.

```
+-----------------------------------------------------------------------------------------+
| SafeFood AI > Proactive Recall Risk Engine                                              |
+-----------------------------------------------------------------------------------------+
| Active Production Batches:                                                              |
| Batch #            Product            Supplier          Risk Score     Status           |
| BATCH-MILK-202609A Fresh Cow Milk 1L  Sahyadri Co-op    0.12 (LOW)     [RELEASED]       |
| BATCH-PAN-202609B  Malai Paneer 200g  Sahyadri Co-op    0.78 (HIGH)    [QUARANTINED]    |
+-----------------------------------------------------------------------------------------+
| Batch Deep-Dive: BATCH-PAN-202609B (Predicted Risk: 78% HIGH)                           |
|                                                                                         |
| SHAP Feature Attribution Factors:                                                       |
|  Supplier Past Defect History     |===================| 31%                             |
|  Cold Storage Temp Excursion      |==============|     24%                              |
|  Lab Anomaly (High Coliform)      |============|       21%                              |
|  Customer Complaints Cluster      |========|           14%                              |
|  Recent Audit Observation         |======|             10%                              |
|                                                                                         |
| Recommended Mitigation:                                                                 |
| 1. Maintain quarantine hold on lot BATCH-PAN-202609B.                                   |
| 2. Initiate secondary microbiological pathogen incubation test.                         |
| [ Quarantine Batch ]   [ Notify QA Lead ]   [ Generate Recall Protocol ]               |
+-----------------------------------------------------------------------------------------+
```

---

## 6. Digital Audit & CAPA Workflow (`/audits`)
**Goal**: Full audit lifecycle from mobile checklist execution to finding resolution and QA closure.

```
+-----------------------------------------------------------------------------------------+
| SafeFood AI > Digital Audit & CAPA Workspace                                            |
+-----------------------------------------------------------------------------------------+
| Audit: "Annual FSSAI Schedule 4 Comprehensive Inspection - Pune Unit"                   |
| Auditor: Vikram Sen (Certified Lead Auditor) | Progress: 18/20 Clauses Audited           |
+-----------------------------------------------------------------------------------------+
| Checklist Item #14: Potable Water Certification (Schedule 4 - Part 2 Clause 4.2)        |
| [ ] Compliant    [X] Non-Conformance    [ ] Observation                                 |
|                                                                                         |
| Finding Narrative:                                                                      |
| "Overhead storage reservoir #2 disinfected 8 months ago. Exceeds statutory 6-month max."|
| Attached Evidence: [Photo: reservoir_inspection_tag.jpg]                                |
| Finding Severity: [HIGH]                                                                |
|                                                                                         |
| Assigned CAPA Action:                                                                   |
| Description: "Contract licensed vendor to drain, sanitize, and test reservoir #2."      |
| Assignee: Sanjay Kulkarni (Production Lead) | Due Date: 2026-09-26                      |
| Verification: Required by Pooja Nair (QA Head)                                          |
+-----------------------------------------------------------------------------------------+
```

---

## 7. Multilingual Voice AI Copilot (`/voice`)
**Goal**: Hands-free shopfloor QA assistance in English, Hindi, and Tamil with strict security confirmation gates.

```
+-----------------------------------------------------------------------------------------+
| SafeFood AI > Shopfloor Voice Copilot                                                   |
+-----------------------------------------------------------------------------------------+
| [Language Selected: Hindi (हिन्दी) / Tamil (தமிழ்) / English]                          |
|                                                                                         |
| Operator Voice Input: "बैच PAN-202609B का तापमान चेक करो"                              |
| Transcribed: "Batch PAN-202609B ka taapman check karo"                                  |
| Recognized Intent: QUERY_BATCH_TEMPERATURE (Target: BATCH-PAN-202609B)                   |
|                                                                                         |
| Copilot Voice Output:                                                                   |
| "बैच PAN-202609B का तापमान 7.2 डिग्री सेल्सियस रिकॉर्ड हुआ है। यह 4 डिग्री की सीमा     |
| से अधिक है। क्या आप इसे क्वारंटाइन में डालना चाहते हैं?"                                 |
|                                                                                         |
| [SAFETY CONFIRMATION POPUP]:                                                            |
| Operator Voice: "हाँ, क्वारंटाइन करो"                                                   |
| System: Voice command recognized. High-impact action requires biometric / PIN confirm:  |
| [Enter 4-digit QA PIN: **** ] -> [Confirm Quarantine]                                   |
+-----------------------------------------------------------------------------------------+
```
