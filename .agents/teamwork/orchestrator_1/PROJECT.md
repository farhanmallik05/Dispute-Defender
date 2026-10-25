# Project: Dispute Defender

## Architecture
Dispute Defender is an autonomous AI agent system for PayPal merchant dispute defense, combining real-time webhook ingestion, zero-trust PII sanitization, structured Vercel AI SDK triage, AG Grid command center, custom multipart PayPal REST submission, and immutable audit logging.

### System Data Flow
```
PayPal Webhook / Poll
         │
         ▼
[Module A: Ingestion & Verification] ──► [Disputes Store (SQLite / Drizzle)]
         │
         ▼
[Module B: Context Aggregator] (Merges order, items, tracking records)
         │
         ▼
[Module B: Zero-Trust PII Redactor] (Masks emails, phones, addresses, buyer names)
         │
         ├──► Redaction Diff Stored in DB
         ▼
[Module C: Autonomous Triage Agent] (Vercel AI SDK generateObject / Deterministic)
         │
         ▼
Status: AWAITING_APPROVAL (Dispute Queue & Command Center)
         │
         ▼ (Merchant Reviews & Clicks Action)
[Module D: Review & Approval UI] (Editable rebuttal, evidence checklist, diff viewer)
         │
         ▼
[Module E: PayPal REST Client] (Multipart POST /provide-evidence OR POST /accept-claim)
         │
         ▼
[Module F: Immutable Audit Trail] (Append-only log of every event, payload & API response)
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Signature-Verified Webhooks | Validate PayPal signature or handle gracefully with audit log | M1 | R1 |
| 2 | On-Demand Sandbox Sync | Polling routine fetching dispute headers from PayPal REST API | M1 | R1 |
| 3 | Context Aggregator | Merge order, item, message, and carrier tracking data | M1 | R2 |
| 4 | Zero-Trust PII Redactor | 100% PII masking while preserving tracking, amounts, and dates | M1 | R2 |
| 5 | Vercel AI SDK Triage Agent | Structured output with recommendation, confidence, checklist, rebuttal | M1 | R3 |
| 6 | Deterministic Triage Engine | Offline/fallback logic enforcing FIGHT for DELIVERED, ACCEPT for missing | M1 | R3 |
| 7 | Custom Multipart Evidence Client | POST /v1/customer/disputes/{id}/provide-evidence with dynamic tracking | M1 | R5 |
| 8 | Claim Acceptance REST Client | POST /v1/customer/disputes/{id}/accept-claim with HATEOAS validation | M1 | R5 |
| 9 | SQLite & Next.js Build Reliability | Resolve better-sqlite3 build/runtime bindings and Drizzle query fixes | M1 | Build |
| 10 | AG Grid Dispute Queue | High-performance grid with SLA countdown urgency badges & filters | M2 | R4 |
| 11 | Risk Amount Aggregation | KPI cards for capital at risk, urgent disputes, and pending count | M2 | R4 |
| 12 | 1-Click Review & Approval Screen | Full dispute detail screen with AI verdict and evidence checklist chips | M3 | R4 |
| 13 | Side-by-Side Redaction Diff Viewer | Visual diff comparing raw vs sanitized context | M3 | R4 |
| 14 | Editable Rebuttal & Click Guards | Rebuttal note editing and strict manual-click requirement | M3 | R4 |
| 15 | Immutable Audit Trail UI | Chronological chain of custody viewer with ISO timestamps | M4 | R6 |
| 16 | AG Grid Risk Analytics View | Analytics dashboard for dispute volume by reason, win rate, ROI | M4 | R6 |
| 17 | 4-Tier Opaque-Box E2E Test Suite | Comprehensive automated test harness covering Tiers 1-4 (25 tests) | M5 | AC |
| 18 | Adversarial Coverage Hardening | White-box stress testing, prompt injection defense, edge cases (Tier 5) | M5 | AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Pipeline & Backend Remediation | Fix Redactor address/phone regexes, fix e2e-runner.ts TS2322 type error, fix dynamic tracking, ensure exit 0 on tsc & build | None | IN_PROGRESS (Iteration 2) |
| M2 | AG Grid Dispute Queue & Command Center | Replace HTML table in `src/app/page.tsx` with AgGridReact, add styles, SLA badges, KPI cards | M1 | PLANNED |
| M3 | 1-Click Review & Approval Screen | Build `src/app/disputes/[id]/page.tsx` with AI verdict, editable rebuttal, redaction diff viewer | M1 | PLANNED |
| M4 | Immutable Audit Trail & Risk Analytics | Build `src/app/audit/page.tsx` and `src/app/analytics/page.tsx` | M1 | PLANNED |
| M5 | E2E Testing Suite & Adversarial Hardening | Implement E2E test runner, achieve 100% pass on Tiers 1-4, execute Tier 5 adversarial hardening | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Redactor ↔ Triage Agent
- Input: `RawDisputeContext` (contains buyer PII, order details, carrier tracking)
- Output: `RedactedContextBundle` containing:
  - `sanitizedText`: string (masked with `[EMAIL_REDACTED]`, `[PHONE_REDACTED]`, `[STREET_ADDRESS_REDACTED]`, `[BUYER_NAME_REDACTED]`, `[IP_REDACTED]`)
  - `redactionDiff`: `{ original: string, redacted: string, fieldsMasked: string[] }`
  - `preservedTracking`: `{ trackingNumber: string, carrierName: string, status: string }`

### Triage Agent ↔ Dispute Store
- Output: `TriageDecision` schema:
  - `recommendation`: `'FIGHT' | 'ACCEPT'`
  - `confidenceScore`: number (0–100)
  - `reason`: string
  - `evidenceChecklist`: string[] (citing exact source fields)
  - `draftRebuttal`: string
  - `requiredEvidenceType`: `'PROOF_OF_FULFILLMENT' | 'PROOF_OF_REFUND' | 'OTHER'`

### Approval Route ↔ PayPal Evidence Client
- Endpoint: `POST /api/disputes/[id]/approve`
- Action: `'SUBMIT_EVIDENCE' | 'ACCEPT_CLAIM'`
- Dynamic Carrier Sourcing: MUST read `trackingData` from `disputeContexts` associated with `disputeId`
- Multipart Payload: `input` field containing JSON:
  - `evidence_type`: string
  - `evidence_info`: `{ tracking_info: [{ carrier_name, tracking_number }] }`
  - `notes`: string (containing merchant-edited draft rebuttal)
