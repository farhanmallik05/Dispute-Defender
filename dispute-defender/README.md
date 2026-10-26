# Dispute Defender 🛡️

> **Open-source autonomous AI agent that triages PayPal disputes, compiles the evidence packet across orders and shipments, redacts buyer PII with zero-trust regex, and submits via the Disputes REST API after one-click merchant approval.**

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![AG Grid](https://img.shields.io/badge/AG_Grid-Community-brightgreen?logo=aggrid)](https://www.ag-grid.com/)
[![PayPal REST API](https://img.shields.io/badge/PayPal-Disputes_API-003087?logo=paypal)](https://developer.paypal.com/api/customer-disputes/v1/)
[![Vercel AI SDK](https://img.shields.io/badge/AI_SDK-Gemini_%2F_OpenAI-blue)](https://sdk.vercel.ai/)
[![Render](https://img.shields.io/badge/Deploy-Render_Workflows-46E3B7?logo=render)](https://render.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ The Problem & The Solution

Small and solo merchants who accept PayPal payments lose thousands of dollars each year to chargebacks not because they lack valid fulfillment proof, but because responding takes **20–30 minutes per dispute across three fragmented systems**:
1. Looking up tracking numbers and carrier delivery receipts in carrier dashboards.
2. Cross-referencing transaction records and buyer message threads in the PayPal Resolution Center.
3. Writing a legalistic rebuttal before the strict seller response deadline.

**Dispute Defender** solves this by autonomously orchestrating the defense pipeline:
1. **Intake**: Listens for `CUSTOMER.DISPUTE.*` webhooks or merchant-initiated sandbox syncs.
2. **Context Aggregation**: Pulls order details, transaction items, tracking records, and buyer message histories.
3. **Zero-Trust PII Redaction**: Strips buyer emails, phone numbers, IP addresses, and physical street addresses before any data touches an LLM.
4. **Autonomous AI Triage**: Analyzes carrier delivery confirmation, policy adherence, and dispute reasons to produce a structured **FIGHT** vs. **ACCEPT** recommendation with confidence score and evidence checklist.
5. **Strict Human-in-the-Loop Approval Gate**: Displays a 1-click review screen showing the side-by-side PII redaction diff, evidence checklist, and editable draft response. **No submission is made to PayPal without explicit merchant consent.**
6. **Disputes API Submission**: Fills the official PayPal Agent Toolkit gap by executing the multipart/form-data `POST /v1/customer/disputes/{id}/provide-evidence` call or accepting the claim to avoid penalty fees.
7. **Append-only Audit Trail**: Every pipeline stage, redaction count, model decision, webhook ID, and merchant override is recorded with timestamps in SQLite.

---

## 🏆 Hackathon Sponsor Track Alignment

| Sponsor Track | Prize | How Dispute Defender Wins | Implementation Path |
| :--- | :--- | :--- | :--- |
| **AG Grid / AG Studio** | **$5,000 First Prize** | **Dual AG Grid Implementation**: Enterprise Dispute Command Center Queue with real-time SLA countdown pills, urgency coloring, custom cell renderers, quick search, and CSV export. Plus, the Risk Analytics Dashboard features an AG Grid Risk Matrix breaking down win rates and defense playbooks by claim reason. | [`src/components/queue/DisputeGrid.tsx`](./src/components/queue/DisputeGrid.tsx)<br>[`src/app/analytics/page.tsx`](./src/app/analytics/page.tsx) |
| **Render** | Deployment | `render.yaml` configures the Next.js web application. The current pipeline is synchronous and fail-closed; no unimplemented durable-workflow claim is made. | [`render.yaml`](./render.yaml)<br>[`src/lib/workflows/dispute-pipeline.ts`](./src/lib/workflows/dispute-pipeline.ts) |
| **APIMatic Context Plugin** | **$1,000 Prize** | **Strict PayPal Server SDK Typing**: Integrates APIMatic prompt context rules to query Orders v2 and Transaction Reporting v1 using official SDK idioms. | [`src/lib/paypal/server-sdk.ts`](./src/lib/paypal/server-sdk.ts)<br>[`opencode.jsonc`](../opencode.jsonc) |

---

## 🧩 Architectural Topology

```
                  ┌──────────────────────────────────────────────┐
                  │          PayPal Developer Platform           │
                  │  (Webhooks / Disputes API / Orders v2)       │
                  └───────┬──────────────────────────────▲───────┘
                          │                              │
          CUSTOMER.DISPUTE.* Webhook         POST /provide-evidence
                          │                              │
                          ▼                              │
┌────────────────────────────────────────────────────────┴───────────────────────┐
│                           Dispute Defender Application                         │
│                                                                                │
│  ┌─────────────────────────┐        ┌───────────────────────────────────────┐  │
│  │ Webhook Signature Guard │        │ REST Client / Multipart Form Builder │  │
│  └──────────┬──────────────┘        └───────────────────▲───────────────────┘  │
│             │                                           │                      │
│             ▼                                           │                      │
│  ┌─────────────────────────┐        ┌───────────────────┴───────────────────┐  │
│  │ Context Aggregator      │        │ Human Approval Gate (1-Click Review)  │  │
│  │ (Orders / Shipments)    │        │  - Redaction Diff Modal               │  │
│  └──────────┬──────────────┘        │  - Editable Draft Rebuttal            │  │
│             │                       └───────────────────▲───────────────────┘  │
│             ▼                                           │                      │
│  ┌─────────────────────────┐        ┌───────────────────┴───────────────────┐  │
│  │ Zero-Trust PII Redactor ├───────►│ Structured AI Triage Agent            │  │
│  │ (Emails, Phones, Addrs) │        │ (Gemini 2.5 Flash / Vercel AI SDK)    │  │
│  └─────────────────────────┘        └───────────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ AG Grid Command Center & Risk Matrix Dashboard                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v22.5.0 or higher (uses the built-in `node:sqlite` driver; tested on Node v24).
- **npm** or **pnpm**.
- (Optional) PayPal Sandbox Developer credentials & Google Gemini API Key.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Farhan-B/Dispute-Defender.git
cd Dispute-Defender/dispute-defender

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file from the example template:
```bash
cp .env.example .env
```

Configure your credentials in `.env`:
```env
# PayPal Sandbox Credentials (from developer.paypal.com)
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
PAYPAL_ENV=sandbox
INTEGRITY_MODE=demo
DATABASE_URL=sqlite.db

# AI Model Provider (Gemini or OpenAI)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key

# Port
PORT=8000
```
`INTEGRITY_MODE=demo` is only for local deterministic fixtures. In any other mode, unsigned webhooks are rejected, PayPal credentials are required for approval, and failed PayPal calls do not update local status. Tracking is never fabricated: use `npm run seed` for explicit local fixtures or provide real integration data.

### 4. Run the Test Suites
Validate the Zero-Trust PII Redactor:
```bash
npm run test:redactor

# Full local pipeline verification (uses an isolated SQLite database)
DATABASE_URL=./e2e.sqlite INTEGRITY_MODE=demo npm run test:e2e
```
Expected output:
```
✓ testEmailRedaction: PASS
✓ testPhoneRedaction: PASS
✓ testAddressRedaction: PASS
✓ testIpRedaction: PASS
✓ testFullContextBundleSanitization: PASS
All 5 redactor test suites passed successfully!
```

### 5. Build & Start the Application
```bash
# Production optimized build
npm run build

# Start production server on port 8000
npm start
```

Visit **http://localhost:8000** in your browser.

---

## 🖥️ Screen Guide & Core Capabilities

### 1. AG Grid Dispute Command Center (`/`)
- **Real-Time Capital at Risk**: Dynamic metric header calculating total disputed funds and defended revenue.
- **SLA Urgency Badges**: Color-coded countdown timer pills (< 24h = Red/Critical, < 48h = Amber/Urgent, > 48h = Blue/Normal).
- **Interactive Dual View**: Toggle between the full enterprise **AG Grid Professional View** (with multi-column sorting, column filters, and CSV export) and the **Clean Minimalist View**.
- **1-Click Sandbox Sync**: Pulls active disputes from the PayPal sandbox or simulates new incoming chargebacks.

### 2. 1-Click Review & Approval Dossier (`/disputes/[id]`)
- **AI Verdict Banner**: Prominently highlights **FIGHT** vs. **ACCEPT** with confidence percentage and plain-English justification.
- **Fact-Traceable Evidence Checklist**: Each item displays the exact source field (e.g., `shipment.status`, `shipment.trackingNumber`), claimed fact, and verification badge.
- **Side-by-Side PII Redaction Diff**: Modal displaying raw buyer inputs alongside zero-trust sanitized payloads, proving no sensitive customer data leaked to the LLM.
- **Editable Rebuttal Notes**: Merchant can adjust or add comments prior to submission.
- **Action Links**: `Provide Evidence to PayPal` or `Accept Claim & Refund Buyer` (executing live PayPal REST calls).

### 3. AG Grid Risk Analytics Dashboard (`/analytics`)
- **Reason Breakdown Grid**: Powered by AG Grid, categorizing disputes by reason (`MERCHANDISE_OR_SERVICE_NOT_RECEIVED`, `UNAUTHORISED`, `NOT_AS_DESCRIBED`).
- **Defended Capital Metrics**: Win-rate analytics and primary defense playbook suggestions per dispute category.
- **SLA Defense Compliance**: Progress visualization of merchant dispute defense velocity.

### 4. Immutable Audit Trail (`/audit`)
- Real-time event log recording `WEBHOOK_RECEIVED`, `CONTEXT_AGGREGATED`, `PII_REDACTED`, `TRIAGE_EVALUATED`, `MERCHANT_APPROVED`, and `PAYPAL_EVIDENCE_SUBMITTED`.
- Expandable JSON payload inspector for compliance officers and fraud auditors.

---

## 🛠️ The PayPal Evidence Gap Solved

The official `@paypal/agent-toolkit` provides tools for querying orders, shipments, and accepting claims, but does **not** support evidence submission. Dispute Defender implements the official PayPal Disputes REST API multipart contract:

```typescript
// Custom multipart evidence submission
POST /v1/customer/disputes/{dispute_id}/provide-evidence
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="input"
Content-Type: application/json

{
  "evidences": [
    {
      "evidence_type": "PROOF_OF_FULFILLMENT",
      "evidence_info": {
        "tracking_info": [
          {
            "carrier_name": "FEDEX",
            "tracking_number": "122533485"
          }
        ]
      },
      "notes": "Verified carrier delivery receipt attached."
    }
  ]
}
------WebKitFormBoundary...--
```

---

## 🔒 Security & Privacy Architecture

- **Zero-Trust Client Boundary**: Raw buyer data never leaves the local environment.
- **Redaction Regular Expressions**: Thorough coverage of RFC 5322 emails, E.164 phone numbers, IPv4/IPv6 addresses, and 20+ postal street suffixes.
- **HATEOAS Link Enforcement**: Verifies that the dispute record actually contains a `provide-evidence` or `accept-claim` link before allowing merchant submission.
- **Credential Safety**: Access tokens refreshed dynamically with a 5-minute pre-expiration window; never hardcoded or leaked into client bundles.

---

## 👥 Hackathon Submission Info

- **Project**: Dispute Defender
- **Tagline**: Open-source AI agent that triages PayPal disputes, builds the evidence packet, and submits it after one-click merchant approval.
- **License**: MIT
- **Submission Track**: PayPal AI Hackathon 2026 (General Track + AG Grid + Render + APIMatic)
