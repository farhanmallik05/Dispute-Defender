# Dispatch Assignment: Survey Spec Miner

## Objective
Extract exhaustive specification details, PayPal Dispute API endpoints & contracts, webhook signature verification mechanics, Zero-Trust PII redaction specifications, Vercel AI SDK structured output schema, and acceptance criteria from authoritative sources.

## Mandatory Inputs to Read
1. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\ORIGINAL_REQUEST.md` (Authoritative User Request)
2. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\plan\01_PRD_AND_VISION.md`
3. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\plan\02_ARCHITECTURE_AND_SPECS.md`
4. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\plan\03_SPONSOR_ALIGNMENT_STRATEGY.md`
5. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\plan\04_DAY_BY_DAY_EXECUTION_TIMELINE.md`
6. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\plan\06_RISK_MATRIX_AND_FALLBACKS.md`

## Scope Boundaries
- READ-ONLY investigation. DO NOT write or edit source code.
- Write your findings to:
  `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\spec_miner_survey_1\survey_report.md`
  and summarize in `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\spec_miner_survey_1\handoff.md`.
- Communicate completion and key findings back to the orchestrator via `send_message`.

## Required Report Content
1. Complete Feature Inventory (every single requirement from R1 through R6 + Acceptance Criteria)
2. Exact PayPal Disputes REST API contract:
   - Webhook verification endpoint and headers
   - GET /v1/customer/disputes (listing & polling)
   - GET /v1/customer/disputes/{id} (details)
   - POST /v1/customer/disputes/{id}/provide-evidence (multipart/form-data requirements, schema of `input` JSON field, allowed evidence types)
   - POST /v1/customer/disputes/{id}/accept-claim (payload schema, HATEOAS link checks)
3. Zero-Trust PII Redaction Rules:
   - What must be redacted (emails, phones, street addresses, buyer names, IP addresses)
   - What must be strictly preserved (tracking numbers, carriers, amounts, dates, dispute reason)
   - Format of redaction diff
4. AI Triage Agent Requirements:
   - Vercel AI SDK structured output schema (recommendation, confidence, reason, evidence_checklist, draft_rebuttal, required_evidence_type)
   - Deterministic decision logic rules (when FIGHT vs ACCEPT)
5. UI / Merchant Command Center Requirements (AG Grid, SLA badges, 1-click approvals, Audit Trail).

## 2026-10-25T19:39:48Z
You are spec_miner_survey_1.
Your working directory for metadata and reports is:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\spec_miner_survey_1

Read your instructions in:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\spec_miner_survey_1\DISPATCH.md

Crucially read:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\ORIGINAL_REQUEST.md
and all design documents in:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\plan\

Perform an exhaustive extraction of functional requirements, PayPal REST API schemas, webhook verification mechanics, Zero-Trust PII redaction rules, Vercel AI SDK output schemas, and acceptance criteria.
Write your complete report to:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\spec_miner_survey_1\survey_report.md
and your handoff to:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\spec_miner_survey_1\handoff.md

When done, send a message back to the orchestrator with your completion summary and key findings.
