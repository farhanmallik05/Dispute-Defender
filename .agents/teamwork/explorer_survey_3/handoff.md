# Handoff Report: Target Architecture, Inter-Module Contracts & Opaque-Box E2E Testing Strategy

**Agent:** explorer_survey_3  
**Role:** System Architect & E2E Integration Explorer  
**Working Directory:** `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\explorer_survey_3`  
**Timestamp:** 2026-10-25T19:50:00Z  

---

## 1. Observation

Direct file observations from the codebase and specifications:

1. **Authoritative Requirements and Architecture Documents**:
   - `ORIGINAL_REQUEST.md` (lines 12–32) mandates 6 core requirements: R1 (Real-Time & Polling Dispute Ingestion), R2 (Context Aggregation & Zero-Trust PII Redaction), R3 (Autonomous Triage Agent with Vercel AI SDK), R4 (Merchant Command Center with AG Grid Queue & 1-Click Approval Screen), R5 (Custom Multipart Evidence Submission & Claim Acceptance via PayPal REST API), and R6 (Immutable Audit Trail & Risk Analytics).
   - `ORIGINAL_REQUEST.md` (line 25) explicitly mandates: *"Under no circumstances may the system submit evidence or accept a claim without explicit merchant click."*
   - `plan/02_ARCHITECTURE_AND_SPECS.md` (lines 69–78) identifies the critical gap in the official PayPal Agent Toolkit: it lacks `provide-evidence`, necessitating a custom multipart REST client.

2. **Existing Implementation in `dispute-defender/src`**:
   - `src/lib/db/schema.ts` (lines 7–58) defines Drizzle ORM tables for SQLite: `disputes`, `dispute_contexts`, `triage_decisions`, and `audit_logs`.
   - `src/lib/agent/redactor.ts` (lines 10–20, 36–86) defines regex patterns and `sanitizeText()` / `sanitizeDisputeContext()` for masking emails, phones, IPs, street addresses, and known buyer names with explicit tokens (`[EMAIL_REDACTED]`, `[PHONE_REDACTED]`, `[IP_REDACTED]`, `[STREET_ADDRESS_REDACTED]`, `[BUYER_NAME_REDACTED]`).
   - `src/test/redactor.test.ts` (lines 17–125) implements 5 unit tests validating 100% masking of sensitive fields while preserving carrier names, tracking numbers, and amounts.
   - `src/lib/agent/triage.ts` (lines 15–48) implements `runTriageAgent()` using Vercel AI SDK (`generateObject`) with Google Gemini 2.5 / OpenAI GPT-4o, and falls back to `generateDeterministicTriageVerdict()` when offline or in test environments.
   - `src/lib/paypal/disputes.ts` (lines 105–152) implements `submitDisputeEvidence()` using `multipart/form-data` with the `input` JSON payload field, and lines 157–189 implement `acceptPayPalDisputeClaim()`.
   - `src/app/api/webhooks/paypal/route.ts` (lines 9–72) verifies cryptographic signatures using `verifyPayPalWebhookSignature()` and invokes `processDisputePipeline()`.

3. **Critical Codebase Gaps & Defects Observed**:
   - **Critical Bug in Approval Route**: In `src/app/api/disputes/[id]/approve/route.ts` lines 69–70:
     ```typescript
     trackingNumber: '122533485',
     carrierName: 'FEDEX',
     ```
     The carrier and tracking number are hardcoded to FedEx `122533485` for all disputes during evidence submission, rather than reading the actual tracking data from `disputeContexts`!
   - **Missing UI Pages**: In `src/app/`, `disputes/[id]/page.tsx` does not exist, causing a 404 error when merchants click "Review & Approve" from the queue. Furthermore, `app/analytics/page.tsx` and `app/audit/page.tsx` do not exist despite being linked in `app/layout.tsx:37-41`.
   - **Queue Not Yet Powered by AG Grid**: In `src/app/page.tsx` lines 181–283, the queue is rendered as a standard HTML `<table>` rather than using `ag-grid-react`, despite `ag-grid-community` and `ag-grid-react` being installed in `package.json`.

---

## 2. Logic Chain

1. **From Requirements to Module Boundaries**:
   - Based on R1–R6 in `ORIGINAL_REQUEST.md` (Observation 1), the system naturally decomposes into 6 decoupled modules: Module A (Ingestion & Webhook Verify), Module B (Context Aggregation & Zero-Trust Redactor), Module C (Autonomous Triage Agent), Module D (Merchant Command Center), Module E (Custom PayPal REST Client), and Module F (Immutable Audit Trail & Persistence).
2. **From Core Privacy & Safety Mandates to Architecture Invariants**:
   - Because R2 demands Zero-Trust PII redaction before LLM inference and R4 forbids automated submission without merchant authorization (Observation 1), the architecture must enforce two strict invariants:
     - Invariant 1: Module C accepts only `RedactedContextBundle`. The LLM service never receives raw dispute or buyer payloads.
     - Invariant 2: Module E is invoked solely by the merchant approval endpoint `POST /api/disputes/[id]/approve`. The autonomous pipeline strictly stops at status `AWAITING_APPROVAL`.
3. **From Codebase Audit to Defect Remediation**:
   - Observation 3 shows that `approve/route.ts:69-70` hardcodes FedEx tracking `122533485`. When a merchant defends an order shipped via USPS or UPS, invalid evidence would be transmitted to PayPal. This requires an immediate fix: read `trackingData` from `disputeContexts`, parse it, and extract the real carrier and tracking number.
   - Observation 3 also identifies missing frontend pages (`disputes/[id]`, `analytics`, `audit`) and the lack of AG Grid integration. These form the primary implementation deliverables for the subsequent phases.
4. **From System Architecture to 4-Tier Opaque-Box E2E Testing**:
   - To guarantee complete coverage without depending on internal implementation details, testing must occur through external HTTP boundaries.
   - A dual-mode harness (`INTEGRITY_MODE=sandbox` vs `INTEGRITY_MODE=demo`) allows real PayPal API verification when credentials exist, and 100% deterministic local pass rates when offline.
   - The 4-Tier methodology provides:
     - Tier 1: Core Feature Coverage (Happy paths R1–R6, 8 test cases)
     - Tier 2: Boundary Value Analysis (SLA 48h urgency partition, extreme values, sparse payloads, 6 test cases)
     - Tier 3: Combinatorial & Pairwise Testing (6 orthogonal scenarios covering reasons, tracking statuses, and merchant actions)
     - Tier 4: Real-World Workflows & Adversarial Stress (Full lifecycle, prompt injection defense, idempotency, LLM failure fallback, 5 test cases)

---

## 3. Caveats

1. **Live Carrier Tracking Aggregation**: The codebase currently relies on mocked carrier tracking info during context aggregation. In a production merchant deployment, an integration with a live carrier tracking API (e.g., Shippo, EasyPost, or PayPal Shipping Trackers API `/v1/shipping/trackers`) is required.
2. **PayPal Sandbox Dispute Seeding**: PayPal sandbox disputes created via the developer dashboard sometimes do not transition to `WAITING_FOR_SELLER_RESPONSE` automatically unless advanced via sandbox simulator APIs (`require-evidence`). The offline seeder in `src/scripts/seed-disputes.ts` provides a reliable local substitute.
3. **AG Grid Styling**: While `ag-grid-community` is installed, custom CSS or AG Grid Quartz theme imports (`ag-theme-quartz.css`) must be imported in `layout.tsx` or `globals.css` when replacing the HTML table.

---

## 4. Conclusion

1. The target architecture, inter-module contracts, and module boundaries for Dispute Defender are fully specified and documented in `survey_report.md`.
2. The core data pipeline (Ingestion ➔ Redaction ➔ Triage Heuristic / LLM ➔ Database Persistence ➔ Audit Logging) is fundamentally sound, typed, and executable.
3. Three critical items require immediate orchestration assignment:
   - **Fix Defect R-01**: Dynamically extract carrier name and tracking number in `src/app/api/disputes/[id]/approve/route.ts` instead of hardcoding `122533485`.
   - **Build Missing Frontend Pages**: Create `src/app/disputes/[id]/page.tsx` (Review & Approval Screen with Redaction Diff Modal), `src/app/audit/page.tsx` (Audit Log Viewer), and `src/app/analytics/page.tsx` (Risk Analytics).
   - **Upgrade Queue to AG Grid**: Replace the standard table in `src/app/page.tsx` with an `AgGridReact` component featuring countdown renderers.
4. The 4-tier opaque-box testing strategy provides a complete verification blueprint with 25 total test cases to guarantee demo integrity and robust hackathon delivery.

---

## 5. Verification Method

To independently verify the observations, codebase structure, and findings reported:

1. **Verify Unit Tests for Zero-Trust Redaction**:
   ```bash
   cd "d:\AI-Lab\Hackathon\Paypal AI Hackathon\dispute-defender"
   npm run test:redactor
   ```
   *Expected Result*: All 5 unit test assertions pass with 100% entity masking and tracking preservation.

2. **Verify Hardcoded Tracking Defect in Codebase**:
   Inspect `src/app/api/disputes/[id]/approve/route.ts` lines 69–70:
   *Observation Confirmation*: Confirm lines `trackingNumber: '122533485'` and `carrierName: 'FEDEX'` are hardcoded.

3. **Verify Seed Execution and Pipeline Transition**:
   ```bash
   npm run seed
   ```
   *Expected Result*: Processes `PP-D-27801`, `PP-D-27802`, and `PP-D-27803` through the pipeline into `AWAITING_APPROVAL` with correct `FIGHT` and `ACCEPT` recommendations.

4. **Verify TypeScript Build Status**:
   ```bash
   npm run build
   ```
   *Expected Result*: Confirms compilation succeeds and highlights any missing route pages.

5. **Invalidation Conditions**:
   - If `src/app/disputes/[id]/page.tsx` already exists and is functional, the finding regarding the missing approval page is invalidated.
   - If `approve/route.ts` already dynamically resolves tracking from `disputeContexts`, the finding regarding defect R-01 is invalidated.
