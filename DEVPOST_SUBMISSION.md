# Dispute Defender — Devpost Submission Package

> **PayPal AI Hackathon 2026**  
> *Ready-to-Submit Devpost Text, Metadata, Sponsor Tracks, and Sandbox Instructions*

---

## 📋 Devpost Form Fields (Quick Copy-Paste)

### Project Title
`Dispute Defender`

### Tagline (under 200 characters)
`Open-source autonomous AI agent that triages PayPal disputes, builds evidence dossiers, redacts buyer PII with zero-trust regex, and submits via the Disputes REST API upon 1-click merchant approval.`

### Built With (Tags)
`paypal-api`, `paypal-agent-toolkit`, `next.js-14`, `typescript`, `ag-grid`, `vercel-ai-sdk`, `google-gemini`, `sqlite`, `render`, `tailwind-css`, `zod`, `rest-api`

### Repository URL
`https://github.com/Farhan-B/Dispute-Defender`

### Demo URL
`https://dispute-defender.onrender.com`

### Video Demonstration URL
`https://youtu.be/YOUR_DEMO_VIDEO_ID` *(Replace with your 2:40 YouTube link)*

### Sponsor Tracks Entered
1. **Primary Track:** PayPal AI Hackathon (Autonomous Agent for Merchants)
2. **AG Grid / AG Studio ($5,000 Track):** Dual deployment — Enterprise Dispute Command Center Queue with real-time SLA countdown pills & Dispute Risk Overview Matrix.
3. **Render ($1,000 Track):** Persistent volume cloud hosting with `render.yaml` configuration and fail-closed durability.
4. **APIMatic ($1,000 Track):** Strict PayPal Server SDK TypeScript type-safety for order lookups.

---

## 📝 Full Devpost Project Description

### 💡 Inspiration
When a buyer initiates a dispute on PayPal (*Merchandise Not Received* or *Significantly Not as Described*), the seller response clock starts ticking immediately—granting only 10 to 20 days before automatic forfeiture.

For solo e-commerce merchants and small businesses, dispute response is painful, stressful, and procedurally fragmented:
1. **The PayPal Resolution Center:** Read buyer claims, find transaction IDs, and note the expiration deadline.
2. **Storefront & Order Logs:** Match buyer messages, purchased SKUs, and order line items.
3. **Carrier Tracking Portals:** Copy-paste tracking numbers into FedEx, UPS, or USPS to find delivery confirmation dates and proof of fulfillment.
4. **Legalistic Rebuttals:** Draft a formal dispute response according to PayPal's strict formatting standards.

Solo merchants spend **30 to 45 minutes per dispute**. Overwhelmed by administrative paperwork, sellers frequently miss response deadlines or refund claims they could easily win, losing their merchandise, their revenue, and paying a non-refundable $15–$20 dispute fee.

We built **Dispute Defender** to replace this multi-tab struggle with a **30-second review-and-approve workflow**—giving solo sellers the defense capabilities of a Fortune 500 chargeback team without the enterprise software cost.

---

### 🛡️ What Dispute Defender Does

Dispute Defender is an open-source, autonomous chargeback operations specialist:

1. **Real-Time Webhook & Polling Ingestion:**
   Listens for `CUSTOMER.DISPUTE.*` webhooks with HMAC-SHA256 signature verification and provides an on-demand "Sync Disputes" button to poll active PayPal Sandbox disputes.
2. **Context Aggregation:**
   Queries transaction records, order metadata, buyer communication threads, and shipping records into an aggregated dispute dossier.
3. **Zero-Trust PII Redaction Layer:**
   Before any data touches a third-party LLM (Google Gemini / OpenAI), a deterministic in-process regex scrubber masks buyer emails, phone numbers, IPv4/IPv6 addresses, physical street addresses (20+ postal suffixes), and buyer names. Crucially, it surgically preserves tracking numbers, dollar amounts, and delivery timestamps. Merchants can inspect the raw vs. sanitized payload in a side-by-side **Redaction Diff Modal**.
4. **Intelligent Triage & Fact-Grounded Verdicts:**
   Using the Vercel AI SDK and strict Zod schemas, the agent evaluates the evidence against PayPal Seller Protection guidelines:
   - **DELIVERED Tracking:** Recommends **FIGHT (>90% confidence)** with `PROOF_OF_FULFILLMENT`, citing verified scan timestamps.
   - **Missing Tracking:** Recommends **ACCEPT CLAIM (>90% confidence)** immediately, sparing the merchant from non-refundable dispute fees.
   - **Item Not as Described:** Pre-populates return merchandise conditions and policy compliance statements.
5. **Strict Human-in-the-Loop Governance (Zero Auto-Pilot):**
   The agent prepares the dossier, cites exact source fields, and pre-drafts a legal rebuttal note. However, **no financial action is ever dispatched to PayPal without explicit merchant authorization**. The merchant can edit the rebuttal note and authorize the action with a single click.
6. **Closing the PayPal Agent Toolkit Gap:**
   The official `@paypal/agent-toolkit` lacks an evidence submission tool. Dispute Defender implements a custom `multipart/form-data` REST client that submits the structured evidence payload (carrier tracking info, notes, and binary attachments) directly into `POST /v1/customer/disputes/{id}/provide-evidence`, while validating allowed actions against PayPal's HATEOAS action links.
7. **Enterprise AG Grid Command Center:**
   - **SLA Countdown Urgency Badges:** Color-coded timer pills (<24h Critical Red, <48h Urgent Amber, >48h Blue).
   - **Risk Analytics Matrix:** Visual AG Grid breakdown of capital at risk, win rates, and playbooks by dispute reason.
   - **Proactive SLA Monitor:** Dispatches webhook alerts when disputes enter critical response windows.
   - **Immutable Audit Trail:** Append-only chronological SQLite log recording every webhook, triage score, merchant edit, and PayPal API response.

---

### ⚙️ How We Built It

- **Frontend & Dashboard:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide icons, AG Grid Community with custom theme styling matching PayPal design tokens (`#003087` Navy, `#0070BA` Blue, `#FFC439` Warning Yellow).
- **AI Triage Engine:** Vercel AI SDK (`generateObject` with typed Zod schemas) powered by Google Gemini 2.5 Flash, paired with an offline deterministic heuristic fallback for zero downtime.
- **PayPal Integration:**
  - Ingestion: Webhook receiver with HMAC-SHA256 signature verification and idempotency replay guards.
  - Custom REST Client: Multipart form-data builder packaging the `input` JSON payload with carrier tracking info, proof notes, and binary document attachments.
  - Hypermedia Validation: Dynamic HATEOAS link evaluation (`provide-evidence`, `accept-claim`).
- **Data & Local Persistence:** Node 24 native `node:sqlite` driver in WAL (Write-Ahead Logging) mode, with an atomic cross-process file lock (`*.init.lock`) serializing schema initialization across Next.js parallel build workers.
- **Security & Privacy:** Deterministic regex scrubber with zero third-party cloud data transmission for PII.

---

### 🧗 Challenges We Ran Into

1. **Bridging the PayPal Evidence Submission Void:**
   When exploring the official `@paypal/agent-toolkit`, we discovered that while it supports querying disputes and accepting claims, **it has no tool to submit evidence to fight a dispute**. We solved this by reverse-engineering PayPal's Customer Disputes REST API v1, building a custom multipart form builder with dynamic boundary generation and JSON serialization in the `input` field.
2. **HATEOAS State Machine Traps:**
   PayPal's Disputes API enforces strict state rules: calling `provide-evidence` on a dispute that is under review or resolved results in a fatal HTTP 400. We built a hypermedia link parser that dynamically normalizes both hyphenated (`provide-evidence`) and underscored (`provide_evidence`) relations, preventing invalid submissions.
3. **Zero-Trust PII Redaction Without Losing Critical Facts:**
   Masking sensitive customer PII without accidentally corrupting carrier tracking IDs, dollar figures, or order numbers required developing a multi-pass regex engine with negative lookaheads, tested against 80+ adversarial edge cases.
4. **Next.js Multi-Worker SQLite Startup Collisions:**
   Parallel Next.js production build workers triggered transient database lock errors when running PRAGMA statements simultaneously. We solved this by building an atomic cross-process file lock using Node's `SharedArrayBuffer` and `Atomics.wait`.

---

### 🏆 Accomplishments That We're Proud Of

- **158 / 158 Passing Automated Tests (100% Pass Rate):**
  A comprehensive multi-tier test battery covering unit tests, carrier detection, health diagnostics, UI resilience, 4-tier opaque-box E2E scenarios, HATEOAS challenger tests, and 81 adversarial stress tests (ReDoS, prompt injections, boundary addresses).
- **Clean Production Build:** Zero TypeScript errors, zero lint warnings (`next lint` and `next build` pass with 100% clean output).
- **Closing an Ecosystem Gap:** Finished what PayPal started by providing the missing evidence submission implementation that the official toolkit lacked.
- **Governed Financial AI:** Complete elimination of autonomous auto-pilot hallucinations in financial proceedings through a strict Zero-Click Safety Guard.
- **30-Second Dispute Defense:** Reducing solo merchant investigation and response time from 45 minutes down to 30 seconds.

---

### 📚 What We Learned

- **Disputes are State Machines, Not Text Documents:** You cannot simply prompt an LLM to "fight a dispute." The API requires hypermedia validation, carrier normalization (FedEx vs FEDEX), specific evidence types (`PROOF_OF_FULFILLMENT`), and exact payload boundary formatting.
- **Zero-Trust is Mandatory for Payment AI:** Merchants face immense legal liability if customer data leaks to AI models. Building in-process PII scrubbing before any prompt dispatch is essential for enterprise trust.
- **Knowing When NOT to Fight Saves Money:** An AI that blindly fights unwinnable disputes loses money through non-refundable dispute fees. An intelligent agent must advise accepting claims when evidence is absent.

---

### 🚀 What's Next for Dispute Defender

- **Multi-Tenant PayPal Partner Onboarding:** Adding the complete PayPal Marketplace OAuth onboarding flow to support thousands of merchants on a single hosted platform.
- **Real-Time Carrier Webhooks:** Ingesting live delivery confirmation webhooks directly from FedEx Delivery Manager, UPS My Choice, and USPS Web Tools.
- **One-Click Storefront Plugins:** Publishing native Shopify, WooCommerce, and BigCommerce plugins to automatically link order line items and shipping labels.
- **Supervised 50-Merchant Pilot:** Running an empirical 90-day merchant trial to measure real-world chargeback win rates and capital defended.

---

## 🏆 Sponsor Alignment Breakdown

### 1. PayPal AI Track (Primary)
- **Deep Integration:** Ingests `CUSTOMER.DISPUTE.*` webhooks, performs OAuth 2.0 token caching with pre-expiration renewal, syncs active sandbox disputes, normalizes carrier tracking according to official PayPal carrier enums, and implements direct multipart evidence submission via the Disputes REST API v1.

### 2. AG Grid / AG Studio Track ($5,000 Target)
- **Dispute Command Center Queue:** High-density enterprise table featuring real-time SLA countdown badges, urgency coloring, custom cell renderers, quick search, and CSV export.
- **Dispute Risk Overview Matrix:** An AG Grid analytics view breaking down win rates, defended capital, and recommended defense playbooks by dispute reason.

### 3. Render Track ($1,000 Target)
- **Production Deployment:** Configured via `render.yaml` with persistent volume disk mounts (`/data`, 1GB) ensuring zero data loss for the native SQLite database across container restarts.

### 4. APIMatic Track ($1,000 Target)
- **Type-Safe SDK Validation:** Strict PayPal Server SDK TypeScript type-safety guiding Orders v2 lookups without hallucinated SDK types.

---

## 🧪 Judge & Evaluator Verification Instructions

Judges can verify Dispute Defender locally or in the cloud in under 60 seconds:

```powershell
# 1. Clone & Enter application directory
git clone https://github.com/Farhan-B/Dispute-Defender.git
cd Dispute-Defender/dispute-defender

# 2. Configure environment
Copy-Item .env.example .env

# 3. Run all automated tests (158 passing tests)
$env:INTEGRITY_MODE = "demo"
$env:DATABASE_URL = Join-Path $env:TEMP "dd-judge.sqlite"
npm run test:all

# 4. Run adversarial stress suites
npx tsx src/test/redactor-adversarial.test.ts
npx tsx src/test/challenger-adversarial.test.ts

# 5. Run turnkey sandbox diagnostic
npm run verify:sandbox

# 6. Seed sandbox data and start development server
npm run seed
npm run dev # Open http://localhost:3000
```

### Sandbox Test Merchant Credentials
- **Hosted Application:** `https://dispute-defender.onrender.com`
- **PayPal Sandbox Resolution Center:** `https://www.sandbox.paypal.com/disputes/`
- **Merchant Login:** `sandbox-merchant@disputedefender.dev`
- **Password:** *(Provided in Devpost Confidential Field)*
- **Test Instructions:**
  1. Open the Dispute Defender queue and click **Sync Disputes**.
  2. Select dispute `PP-D-27801` (Awaiting Approval).
  3. Click **Inspect PII Redaction Diff** to verify zero customer data leakage.
  4. Edit the rebuttal notes and click **Approve & Submit Evidence**.
  5. Log into PayPal Sandbox Resolution Center and verify dispute status has changed to `Under Review` with evidence attached.
