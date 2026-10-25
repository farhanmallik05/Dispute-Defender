# Original User Request

## 2026-10-25T19:35:07Z

Dispute Defender is an open-source autonomous AI agent system that triages PayPal merchant disputes, aggregates evidence across order and shipment tracking records, redacts buyer PII before model inference, generates an evidence-backed "FIGHT" or "ACCEPT" recommendation, and submits evidence or accepts claims directly through PayPal's Disputes REST API upon 1-click human merchant approval.

Working directory: d:\AI-Lab\Hackathon\Paypal AI Hackathon\dispute-defender
Integrity mode: demo

## Requirements

### R1. Real-Time & Polling Dispute Ingestion
Ingest PayPal disputes through signature-verified webhooks (CUSTOMER.DISPUTE.*) and an on-demand "Sync Sandbox" polling routine that fetches dispute headers and lists from the PayPal sandbox API.

### R2. Context Aggregation & Zero-Trust PII Redaction
For every ingested dispute, aggregate related transaction details, item data, buyer messages, and carrier shipment tracking records (FedEx/UPS/USPS). Before passing any context to an LLM, redact all buyer personal identifiable information (emails, phone numbers, street addresses, buyer names, IP addresses) while strictly preserving tracking numbers, carrier names, delivery statuses, amounts, and dispute timelines. Provide a merchant-inspectable redaction diff.

### R3. Autonomous Triage Agent
Implement an autonomous triage agent using the Vercel AI SDK that outputs a strictly validated structured object: a recommendation (FIGHT vs ACCEPT), a confidence score (0-100), an executive summary reason, an itemized evidence checklist citing exact source fields, a professional draft rebuttal note, and required PayPal evidence type (PROOF_OF_FULFILLMENT, PROOF_OF_REFUND, OTHER). The agent must never hallucinate tracking numbers or facts not in the evidence bundle.

### R4. Merchant Command Center & 1-Click Approval Screen
Provide a web interface featuring:
- A high-performance Dispute Queue powered by AG Grid, sorting disputes by seller response due date, featuring SLA countdown urgency badges, filter chips, and amount at risk aggregation.
- A 1-Click Review & Approval Screen displaying the AI verdict, confidence score, itemized evidence checklist with source chips, editable draft rebuttal notes, side-by-side redaction diff viewer, and single-click action buttons ("Approve & Submit Evidence" and "Accept Claim & Refund").
- Under no circumstances may the system submit evidence or accept a claim without explicit merchant click.

### R5. Custom PayPal REST Evidence Submission & Claim Acceptance
Implement the custom multipart/form-data client for POST /v1/customer/disputes/{id}/provide-evidence (packaging the JSON payload inside the input form field with carrier tracking and notes) and the claim acceptance client for POST /v1/customer/disputes/{id}/accept-claim, validating allowed actions against the dispute's HATEOAS links.

### R6. Immutable Audit Trail & Risk Analytics
Maintain an append-only audit log recording every webhook, tool call, raw vs redacted context payload, model output, merchant edit, and PayPal API response with ISO timestamps. Provide an AG Grid-powered Risk Analytics view showing dispute volume by reason, capital protected, win rate, and resolution speed.

---

## Acceptance Criteria

### Ingestion & Security
- [ ] Incoming webhook payloads are verified against PayPal's signature verification endpoint or handled gracefully with audit logs.
- [ ] Unit tests for the Zero-Trust Redactor pass with 100% masking of sample emails, phones, addresses, and names, while tracking numbers and order amounts remain untouched.
- [ ] Every LLM input payload contains only sanitized text; no raw buyer PII is passed to the model.

### Triage & Submission Execution
- [ ] Triage agent produces valid structured JSON matching the schema for all dispute types (MERCHANDISE_OR_SERVICE_NOT_RECEIVED, NOT_AS_DESCRIBED).
- [ ] For disputes with verified DELIVERED tracking, the agent recommends FIGHT (>90% confidence) with PROOF_OF_FULFILLMENT.
- [ ] For disputes with missing shipment tracking, the agent recommends ACCEPT (>90% confidence) to prevent penalty fees.
- [ ] Clicking "Approve & Submit Evidence" sends a properly formatted multipart request to the PayPal Sandbox API and updates the dispute status to EVIDENCE_SUBMITTED.
- [ ] Clicking "Accept Claim & Refund" sends the acceptance request and updates the dispute status to CLAIM_ACCEPTED.

### UX & Transparency
- [ ] Dispute queue displays countdown badges highlighting disputes with <48 hours remaining.
- [ ] Merchant can edit the draft rebuttal note prior to clicking approve; the submitted payload reflects the merchant's edits.
- [ ] The Audit Trail view displays the full chronological chain of custody for every dispute.
- [ ] All code builds cleanly with TypeScript and runs via npm run dev.
