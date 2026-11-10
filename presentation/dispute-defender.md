---
marp: true
theme: default
paginate: true
size: 16:9
title: Dispute Defender
description: PayPal dispute triage and merchant-approved evidence submission
style: |
  section { background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; padding: 48px 64px; }
  h1, h2 { color: #003087; }
  strong { color: #0070ba; }
  blockquote { border-left: 5px solid #0070ba; padding-left: 18px; color: #334155; }
  table { font-size: 22px; }
  code { background: #e2e8f0; }
  footer { font-size: 14px; color: #64748b; }
footer: Dispute Defender | Hackathon prototype
---

<!-- _class: lead -->

# Dispute Defender

## Evidence first. Merchant in control.

AI-assisted PayPal dispute triage and merchant-approved responses.

**Presented by Farhan** · PayPal AI Hackathon

<!-- Speaker notes: Introduce this as a working prototype, not a production financial service. The central idea is to simplify investigation while keeping submission authority with the merchant. -->

---

# 01 · The problem

## One dispute. Multiple systems. A deadline.

- Read the buyer's claim in PayPal.
- Locate the transaction and order details.
- Find shipment records and supporting evidence.
- Prepare a response before the seller deadline.

> The opportunity: turn scattered information into a reviewable case.

<!-- Speaker notes: Describe the workflow rather than quoting unvalidated market statistics. Missed deadlines and incomplete responses are the operational risks the project targets. -->

---

# 02 · Who it is for

## Solo merchants and small e-commerce teams

**Their job:** resolve disputes without a dedicated operations team.

**Their needs:**
- Know which cases need attention first.
- Understand what evidence is available or missing.
- Review a draft before taking a financial action.

**Validation next:** merchant interviews and supervised pilot cases.

<!-- Speaker notes: This is the target segment, not an established customer base. No paid adoption, demand validation, or time-saving study is claimed. -->

---

# 03 · The solution

## A guided dispute-response workflow

1. **Ingest** a dispute through sync or webhook.
2. **Prepare** the available dispute context and tracking input.
3. **Redact** selected buyer PII before model inference.
4. **Recommend** FIGHT or ACCEPT with an evidence checklist.
5. **Review** and edit the draft response.
6. **Approve** an action through the PayPal REST client.

<!-- Speaker notes: The current pipeline accepts explicit shipment data; automated carrier collection is not yet demonstrated end to end. FIGHT and ACCEPT are recommendations, not adjudication outcomes or legal advice. -->

---

# 04 · Merchant command center

## Attention goes to the cases that need it

| Screen | Merchant task |
| :--- | :--- |
| Dispute queue | Search, filter, and inspect response deadlines |
| Review dossier | Inspect recommendation, evidence, and notes |
| Redaction inspector | Inspect the sanitized model context |
| Audit trail | Review recorded processing and approval events |
| Analytics | Explore dispute volume and submission activity |

<!-- Speaker notes: Show the actual application here if possible. AG Grid Community powers the queue. Do not describe generated visual assets as real screenshots or official PayPal receipts. -->

---

# 05 · Why AI belongs here

## Explanation and drafting—not ownership of the money

- Structured assessment through **Vercel AI SDK + Zod**.
- Evidence checklist with source-field references.
- Draft notes that the merchant can edit.
- Deterministic rules for local/offline execution.

> A confidence score is a model or rule output—not a measured win probability.

<!-- Speaker notes: Distinguish real model inference from deterministic demo execution. Structured JSON does not establish factual correctness. The product still needs a labeled evaluation set and human quality review. -->

---

# 06 · Privacy and evidence integrity

## Minimize what reaches the model

- Mask recognized emails, phones, street addresses, IPs, and known names.
- Preserve operational facts such as amounts and tracking identifiers.
- Do not invent shipment records when tracking is absent.
- Retain processing and merchant-action records for inspection.

**Boundary:** tested patterns are not a universal privacy guarantee.

<!-- Speaker notes: Regex redaction has finite coverage. This is not cryptographic anonymization, certified compliance, or an immutable cryptographic audit chain. Authentication, retention, and broader privacy review remain necessary before real merchant use. -->

---

# 07 · Technical architecture

```text
PayPal webhook / merchant sync
              |
              v
Next.js API -> Context -> Redaction -> Triage
              |                        |
              +---- SQLite storage <---+
                         |
                         v
                Merchant review UI
                         |
                  Explicit approval
                         |
                         v
           PayPal Disputes REST client
```

**Stack:** Next.js · TypeScript · AG Grid · AI SDK · SQLite

<!-- Speaker notes: SQLite uses Node's built-in node:sqlite driver. The primary pipeline is an in-process function. A hosting blueprint is not proof of deployed durable orchestration. -->

---

# 08 · PayPal integration

## From recommendation to an API request

- OAuth access token acquired from server-side app credentials.
- Dispute action links checked before submission.
- Multipart evidence request with an `input` JSON field.
- Separate claim-acceptance request for the ACCEPT branch.
- API responses and failures recorded in the audit trail.

**Proof required:** the exact evidence appears in PayPal Sandbox.

<!-- Speaker notes: Client code and local simulation are not proof of PayPal acceptance. Confirm permissions, dispute state, carrier values, and the remote response in a controlled Sandbox case. Never demonstrate live funds. -->

---

# 09 · Demo plan

## Show the chain of evidence in three minutes

| Time | Demonstration |
| :--- | :--- |
| 0:00–0:30 | Queue, dispute amount, and response deadline |
| 0:30–1:15 | Recommendation, tracking input, and evidence checklist |
| 1:15–1:45 | Sanitized context and editable draft |
| 1:45–2:30 | Merchant approval and resulting API response |
| 2:30–3:00 | Audit events and honest verification boundary |

**Always label the session:** local simulation or real Sandbox integration.

<!-- Speaker notes: For a local demo, say explicitly that approval is simulated. For Sandbox, use a fresh actionable dispute and show the submitted notes in the official Resolution Center. If that proof is unavailable, show the request contract without claiming external success. -->

---

# 10 · What has been verified

## Previously observed local verification

| Check | Last reported result in this workspace session |
| :--- | :--- |
| Production build (`next build`) | Passed (0 errors) |
| Non-interactive ESLint (`next lint`) | Passed (0 warnings or errors) |
| Environment schema validation | 3 / 3 passed |
| Basic redaction suite | 5 / 5 passed |
| Carrier detection suite | 6 / 6 passed |
| Proactive SLA monitor suite | 3 / 3 passed |
| Multipart binary attachment suite | 3 / 3 passed |
| Health & resilience suites | 11 / 11 passed |
| Local E2E runner (4 tiers) | 32 / 32 passed |
| Approval / HATEOAS challenger suite | 14 / 14 passed |
| Adversarial stress batteries | 81 / 81 passed |
| **Total Automated Tests** | **158 / 158 passed (100% pass rate)** |

**Local results ≠ live PayPal verification or production certification.**

<!-- Speaker notes: These results were observed during the earlier hardening work; they were not rerun to create this deck and are not a certification of the latest repository state. Rerun checks before presenting and update this slide with the tested commit and date. -->

---

# 11 · What remains before real merchant use

## The next milestone is trusted Sandbox proof

1. Verify ingestion and both action paths against real Sandbox cases.
2. Connect reliable order/tracking sources; distinguish absence from lookup failure.
3. Add authentication, authorization, and consistent environment safeguards.
4. Harden retry recovery, approval concurrency, and event processing.
5. Measure outcomes, model quality, cost, and merchant review time.

**Current caveat:** missing credentials can still yield simulated approval;
unsigned webhooks are rejected only when `PAYPAL_MODE=live`.

<!-- Speaker notes: Current routes use PAYPAL_MODE for some safety checks, while the OAuth client uses PAYPAL_ENV. The sync route can fall back to seed data. Resolved events default a missing outcome to seller-favour. Treat these as unresolved gaps, not verified safety guarantees; analytics are not evidence of recovered revenue. -->

---

<!-- _class: lead -->

# 12 · The takeaway

## Evidence first. Merchant in control.

Dispute Defender brings dispute review, sanitized context,
drafting, and submission into one workflow.

**Next proof point:** a supervised merchant pilot backed by verified
PayPal Sandbox submissions and measured review effort.

<!-- Speaker notes: Close on the concrete workflow, not a guarantee of winning disputes. Ask for pilot merchants, dispute-domain feedback, and integration review. -->

---

# Appendix · Credentials required

Store values privately in `dispute-defender/.env`—never in this deck.

| Variable | Purpose / where to obtain it |
| :--- | :--- |
| `PAYPAL_CLIENT_ID` | Sandbox REST app, PayPal Developer Dashboard |
| `PAYPAL_CLIENT_SECRET` | Secret for that same Sandbox app |
| `PAYPAL_WEBHOOK_ID` | Registered webhook for that app |
| `GEMINI_API_KEY` **or** `OPENAI_API_KEY` | One provider key for real model inference |

Register an HTTPS endpoint ending in `/api/webhooks/paypal`.
Use separate Sandbox buyer/business accounts for manual portal checks.

<!-- Speaker notes: Visit https://developer.paypal.com/dashboard/applications/sandbox for app credentials. The webhook ID is not an OAuth token. Subscribe to relevant CUSTOMER.DISPUTE events. Generate provider keys in Google AI Studio or the OpenAI platform; configure only the provider being used and leave unused keys unset, not placeholder text. Never share keys, passwords, or tokens in chat or screenshots. -->

---

# Appendix · Presenter setup checklist

- Use **Node 24**, install dependencies, and select the intended mode.
- Set `PAYPAL_ENV=sandbox`; never use live payment credentials.
- For real inference, configure `AI_MODEL` and one matching provider key.
- For fixtures, use `INTEGRITY_MODE=demo` and explicitly label simulation.
- Re-run build and tests using isolated databases before the presentation.
- Show real PayPal proof only after independently confirming acceptance.

**Slide export:** open this Markdown in Marp for VS Code;
use **Export Slide Deck → PowerPoint** or PDF.

<!-- Speaker notes: This file is a Marp-compatible Markdown deck, not a generated .pptx binary. Export locally with the Marp extension if PowerPoint is required. The current environment flags are inconsistent; this checklist is not a substitute for hardening the routes before public exposure. -->
