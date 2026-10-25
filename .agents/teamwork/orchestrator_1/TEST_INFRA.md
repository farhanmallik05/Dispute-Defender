# E2E Test Infra: Dispute Defender

## Test Philosophy
- Opaque-box, requirement-driven. Tests interact via external HTTP boundaries and CLI commands.
- Dual-mode execution:
  - `INTEGRITY_MODE=demo`: Hermetic local execution with deterministic mocking, verifying 100% of pipeline invariants.
  - `INTEGRITY_MODE=sandbox`: Live execution verifying PayPal sandbox REST API integration.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workloads.

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|-------------|:------:|:------:|:------:|:------:|
| 1 | Webhook Signature Verification | R1 | TC-1.1 | TC-2.1 | TC-3.1 | TC-4.1 |
| 2 | Sandbox Polling Sync | R1 | TC-1.2 | TC-2.2 | TC-3.2 | TC-4.2 |
| 3 | Context Aggregation | R2 | TC-1.3 | TC-2.3 | TC-3.3 | TC-4.3 |
| 4 | Zero-Trust PII Redaction | R2 | TC-1.4 | TC-2.4 | TC-3.4 | TC-4.4 |
| 5 | Vercel AI SDK Triage Agent | R3 | TC-1.5 | TC-2.5 | TC-3.5 | TC-4.5 |
| 6 | AG Grid Dispute Queue | R4 | TC-1.6 | TC-2.6 | TC-3.6 | TC-4.1 |
| 7 | 1-Click Review & Approval UI | R4 | TC-1.7 | TC-2.7 | TC-3.7 | TC-4.2 |
| 8 | PayPal REST Evidence & Acceptance | R5 | TC-1.8 | TC-2.8 | TC-3.8 | TC-4.3 |
| 9 | Immutable Audit Trail & Analytics | R6 | TC-1.9 | TC-2.9 | TC-3.9 | TC-4.4 |

## Test Architecture
- Test Runner: `npm run test:e2e` (invokes `src/test/e2e-runner.ts`)
- Redactor Unit Test Runner: `npm run test:redactor` (invokes `src/test/redactor.test.ts`)
- TypeScript Validation: `npx tsc --noEmit`
- Next.js Build Validation: `npm run build`

## Test Tiers Breakdown
### Tier 1: Core Feature Coverage (Happy Paths)
- TC-1.1: Webhook ingestion with valid signature creates dispute record.
- TC-1.2: Sync Sandbox fetches disputes and updates local database.
- TC-1.3: Context aggregator combines order, tracking, and item metadata.
- TC-1.4: Zero-Trust redactor masks emails, phones, addresses, and buyer names 100%.
- TC-1.5: Triage agent outputs valid structured JSON matching `TriageDecision` schema.
- TC-1.6: Delivered tracking yields FIGHT recommendation (>90% confidence) with PROOF_OF_FULFILLMENT.
- TC-1.7: Missing tracking yields ACCEPT recommendation (>90% confidence).
- TC-1.8: Approve route submits multipart evidence with dynamic tracking data.
- TC-1.9: Accept claim route submits acceptance payload and logs audit entry.

### Tier 2: Boundary Value Analysis
- TC-2.1: SLA < 48 hours remaining triggers URGENT countdown badge (<24h CRITICAL).
- TC-2.2: Extreme dispute amounts ($0.01 micro-transaction vs $10,000.00 high value).
- TC-2.3: Sparse context (buyer message empty, no tracking number available).
- TC-2.4: Complex street addresses (`Terrace`, `Circle`, `Way`, `Blvd`, international formats).
- TC-2.5: Dual HATEOAS link styles (`provide-evidence` vs `provide_evidence`).

### Tier 3: Pairwise Combinations
- TC-3.1: MERCHANDISE_OR_SERVICE_NOT_RECEIVED + DELIVERED tracking + Merchant Approve.
- TC-3.2: MERCHANDISE_OR_SERVICE_NOT_RECEIVED + MISSING tracking + Merchant Accept.
- TC-3.3: NOT_AS_DESCRIBED + RETURN_DELIVERED + Merchant Accept & Refund.
- TC-3.4: NOT_AS_DESCRIBED + IN_TRANSIT tracking + Merchant Rebuttal Edit + Submit.

### Tier 4: Real-World Workloads & Security Stress
- TC-4.1: End-to-end full dispute lifecycle (Ingest -> Redact -> Triage -> Edit -> Approve -> PayPal -> Audit).
- TC-4.2: Adversarial prompt injection defense (buyer message contains system instruction injection).
- TC-4.3: Double-click idempotency guard (concurrent submit requests for same dispute).
- TC-4.4: Complete audit chain verification (every lifecycle step verified in audit log).

## Coverage Thresholds
- Total E2E test cases: >= 25
- Pass criteria: 100% of test cases must pass with exit code 0.
