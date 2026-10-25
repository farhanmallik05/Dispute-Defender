# Dispute Defender: Comprehensive Specification Survey & Technical Contract Report

**Document ID:** SPEC-SURVEY-001  
**Investigator:** `spec_miner_survey_1`  
**Date:** 2026-10-25T19:42:00Z  
**Target Milestone:** PayPal AI Hackathon  
**Workspace:** `d:\AI-Lab\Hackathon\Paypal AI Hackathon\dispute-defender`  
**Integrity Mode:** DEMO / PROD-READY HYBRID  

---

## Executive Summary
This report provides an exhaustive specification extraction and technical contract audit for **Dispute Defender**, an autonomous AI agent system designed to defend PayPal merchants against unfair chargebacks and dispute deadlines. 

The investigation examined:
1. `ORIGINAL_REQUEST.md` (the authoritative user requirements)
2. All planning and architectural documents in `plan/` (PRD, Architecture, Sponsor Alignment, Timeline, Risk Matrix, Demo Script)
3. Existing codebase in `dispute-defender/src/` (PayPal REST client, PII redactor, Vercel AI SDK schemas, Drizzle SQLite schema, API routes, and test suites)
4. Authoritative PayPal REST APIs and developer references via Context7 documentation (`/websites/developer_paypal_api_rest` and `/llmstxt/paypal_ai_llms_txt`).

---

## 1. Feature Inventory & Mapping (R1 – R6 + Acceptance Criteria)

### Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| **1** | **Ingestion (R1)** | Real-Time Webhook Receiver | Ingests `CUSTOMER.DISPUTE.*` events via HTTP POST. Cryptographically verifies PayPal webhook signatures using the verification endpoint. Dispatches payload into ingestion pipeline. | HTTP headers (`paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`), raw JSON body | HTTP 200 `{ received: true, disputeId, eventType }` | HTTP 401 if signature validation fails (`Invalid webhook signature`); HTTP 500 on parse error | `ORIGINAL_REQUEST.md` (R1), `src/app/api/webhooks/paypal/route.ts` |
| **2** | **Ingestion (R1)** | Sandbox Sync Engine / Polling Routine | On-demand polling routine ("Sync Sandbox") that fetches dispute summaries from PayPal Sandbox API (`/v1/customer/disputes?page_size=10`) or falls back to synthetic test seed generation if credentials/sandbox are unavailable. | HTTP POST `/api/disputes/sync` (optional `disputeState`, `pageSize`) | HTTP 200 `{ success: true, count, source }` | Falls back to synthetic seed dispute if PayPal credentials are missing or API request fails | `ORIGINAL_REQUEST.md` (R1), `src/app/api/disputes/sync/route.ts` |
| **3** | **Context Aggregation (R2)** | Dispute Context Assembler | Merges dispute header data with order records (`seller_transaction_id`, item quantities, amounts), carrier tracking information (FedEx/UPS/USPS), and buyer message history into a unified `DisputeContextBundle`. | `PayPalDispute` object, order transaction ID, shipment tracking array, buyer messages | `DisputeContextBundle` | Logs audit event; gracefully handles missing tracking with empty tracking array | `ORIGINAL_REQUEST.md` (R2), `src/lib/workflows/dispute-pipeline.ts` |
| **4** | **Data Privacy (R2)** | Zero-Trust PII Redaction Engine | Sanitizes buyer PII before external LLM inference. Masks emails, phone numbers, IP addresses, street addresses, and buyer names with deterministic tokens while strictly preserving carrier names, tracking numbers, amounts, dates, and dispute reasons. | Raw `DisputeContextBundle`, known buyer names list | `RedactedContextBundle` with `redactionAudit` counts | Fallback to original text if sanitization passes null/empty string | `ORIGINAL_REQUEST.md` (R2), `src/lib/agent/redactor.ts` |
| **5** | **Data Privacy (R2)** | Merchant Redaction Diff Viewer | UI inspector that compares raw vs. redacted dispute context side-by-side with token replacement metrics, proving zero customer PII leakage to the model. | `disputeContexts` table (`rawJson` vs `redactedContext`) | Side-by-side JSON/text comparison with count badges | Displays error state if context record is missing | `ORIGINAL_REQUEST.md` (R2, R4), `plan/01_PRD_AND_VISION.md` |
| **6** | **AI Triage (R3)** | Structured AI Triage Agent | Autonomous triage agent using Vercel AI SDK (`generateObject`) and Zod schema. Formulates verdict (`FIGHT` vs `ACCEPT`), confidence score (0-100), executive reason, itemized evidence checklist with source fields, draft rebuttal note, and required evidence type. | `RedactedContextBundle` | `TriageVerdict` JSON matching `TriageVerdictSchema` | Falls back to deterministic heuristic rules if LLM keys are absent or inference throws | `ORIGINAL_REQUEST.md` (R3), `src/lib/agent/triage.ts` |
| **7** | **AI Triage (R3)** | Zero-Hallucination Policy & Fact Attribution | Strict instruction and schema forcing the model to cite exact source fields (e.g. `sanitizedShipmentInfo[0].status`) for every checklist item. Prohibits inventing tracking numbers or unverified facts. | LLM System Prompt instructions & Zod schema descriptions | Verified boolean + source attribute strings in checklist | Schema validation error in Vercel AI SDK if malformed | `ORIGINAL_REQUEST.md` (R3), `src/lib/agent/prompts.ts` |
| **8** | **UI / Command Center (R4)** | Dispute Command Center Queue | High-performance merchant queue displaying disputes sorted by seller response deadline (`seller_response_due_date`). Features dynamic SLA urgency countdown badges (<24h, <48h, <72h), amount-at-risk metric cards, and filter tabs. | Database records from `disputes` joined with `triageDecisions` | Interactive data table / AG Grid with custom cell renderers | Renders empty state if no disputes match active filter | `ORIGINAL_REQUEST.md` (R4), `src/app/page.tsx` |
| **9** | **UI / Command Center (R4)** | 1-Click Review & Approval Interface | Dedicated screen displaying AI verdict banner, confidence badge, itemized evidence checklist with source badges, editable draft rebuttal textarea, and two 1-click execution buttons. | Dispute ID, loaded context, triage decision record | Review UI, merchant edited notes, approval dispatch | Displays 404 if dispute ID is invalid | `ORIGINAL_REQUEST.md` (R4), `plan/02_ARCHITECTURE_AND_SPECS.md` |
| **10** | **UI / Safety (R4)** | Non-Negotiable Human Approval Gate | Strict architectural invariant preventing autonomous submission of evidence or claim acceptance without explicit merchant button click. | Merchant user click on UI button | Authorization to trigger `POST /api/disputes/[id]/approve` | System rejects any unauthenticated or background autopilot submission | `ORIGINAL_REQUEST.md` (R4, AC), `src/app/api/disputes/[id]/approve/route.ts` |
| **11** | **PayPal Client (R5)** | Custom Multipart Evidence Submission Client | Custom HTTP client calling `POST /v1/customer/disputes/{id}/provide-evidence` using `multipart/form-data`. Encodes structured JSON inside the `input` form field containing evidence type, carrier tracking info, and rebuttal notes. | `disputeId`, `evidenceType`, `trackingNumber`, `carrierName`, `notes` | HTTP 200/204 `{ success: true, disputeId }` | HTTP 400 with PayPal validation error text; throws formatted Error | `ORIGINAL_REQUEST.md` (R5), `src/lib/paypal/disputes.ts` |
| **12** | **PayPal Client (R5)** | Claim Acceptance & Refund Client | REST client calling `POST /v1/customer/disputes/{id}/accept-claim` with `accept_claim_type` (`REFUND`) and optional merchant note to concede unwinnable disputes and avoid dispute penalty fees. | `disputeId`, `acceptClaimType`, `note` | HTTP 200/204 `{ success: true, disputeId }` | HTTP 400 if dispute state does not permit claim acceptance | `ORIGINAL_REQUEST.md` (R5), `src/lib/paypal/disputes.ts` |
| **13** | **PayPal Client (R5)** | Dynamic HATEOAS Link Inspection | Pre-flight validation inspecting the `links` array of `GET /v1/customer/disputes/{id}` to verify that `provide-evidence` or `accept-claim` is legally allowed before triggering submission. | `dispute.links` array | Object `{ canProvideEvidence, canAcceptClaim, canMakeOffer, canAppeal, provideEvidenceUrl }` | Disables submission buttons if corresponding `rel` is missing | `ORIGINAL_REQUEST.md` (R5), `src/lib/paypal/disputes.ts` |
| **14** | **Audit & Analytics (R6)** | Immutable Append-Only Audit Trail | Records every lifecycle event: `WEBHOOK_RECEIVED`, `SYNC_DISPUTE_FETCHED`, `CONTEXT_AGGREGATED`, `PII_REDACTED`, `TRIAGE_EVALUATED`, `MERCHANT_EDITED_NOTES`, `MERCHANT_APPROVED_FIGHT`, `MERCHANT_APPROVED_ACCEPT`, `PAYPAL_EVIDENCE_SUBMITTED`, `PAYPAL_CLAIM_ACCEPTED`. | Event metadata, actor (`SYSTEM`, `AGENT`, `MERCHANT`), dispute ID, JSON snapshot, ISO timestamp | Appended row in SQLite `audit_logs` | Logs insertion failure to console without crashing pipeline | `ORIGINAL_REQUEST.md` (R6), `src/lib/db/audit.ts` |
| **15** | **Audit & Analytics (R6)** | Risk Analytics Dashboard | AG Grid-powered analytics view displaying capital protected ($), win rate (%), dispute volume grouped by reason, and resolution velocity metrics. | Aggregated records from `disputes`, `triage_decisions`, and `audit_logs` | Visual charts/grid breakdown | Graceful empty fallback when volume is zero | `ORIGINAL_REQUEST.md` (R6), `plan/03_SPONSOR_ALIGNMENT_STRATEGY.md` |
| **16** | **Sandbox Tooling (Stretch)** | Sandbox State Simulator | Developer utility to advance dispute states in PayPal sandbox via `POST /v1/customer/disputes/{id}/require-evidence` for live video demonstration and testing. | `disputeId`, action (`BUYER_EVIDENCE`) | HTTP 200/204 `{ success: true }` | HTTP 400 if state change is disallowed by sandbox | `plan/02_ARCHITECTURE_AND_SPECS.md`, `src/lib/paypal/disputes.ts` |

---

## 2. PayPal REST API v1 Customer Disputes Specification

### 2.1 Webhook Signature Verification Contract
- **Endpoint:** `POST https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature` (or `api-m.paypal.com` for production)
- **Authentication:** `Authorization: Bearer <ACCESS_TOKEN>`
- **Content-Type:** `application/json`
- **Incoming Header Mapping:**
  - `paypal-auth-algo` -> `auth_algo` (e.g. `SHA256withRSA`)
  - `paypal-cert-url` -> `cert_url` (e.g. `https://api.sandbox.paypal.com/v1/notifications/certs/...`)
  - `paypal-transmission-id` -> `transmission_id`
  - `paypal-transmission-sig` -> `transmission_sig`
  - `paypal-transmission-time` -> `transmission_time`
  - Configured webhook ID -> `webhook_id`
  - Complete incoming event body -> `webhook_event`
- **Request Body Schema:**
```json
{
  "auth_algo": "SHA256withRSA",
  "cert_url": "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-...",
  "transmission_id": "db49fb10-1343-11ef-ac58-e32457403f67",
  "transmission_sig": "ab2tJk1VCFm4Eq...",
  "transmission_time": "2024-05-16T05:19:23Z",
  "webhook_id": "0NH55953DH663215D",
  "webhook_event": {
    "id": "WH-...",
    "event_version": "1.0",
    "create_time": "2026-10-25T10:15:00Z",
    "resource_type": "dispute",
    "event_type": "CUSTOMER.DISPUTE.CREATED",
    "resource": { /* PayPalDispute */ }
  }
}
```
- **Response Schema:**
```json
{
  "verification_status": "SUCCESS" // or "FAILURE"
}
```
- **Critical Verification Rule:** Per PayPal REST docs, `webhook_event` must match the exact raw JSON received over the wire. Parsing into a language dictionary and re-serializing can mutate key ordering or whitespace, triggering unexpected `FAILURE` verification responses.

---

### 2.2 Dispute Listing & Polling (`GET /v1/customer/disputes`)
- **Endpoint:** `GET https://api-m.sandbox.paypal.com/v1/customer/disputes`
- **Query Parameters:**
  - `page_size` (integer, min 1, max 50, default 10)
  - `dispute_state` (string, comma-separated enum: `REQUIRED_ACTION`, `REQUIRED_OTHER_PARTY_ACTION`, `UNDER_PAYPAL_REVIEW`, `RESOLVED`, `OPEN_INQUIRIES`, `APPEALABLE`)
  - `disputed_transaction_id` (string, filters disputes by specific transaction ID)
  - `start_time` (string, ISO 8601 date-time)
- **Response Schema (200 OK):**
```json
{
  "items": [
    {
      "dispute_id": "PP-D-27801",
      "create_time": "2026-10-25T10:15:00.000Z",
      "update_time": "2026-10-25T10:15:00.000Z",
      "dispute_amount": { "currency_code": "USD", "value": "189.00" },
      "status": "WAITING_FOR_SELLER_RESPONSE",
      "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
      "dispute_state": "REQUIRED_ACTION",
      "dispute_life_cycle_stage": "CHARGEBACK",
      "seller_response_due_date": "2026-11-04T10:15:00.000Z",
      "links": [
        { "href": "...", "rel": "self", "method": "GET" }
      ]
    }
  ],
  "total_items": 1,
  "links": [
    { "href": "...", "rel": "self", "method": "GET" }
  ]
}
```

---

### 2.3 Dispute Details (`GET /v1/customer/disputes/{id}`)
- **Endpoint:** `GET https://api-m.sandbox.paypal.com/v1/customer/disputes/{dispute_id}`
- **Path Parameter:** `dispute_id` (string, e.g. `PP-D-27801`)
- **Key Response Fields:**
  - `dispute_id` (string)
  - `status`: `OPENED` | `WAITING_FOR_BUYER_RESPONSE` | `WAITING_FOR_SELLER_RESPONSE` | `UNDER_REVIEW` | `RESOLVED`
  - `reason`: `MERCHANDISE_OR_SERVICE_NOT_RECEIVED` | `MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED` | `UNAUTHORISED` | `CREDIT_NOT_PROCESSED` | `DUPLICATE_TRANSACTION` | `INCORRECT_TRANSACTION_AMOUNT` | `PAYMENT_BY_OTHER_MEANS` | `CANCELED_RECURRING_BILLING` | `PROBLEM_WITH_REMITTANCE` | `OTHER`
  - `dispute_life_cycle_stage`: `INQUIRY` | `CHARGEBACK` | `PRE_ARBITRATION` | `ARBITRATION`
  - `dispute_state`: `REQUIRED_ACTION` | `REQUIRED_OTHER_PARTY_ACTION` | `UNDER_PAYPAL_REVIEW` | `RESOLVED`
  - `seller_response_due_date` (ISO 8601 timestamp)
  - `disputed_transactions`: Array of transactions containing `seller_transaction_id`, `buyer_transaction_id`, `gross_amount`, `buyer` object (`name`, `email`, `phone`), `seller` object, and `items` array (`item_name`, `item_cost`, `quantity`).
  - `messages`: Array of messages posted by `BUYER`, `SELLER`, or `PAYPAL`.
  - `evidences`: Array of existing submitted evidence objects.
  - `allowed_response_options`: Object specifying allowed actions (`accept_claim`, `make_offer`).
  - `links`: Array of HATEOAS links (`self`, `provide_evidence` / `provide-evidence`, `accept_claim` / `accept-claim`, `send_message`, `make_offer`, `escalate`, `appeal`).

---

### 2.4 Provide Evidence (`POST /v1/customer/disputes/{id}/provide-evidence`)
- **Endpoint:** `POST https://api-m.sandbox.paypal.com/v1/customer/disputes/{id}/provide-evidence`
- **Prerequisite State:** Dispute MUST be in `WAITING_FOR_SELLER_RESPONSE` with `dispute_state: REQUIRED_ACTION`.
- **HATEOAS Gate:** Dispute `links` MUST contain `rel: "provide-evidence"` or `rel: "provide_evidence"`.
- **Content-Type:** `multipart/form-data; boundary=...`
- **Form-Data Parts:**
  1. `input`: Stringified JSON with `Content-Type: application/json`
  2. `file1` (optional): Binary or PDF document attachment (e.g. `application/pdf`)
- **JSON Schema of `input` Part:**
```json
{
  "evidences": [
    {
      "evidence_type": "PROOF_OF_FULFILLMENT", // or "PROOF_OF_REFUND" or "OTHER"
      "evidence_info": {
        "tracking_info": [
          {
            "carrier_name": "FEDEX", // FEDEX, UPS, USPS, DHL, OTHER, etc.
            "tracking_number": "122533485"
          }
        ],
        "refund_ids": [ "..." ] // Required if evidence_type == PROOF_OF_REFUND
      },
      "notes": "Item delivered on Oct 24, 2026 via FedEx tracking 122533485. Delivery confirmed prior to dispute filing."
    }
  ]
}
```
- **Allowed `evidence_type` values:**
  - `PROOF_OF_FULFILLMENT` (Required when submitting carrier tracking)
  - `PROOF_OF_REFUND` (Required when submitting prior refund ID)
  - `PROOF_OF_DELIVERY_SIGNATURE`
  - `PROOF_OF_RECEIPT_COPY`
  - `RETURN_POLICY`
  - `BILLING_AGREEMENT`
  - `APPEAL_AFFIDAVIT`
  - `PROOF_OF_RESIPMENT_OR_REFUND`
  - `OTHER`
- **Response:**
  - `200 OK` with updated dispute links:
  ```json
  {
    "links": [
      {
        "href": "https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27801",
        "rel": "self",
        "method": "GET"
      }
    ]
  }
  ```
  - Or `204 No Content`

---

### 2.5 Accept Claim (`POST /v1/customer/disputes/{id}/accept-claim`)
- **Endpoint:** `POST https://api-m.sandbox.paypal.com/v1/customer/disputes/{id}/accept-claim`
- **HATEOAS Gate:** Dispute `links` MUST contain `rel: "accept-claim"` or `rel: "accept_claim"`.
- **Headers:**
  - `Authorization: Bearer <ACCESS_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Schema:**
```json
{
  "accept_claim_type": "REFUND", // Options from dispute allowed_response_options: "REFUND", "PARTIAL_REFUND", "REFUND_WITH_RETURN", "REFUND_WITH_REPLACEMENT"
  "note": "Merchant agrees to issue a full refund to the buyer."
}
```
- **Response:** `200 OK` (with HATEOAS link to dispute) or `204 No Content`.
- **Side Effect:** Automatically closes dispute in buyer's favor, refunds transaction amount from seller balance, and avoids additional dispute administrative penalty fees.

---

## 3. Zero-Trust PII Redaction Specification

### 3.1 Masking Rules Matrix

| Field | Source Location in Context | Detection Mechanism | Replacement Token | Preservation Constraint |
|---|---|---|---|---|
| **Buyer Email** | `dispute.disputed_transactions[].buyer.email`, messages text | Regex: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b` | `[EMAIL_REDACTED]` | Merchant business email preserved if in seller block |
| **Buyer Phone** | `buyer.phone.national_number`, messages text | Regex: `(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b` | `[PHONE_REDACTED]` | Transaction timestamps and dates must NOT be matched |
| **Street Address** | Buyer address, messages text | Regex street patterns (numbers + Street, St, Ave, Road, Rd, Blvd, Drive, Dr, Lane, Way, Terrace, Ter, Court, Ct, etc.) | `[STREET_ADDRESS_REDACTED]` | City/State/Country may be retained for general jurisdiction, or masked if part of full address line |
| **Buyer Full Name** | `dispute.disputed_transactions[].buyer.name`, message mentions | Exact token match from `buyer.name` (case-insensitive boundary regex) | `[BUYER_NAME_REDACTED]` | Merchant/Seller company name and carrier names (FedEx, UPS) MUST NOT be masked |
| **IP Address** | Transaction supplementary logs, headers | Regex: IPv4 `(?:\d{1,3}\.){3}\d{1,3}` and standard IPv6 | `[IP_REDACTED]` | Order IDs and tracking numbers MUST NOT be matched |

### 3.2 Strictly Preserved Data Elements
The following elements must NEVER be modified or masked by the Redaction Engine:
- **Tracking Numbers** (e.g. `122533485`, `9400111899562534567890`, `1Z9999999999999999`)
- **Carrier Names** (e.g. `FEDEX`, `UPS`, `USPS`, `DHL`)
- **Carrier Delivery Statuses** (`DELIVERED`, `IN_TRANSIT`, `SHIPPED`, `CANCELLED`)
- **Delivery & Shipment Timestamps** (e.g. `2026-10-23T14:30:00Z`)
- **Order Identification** (`orderId`, `seller_transaction_id`)
- **Item Details** (`item_name`, `quantity`, `item_cost`)
- **Dispute Financial Amounts** (`dispute_amount.value`, `currency_code`)
- **Dispute Reason & State** (`reason`, `status`, `dispute_life_cycle_stage`, `seller_response_due_date`)

### 3.3 Redaction Diff Specification
The system must generate and persist a structured diff object:
```json
{
  "rawContext": { /* Full unredacted bundle */ },
  "redactedContext": { /* Sanitized bundle sent to LLM */ },
  "redactionAudit": {
    "emailsRedactedCount": 2,
    "namesRedactedCount": 1,
    "phonesRedactedCount": 1,
    "addressesRedactedCount": 1
  }
}
```
In the UI, the diff viewer must present a two-column or toggle view highlighting redacted spans and reporting replacement counts to give merchants 100% verification confidence before approving the dossier.

---

## 4. AI Triage Agent & Vercel AI SDK Output Schema

### 4.1 Output Schema (`TriageVerdictSchema`)
The model output is strictly enforced via Vercel AI SDK `generateObject` with Zod:
```typescript
export const EvidenceChecklistItemSchema = z.object({
  sourceField: z.string().describe('Exact source attribute, e.g. sanitizedShipmentInfo[0].status or sanitizedOrderInfo.grossAmount'),
  claimedFact: z.string().describe('The verified factual statement based solely on provided records'),
  verified: z.boolean().describe('Whether this fact is definitively confirmed by official records'),
  notes: z.string().describe('Contextual justification explaining relevance to the dispute defense')
});

export const TriageVerdictSchema = z.object({
  disputeId: z.string(),
  recommendation: z.enum(['FIGHT', 'ACCEPT']).describe('FIGHT to submit evidence to defend the dispute, ACCEPT to refund the buyer'),
  confidenceScore: z.number().min(0).max(100).describe('Confidence score between 0 and 100 based on evidentiary strength'),
  summaryReason: z.string().describe('Concise executive summary of why the merchant should fight or accept'),
  evidenceChecklist: z.array(EvidenceChecklistItemSchema).describe('Itemized list of concrete evidentiary facts verifying fulfillment or failure'),
  proposedDraftNotes: z.string().describe('Professional draft rebuttal note formatted for PayPal dispute adjudicators'),
  evidenceTypeRequired: z.enum(['PROOF_OF_FULFILLMENT', 'PROOF_OF_REFUND', 'OTHER']).describe('PayPal evidence type matching dispute requirements'),
  missingEvidenceWarnings: z.array(z.string()).describe('List of missing pieces of evidence that weaken the merchant case'),
  riskAnalysis: z.string().describe('Analysis of dispute fee risk ($15-$20) vs win probability')
});
```

### 4.2 Deterministic Decision Logic Rules
When evaluating a dispute, the agent (or deterministic fallback) applies the following business rules:

1. **`MERCHANDISE_OR_SERVICE_NOT_RECEIVED`**:
   - **Rule 1A (Verified Delivery):** If `sanitizedShipmentInfo` contains a tracking record with `status === 'DELIVERED'`, and delivery occurred before the dispute creation timestamp:
     - Recommendation: **`FIGHT`**
     - Confidence: **> 90%** (typically 95%)
     - Evidence Type: **`PROOF_OF_FULFILLMENT`**
     - Evidence Checklist: Carrier delivery status, carrier tracking number, order amount match.
     - Risk: Win probability > 90%; eligible for PayPal Seller Protection.
   - **Rule 1B (In Transit):** If tracking record exists with `status === 'IN_TRANSIT'` or `'SHIPPED'` and package is within standard delivery window:
     - Recommendation: **`FIGHT`**
     - Confidence: **70% - 80%**
     - Evidence Type: **`PROOF_OF_FULFILLMENT`**
     - Warning: Final delivery scan pending.
   - **Rule 1C (No Tracking / Canceled):** If tracking record is missing or `status === 'CANCELLED'`:
     - Recommendation: **`ACCEPT`**
     - Confidence: **> 90%** (typically 92%)
     - Evidence Type: **`OTHER`**
     - Rationale: Fighting without carrier tracking has 0% win probability and incurs an additional non-refundable PayPal dispute fee ($15 - $20). Refund immediately.

2. **`MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED`**:
   - **Rule 2A (No Return Tracking / Subjective Dislike):** If buyer message indicates subjective preference (e.g. "color is darker than photo") while product specifications match checkout descriptions, or buyer refuses to return the item:
     - Recommendation: **`FIGHT`**
     - Confidence: **75% - 85%**
     - Evidence Type: **`OTHER`**
     - Checklist: Original catalog specs, buyer authorization, absence of return shipment.
   - **Rule 2B (Confirmed Defect / Seller Error):** If seller messages or transaction records concede damage or wrong item sent:
     - Recommendation: **`ACCEPT`**
     - Confidence: **> 90%**
     - Action: Refund buyer.

---

## 5. UI & Merchant Command Center Requirements

### 5.1 Dispute Command Queue (`src/app/page.tsx`)
- **Technology:** AG Grid Community (`ag-grid-react`, `ag-grid-community` v32.2.0)
- **Primary Sorting:** `seller_response_due_date` ascending (most urgent disputes first).
- **SLA Urgency Badges:**
  - `< 24 hours`: Flashing Red Alert badge (`Urgent Action Required`)
  - `< 48 hours`: Red warning badge (`X hours left`)
  - `< 72 hours`: Amber warning badge (`X days left`)
  - `> 72 hours`: Neutral slate badge
- **Key Metrics Row:**
  - Total Active Capital at Risk ($)
  - Number of disputes Awaiting 1-Click Approval
  - Number of Evidence Packets Successfully Filed
- **Interactive Action Column:** "Review & Approve" button linking to `/disputes/{id}`.

### 5.2 1-Click Review & Approval Interface (`src/app/disputes/[id]/page.tsx`)
- **Verdict Banner:** Color-coded card (Green for FIGHT, Amber for ACCEPT) with confidence score percentage pill.
- **Executive Summary:** Plain-English rationale for the decision.
- **Evidence Checklist:** Interactive cards showing source field badge (e.g. `sanitizedShipmentInfo[0].status`), claimed fact, and verification checkmark.
- **Editable Draft Rebuttal Textarea:** Pre-populated legal rebuttal note formatted for PayPal adjudicators. Merchant can modify text; submitted evidence payload must contain the merchant's edited note.
- **Redaction Diff Modal:** Side-by-side or tabbed viewer displaying raw incoming data vs. sanitized prompt payload with counts of redacted emails, phones, names, and addresses.
- **Action Buttons:**
  - Green button: `Approve & Submit Evidence` (Triggers `POST /api/disputes/{id}/approve` with `{ action: 'FIGHT', merchantEditedNotes }`).
  - Red/Amber button: `Accept Claim & Refund` (Triggers `POST /api/disputes/{id}/approve` with `{ action: 'ACCEPT', merchantEditedNotes }`).

### 5.3 Immutable Audit Trail Viewer (`src/app/audit/page.tsx`)
- **Chronological Chain of Custody:** Displays all events for a dispute in reverse chronological order:
  - `WEBHOOK_RECEIVED`
  - `CONTEXT_AGGREGATED`
  - `PII_REDACTED`
  - `TRIAGE_EVALUATED`
  - `MERCHANT_EDITED_NOTES`
  - `MERCHANT_APPROVED_FIGHT` / `MERCHANT_APPROVED_ACCEPT`
  - `PAYPAL_EVIDENCE_SUBMITTED` / `PAYPAL_CLAIM_ACCEPTED`
- **Inspection Detail:** Clickable payload inspector showing JSON snapshots at each lifecycle transition.

### 5.4 Risk Analytics View (`src/app/analytics/page.tsx`)
- Grouped dispute volume by reason (`MERCHANDISE_OR_SERVICE_NOT_RECEIVED`, `NOT_AS_DESCRIBED`).
- Capital protected vs refunded metrics.
- SLA adherence rates.

---

## 6. Edge Cases & Observed System Behaviors

### Edge Cases Table

| # | Feature | Input / Condition | Observed Behavior | Severity / Impact | Recommended Mitigation |
|---|---------|-------------------|-------------------|-------------------|------------------------|
| **1** | **Redactor Address Regex** | Address ending in "Terrace" (e.g. `742 Evergreen Terrace`) | Unit test failed (`Assertion Failed: Street address leaked!`). Regex `ADDRESS_REGEX` only matches suffixes: `Street\|St\|Avenue\|Ave\|Road\|Rd\|Boulevard\|Blvd\|Drive\|Dr\|Lane\|Ln\|Court\|Ct\|Way\|Square\|Sq\|Trail\|Parkway\|Pkwy`. Missing: `Terrace`, `Ter`, `Circle`, `Cir`, `Highway`, `Hwy`. | **High** (Breaks unit test & leaks address) | Expand `ADDRESS_REGEX` in `redactor.ts` to include `Terrace\|Ter\|Circle\|Cir\|Highway\|Hwy\|Place\|Pl\|Loop`. |
| **2** | **HATEOAS Rel Naming Inconsistency** | PayPal API returns `rel: "provide_evidence"` (underscore) in some environments, but `rel: "provide-evidence"` (hyphen) in others. | In `disputes.ts:34`, code checks `links.some(l => l.rel === 'provide-evidence')`. An underscore `rel` causes `canProvideEvidence` to evaluate to `false`. | **High** (Action button disabled incorrectly) | Update link checks to match both: `l.rel === 'provide-evidence' \|\| l.rel === 'provide_evidence'`. |
| **3** | **Webhook Re-serialization** | Re-serializing parsed `event` object in `verifyPayPalWebhookSignature`. | PayPal requires verbatim exact text matching the signed payload. Re-serializing parsed JSON can reorder keys or alter float formats, causing signature mismatch (`FAILURE`). | **Medium** (False 401 on valid webhooks) | Pass raw webhook request text or strictly verify JSON formatting against PayPal's verification service. |
| **4** | **Node.js 24 + better-sqlite3 Native Addon** | Running `better-sqlite3` on Windows Node.js v24.19.0 during `npm run build`, `npm run seed`, or server launch. | `Error: Could not locate the bindings file` for `better_sqlite3.node` (ABI 137). TypeScript compilation succeeds (`✓ Compiled successfully`), but Next.js static page data collection for `/api/disputes` fails upon initializing `better-sqlite3`. | **High** (Blocks production build & script execution) | Run `npm rebuild better-sqlite3` with C++ build tools, or switch to a pure-JS SQLite driver / in-memory adapter, or run on Node.js 20 LTS. |
| **5** | **Empty Tracking / Unfulfilled Orders** | Dispute with no tracking records uploaded (`tracking: []`). | Model / heuristic correctly evaluates to `ACCEPT` with 92% confidence and advises refund to avoid $15-$20 dispute fee. | **Working as Spec'd** | Preserves merchant capital. |
| **6** | **Dispute State Lockout** | Calling `provide-evidence` when dispute is in `UNDER_REVIEW` or `RESOLVED`. | PayPal API returns HTTP 400 Bad Request: dispute state does not permit evidence submission. | **Handled by HATEOAS check** | Ensure UI disables submission button and shows banner if dispute is already under review. |
| **7** | **OAuth Token Expiration** | Token expires after 3 to 8 hours (`expires_in: 32400`). | In-memory token manager in `client.ts` caches token with a 5-minute pre-expiration refresh buffer (`expiresAt > now + 5 * 60 * 1000`). | **Working as Spec'd** | Prevents mid-demonstration authorization drops. |
| **8** | **Missing AI API Keys** | Running in offline or local test environment without `GEMINI_API_KEY` or `OPENAI_API_KEY`. | Triage agent falls back smoothly to `generateDeterministicTriageVerdict()` with zero network dependencies. | **Working as Spec'd** | Enables reliable local testing and demo predictability. |

---

## 7. Current Implementation Gap Analysis

Based on codebase inspection:

1. **Pages Pending Creation:**
   - `src/app/disputes/[id]/page.tsx` (The 1-Click Review & Approval screen is referenced by the queue link and API route `api/disputes/[id]`, but the React page component is not yet created).
   - `src/app/audit/page.tsx` (Audit API `api/audit` exists, but the frontend audit viewer page is missing).
   - `src/app/analytics/page.tsx` (Analytics navigation tab exists in layout, but the analytics page is missing).

2. **Redactor Suite Fix Required:**
   - Expand `ADDRESS_REGEX` in `src/lib/agent/redactor.ts` to include missing suffixes (`Terrace`, `Circle`, `Highway`, etc.) so `npm run test:redactor` passes with 100% compliance.

3. **HATEOAS Resiliency:**
   - Update `getDisputeActionLinks` in `src/lib/paypal/disputes.ts` to support both hyphenated (`provide-evidence`, `accept-claim`) and underscored (`provide_evidence`, `accept_claim`) relations.

4. **Database Driver Compatibility:**
   - Verify native build of `better-sqlite3` on Windows Node 24 or ensure build command handles binding compilation.

---

## 8. Acceptance Criteria Verification Plan

| Criterion | Source Requirement | Verification Command / Method | Expected Result |
|---|---|---|---|
| **AC-1: Webhook Signature Verification** | R1 | Test `POST /api/webhooks/paypal` with valid vs invalid signature headers; inspect audit logs | Valid returns 200 and dispatches pipeline; invalid returns 401 |
| **AC-2: Redactor 100% Masking** | R2 | Run `npm run test:redactor` | 5/5 test cases pass with zero leaked PII while preserving tracking and amounts |
| **AC-3: Zero Raw PII in LLM Prompt** | R2 | Inspect payload logged under `PII_REDACTED` in `audit_logs` | All prompt inputs contain only `[EMAIL_REDACTED]`, `[BUYER_NAME_REDACTED]`, etc. |
| **AC-4: Structured Output Validation** | R3 | Run `runTriageAgent()` with seed bundles across reasons | Output strictly conforms to `TriageVerdictSchema` |
| **AC-5: Verified Tracking -> FIGHT** | R3 | Ingest `PP-D-27801` (FedEx DELIVERED) | Recommends `FIGHT` (>90% confidence) with `PROOF_OF_FULFILLMENT` |
| **AC-6: Missing Tracking -> ACCEPT** | R3 | Ingest `PP-D-27802` (No tracking) | Recommends `ACCEPT` (>90% confidence) with dispute fee warning |
| **AC-7: 1-Click Approve Submission** | R4, R5 | Click "Approve & Submit Evidence" on dispute | Sends multipart POST to PayPal sandbox; dispute status updates to `EVIDENCE_SUBMITTED` |
| **AC-8: 1-Click Accept Claim** | R4, R5 | Click "Accept Claim & Refund" on dispute | Sends accept-claim POST to PayPal sandbox; dispute status updates to `CLAIM_ACCEPTED` |
| **AC-9: SLA Urgency Countdowns** | R4 | Inspect Dispute Queue in browser | Red/flashing badges rendered for disputes with <48h remaining |
| **AC-10: Merchant Rebuttal Editing** | R4 | Edit draft notes in UI prior to clicking Approve | Submitted payload and audit log record merchant's edited text |
| **AC-11: Full Audit Trail History** | R6 | Inspect `/audit` page | Chronological event history rendered for every dispute |
| **AC-12: TypeScript Build Cleanliness** | AC | `npm run build` | Compiles without TypeScript or Next.js build errors |

---

*Report prepared by Specification Miner `spec_miner_survey_1` for the Dispute Defender Autonomous Multi-Agent Team.*
