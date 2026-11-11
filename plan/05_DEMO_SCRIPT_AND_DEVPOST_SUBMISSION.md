# Dispute Defender: Demo Video Script & Devpost Submission Guide

**Video Target Duration:** 2 minutes 40 seconds (Hard hackathon cap: 3 minutes)  
**Video Resolution:** 1080p 60fps, clean browser framing, no copyrighted audio, no third-party logos.  

---

## 1. Timed 2:40 Video Demonstration Script

```
+----------------------------------------------------------------------------------------------------+
| 0:00 - 0:15 | Scene 1: The Urgent Problem (Dispute Queue & SLA Clock)                             |
| 0:15 - 0:45 | Scene 2: Split-Screen Live Ingestion & Autonomous Triage                            |
| 0:45 - 1:25 | Scene 3: The 1-Click Review Screen: Verdict, Redaction Diff & Edit                  |
| 1:25 - 1:50 | Scene 4: Proof in PayPal Resolution Center                                          |
| 1:50 - 2:15 | Scene 5: The Accept / Refund Path (Unwinnable Dispute)                              |
| 2:15 - 2:30 | Scene 6: AG Grid Analytics Dashboard & Audit Trail                                  |
| 2:30 - 2:40 | Scene 7: Open Source Wrap & Architecture                                            |
+----------------------------------------------------------------------------------------------------+
```

### Scene 1: The Urgent Problem (0:00 – 0:15)
- **Visual:** Full-screen browser on Dispute Defender's main dashboard. AG Grid displays 4 open disputes. Red and Amber countdown timers show `14 hours left`, `3 days left`. Total at risk: `$840.50`.
- **Spoken Audio:** 
  > *"When a buyer files a dispute on PayPal, solo merchants face an immediate ticking clock. Answering each dispute requires hunting down orders, verifying shipment tracking across carrier portals, and writing formal legal rebuttals. Missing the deadline means automatic forfeiture of both your funds and merchandise. This is Dispute Defender."*

### Scene 2: Live Ingestion & Autonomous Triage (0:15 – 0:45)
- **Visual:** Split screen. 
  - **Left window:** PayPal Sandbox Buyer account filing a new dispute for Item Not Received on Order #1042 ($189.00). Click Submit.
  - **Right window:** Dispute Defender dashboard. Within 2 seconds, a toast notification sounds: *"New Dispute Ingested via Webhook"*. A new row appears in AG Grid, showing status `TRIAGING...`, and immediately switches to `AWAITING APPROVAL: FIGHT (95% Confidence)` with an urgency badge.
- **Spoken Audio:** 
  > *"Dispute Defender listens for real-time PayPal webhooks. The moment a dispute arrives, our durable workflow wakes up, queries the PayPal Agent Toolkit for the order, pulls carrier tracking from FedEx, and passes the context through our zero-trust PII redactor before the AI agent evaluates the case."*

### Scene 3: The 1-Click Review Screen (0:45 – 1:25)
- **Visual:** Click "Review & Approve" on the new dispute row. 
  - The review screen opens:
    - **Header:** Verdict Banner: `RECOMMENDATION: FIGHT (95% CONFIDENCE)`
    - **Summary:** *"Carrier tracking confirms delivery 2 days prior to buyer dispute filing."*
    - **Evidence Checklist:** `[FedEx 122533485: DELIVERED]`, `[Order #1042: $189.00 Match]`, `[Address Match: Verified]`.
    - **Redaction Diff Button:** Click to open modal showing raw buyer email/name masked as `[EMAIL_REDACTED]` and `[BUYER_NAME_REDACTED]`.
    - **Draft Rebuttal Notes:** Pre-populated legal draft. The merchant types a quick minor edit: *"Customer signed for package at front desk."*
    - **Action Button:** Big green button: `Approve & Submit Evidence`. Click it! A spinner fires and turns into a green checkmark: *"Evidence Successfully Filed to PayPal!"*
- **Spoken Audio:** 
  > *"Here is the merchant review screen. The agent never files automatically; the human is always in control. We see the clear FIGHT verdict, the itemized evidence checklist, and an editable draft rebuttal. We can open the redaction diff to confirm zero customer PII was leaked. We make a quick edit to the notes, and with one click, approve submission."*

### Scene 4: Proof in PayPal Resolution Center (1:25 – 1:50)
- **Visual:** Switch browser tab to the official PayPal Sandbox Merchant Resolution Center. 
  - Refresh the page.
  - Open dispute `PP-D-27803`. The status has updated from `Waiting for Seller Response` to `Under Review`.
  - Expand the evidence section: show the exact FedEx tracking number, delivery proof, and the merchant's edited note visible inside PayPal's official portal.
- **Spoken Audio:** 
  > *"This isn't a mock. Opening the real PayPal Sandbox Resolution Center shows the dispute has transitioned to 'Under Review'. Our custom REST client submitted the multipart evidence packet with carrier tracking and notes directly through PayPal's Disputes API."*

### Scene 5: The Accept / Refund Path (1:50 – 2:15)
- **Visual:** Back to Dispute Defender. Open a second dispute: Reason `MERCHANDISE_NOT_RECEIVED`, but order tracking was never uploaded.
  - The agent displays an amber banner: `RECOMMENDATION: ACCEPT CLAIM (REFUND BUYER)`.
  - Reason: *"No shipment tracking found. Fighting this dispute will incur a $15 fee with a 0% win probability."*
  - Click `Accept Claim & Refund`. Confirmation dialog appears, click Confirm. Row updates to `REFUNDED & CLOSED`.
- **Spoken Audio:** 
  > *"Dispute Defender is just as smart about when NOT to fight. When an order lacks tracking, the agent recommends accepting the claim immediately, sparing the merchant from non-refundable dispute penalty fees."*

### Scene 6: AG Grid Analytics Dashboard & Audit Trail (2:15 – 2:30)
- **Visual:** 
  - Click `/analytics`: Display AG Grid / AG Studio dashboard with capital protected ($3,420), win rate (88%), and risk breakdown by reason.
  - Click `/audit`: Show the chronological audit trail detailing every webhook event, tool lookup, and LLM input.
- **Spoken Audio:** 
  > *"Our AG Grid-powered command center gives merchants full visibility into their chargeback win rates and risk volume. And our immutable audit log guarantees every single AI decision is verifiable."*

### Scene 7: Open Source Wrap & Architecture (2:30 – 2:40)
- **Visual:** GitHub repository page showing the open-source MIT license, setup documentation, and tech badges (PayPal Agent Toolkit, Render Workflows, AG Grid, APIMatic).
- **Spoken Audio:** 
  > *"Dispute Defender is 100% open source, self-hostable, and built on the PayPal Agent Toolkit. Turn dispute panic into one-click peace of mind."*

---

## 2. Devpost Submission Assets (Copy-Paste Ready)

### Project Title
**Dispute Defender**

### Tagline
Open-source AI agent that triages PayPal disputes, builds the evidence packet, and submits it after one-click merchant approval.

### Devpost Description

#### The Problem
For solo e-commerce merchants and small businesses, PayPal disputes are stressful, time-consuming, and procedurally unforgiving. Responding to a dispute requires cross-referencing order records, retrieving tracking logs from shipping carriers, drafting a formal legal rebuttal, and navigating PayPal's Resolution Center before a strict deadline expires. Miss the deadline, and you lose the funds, the product, and pay a dispute fee.

#### What Dispute Defender Does
Dispute Defender turns a chaotic 45-minute multi-tab investigation into a 30-second review-and-approve workflow:
1. **Real-Time Ingestion**: Captures incoming dispute webhooks with cryptographic signature verification.
2. **Context Aggregation**: Connects to the PayPal Agent Toolkit to pull order details, transaction history, carrier tracking status, and buyer messages.
3. **Zero-Trust PII Redaction**: Strips sensitive buyer personal information (names, emails, street addresses, phone numbers) before passing context to an LLM.
4. **Intelligent Triage**: An AI agent evaluates the claim against the factual evidence, issuing a structured verdict (**FIGHT** vs **ACCEPT**), confidence score, and an evidence checklist citing exact source fields.
5. **Human-in-the-Loop Approval**: The merchant reviews the evidence, edits the pre-drafted rebuttal note, and approves the action with a single click.
6. **Closing the Toolkit Gap**: Because the official PayPal Agent Toolkit lacks an evidence submission tool, Dispute Defender implements a custom multipart REST client that submits the evidence dossier directly into PayPal's Disputes API.

#### Sponsor Integrations
- **AG Grid / AG Studio ($5,000 Track)**: Powers both the high-performance **Dispute Command Center Queue** (with real-time SLA countdown timers, priority sorting, status renderers, and aggregation footers) and the **Dispute Risk Analytics Dashboard** (capital at risk, win rates by reason, and resolution velocity).
- **Render ($1,000 Track)**: Hosted on Render with **Render Workflows** providing Durability as Code. The multi-step dispute defense pipeline (Ingestion -> Aggregation -> Redaction -> Triage -> Notification) runs with guaranteed execution and automatic retries.
- **APIMatic ($1,000 Track)**: Utilized APIMatic's Context Plugin to generate and validate type-safe PayPal Server SDK integrations for order and transaction resolution.

#### How We Built It
- **Frontend / Fullstack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide icons, AG Grid Community & Enterprise.
- **AI & Orchestration:** Vercel AI SDK (`generateObject` with Zod schemas), Render Workflows.
- **PayPal APIs:** PayPal Agent Toolkit, PayPal Server SDK, and direct PayPal Disputes REST API v1 (`POST /v1/customer/disputes/{id}/provide-evidence`).
- **Persistence:** SQLite with Drizzle ORM for local speed and self-contained zero-dependency hosting.
- **Security:** In-process PII Redactor, HMAC webhook signature verification, zero auto-pilot financial actions.

#### What We Learned & Overcame
PayPal's Customer Disputes API is strictly gated by state: evidence can only be submitted when a dispute is in `WAITING_FOR_SELLER_RESPONSE` and carries a `provide-evidence` HATEOAS link. Furthermore, the evidence payload requires `multipart/form-data` with an `input` JSON string. By reverse-engineering and implementing this exact contract, we bridged the critical missing link in the PayPal Agent Toolkit.

---

## 3. Sandbox Test Buyer Instructions for Hackathon Judges

To verify Dispute Defender with real PayPal Sandbox accounts:
1. Navigate to the hosted demo URL: `https://dispute-defender-8001.onrender.com`
2. Click **Sync Disputes** to populate the AG Grid queue with active sandbox disputes.
3. Select any dispute in `AWAITING APPROVAL` to inspect the AI verdict, evidence checklist, and redaction diff.
4. Edit the merchant notes and click **Approve & Submit Evidence**.
5. Log into the PayPal Sandbox Resolution Center using our provided test credentials:
   - **Merchant Business Login:** `sandbox-merchant@disputedefender.dev`
   - **Password:** `ProvidedInDevpostConfidentialField`
6. Verify that the dispute has transitioned to `UNDER_REVIEW` with the evidence attached.
