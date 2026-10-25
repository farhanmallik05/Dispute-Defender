# Dispute Defender: Sponsor Alignment & Prize Capture Strategy

**Version:** 1.0.0  
**Target:** PayPal AI Hackathon Sponsor Categories  

---

## 1. Prize Landscape & Tactical Objectives

| Sponsor | Category / Challenge | Prize Amount | Our Implementation in Dispute Defender |
| :--- | :--- | :--- | :--- |
| **AG Grid / AG Studio** | Best Use of AG Grid / AG Studio | **$5,000 (1st)**<br>$2,000 (2nd)<br>$1,000 (3x 3rd) | **Dispute Command Queue** (urgency timers, SLA pills, status renderers) + **Dispute Analytics Dashboard** (volume by reason, risk capital, lifecycle stage) |
| **Render** | Best Use of Render Workflows | **$1,000 (1st)**<br>$750 (2nd)<br>$500 (3rd) | Hosting the Next.js app on Render + Defining the Dispute Lifecycle pipeline as **Render Workflows** (durability as code) |
| **APIMatic** | Best Use of APIMatic Context Plugin | **$1,000 (3x)** + 6 mo subscription | Using APIMatic's plugin to generate and validate PayPal Server SDK bindings for order and transaction resolution |
| **PayPal Main Track** | Overall Grand Prize / AI Track | Top Honors | Best overall AI agent solving an urgent real-world problem with the PayPal Agent Toolkit & Disputes REST API |

---

## 2. Sponsor Track 1: AG Grid & AG Studio ($5,000 First Place Target)

### Why Dispute Defender is the Ideal AG Grid Showcase
A financial dispute queue is high-stakes: missed response windows cause automatic financial forfeiture. AG Grid is not merely used as a generic table; it is transformed into a **Real-Time Financial Risk Command Center**.

### Feature 1: The Dispute Command Center Queue (`src/components/queue/DisputeGrid.tsx`)
1. **Urgency Countdown Renderer**:
   - Custom cell renderer calculating time remaining until `seller_response_due_date`.
   - Dynamic visual badges:
     - `< 24 hours`: Flashing Red Alert badge (`Urgent Action Required`)
     - `< 72 hours`: Amber Warning badge (`Approaching Deadline`)
     - `> 72 hours`: Slate Neutral badge
2. **Interactive Action Column**:
   - Custom cell renderer with "Review & Approve" button linking directly to the decision dossier.
3. **Multi-Column Filtering & Floating Filters**:
   - Quick filters for Lifecycle Stage (`INQUIRY`, `CHARGEBACK`, `PRE_ARBITRATION`), Reason (`MERCHANDISE_NOT_RECEIVED`, `NOT_AS_DESCRIBED`), and Triage Status (`AWAITING_APPROVAL`, `SUBMITTED`).
4. **Amount at Risk Aggregation Footer**:
   - Pinned bottom row calculating total capital under active dispute, total protected, and total refunded.

### Feature 2: AG Studio / AG Grid Dispute Risk Analytics Dashboard (`src/app/analytics/page.tsx`)
1. **Risk by Dispute Reason**:
   - Grouping and pivoting dispute amounts against dispute reasons.
2. **Win-Loss & Resolution Velocity Grid**:
   - Tracks resolution time in days from dispute creation to closure.
3. **SLA Adherence Metrics**:
   - Proves 100% of disputes handled within the response window due to autonomous triage.

---

## 3. Sponsor Track 2: Render & Render Workflows ($1,000 First Place Target)

### Why Durability Matters for Dispute Defender
Financial disputes cannot afford dropped webhooks or half-executed AI triage jobs due to server restarts or transient rate limits. Render Workflows provides **Durability as Code**, making the multi-step dispute defense pipeline resilient against network drops, LLM timeouts, and API rate limits.

### Implementation: The Dispute Defense Workflow (`src/lib/workflows/dispute-pipeline.ts`)
```typescript
import { workflow, step } from '@render/workflows'; // or Render Workflows SDK

export const disputeDefenseWorkflow = workflow('dispute-defense', async (input: { disputeId: string }) => {
  // Step 1: Ingest & Persist Dispute Header
  const dispute = await step('fetch-dispute-header', async () => {
    return await fetchDisputeDetails(input.disputeId);
  });

  // Step 2: Context Aggregation (Orders, Transactions, Tracking)
  const contextBundle = await step('aggregate-context', async () => {
    return await gatherDisputeContext(dispute);
  });

  // Step 3: Zero-Trust PII Redaction
  const sanitizedContext = await step('redact-pii', async () => {
    return sanitizeDisputeContext(contextBundle);
  });

  // Step 4: AI Triage & Evidence Checklist Formulation
  const triageVerdict = await step('ai-triage-verdict', async () => {
    return await runTriageAgent(sanitizedContext);
  });

  // Step 5: Persist Decision & Notify Merchant
  await step('persist-decision', async () => {
    await saveTriageDecision(input.disputeId, triageVerdict);
    await notifyMerchant(input.disputeId, triageVerdict);
  });

  return { disputeId: input.disputeId, status: 'AWAITING_APPROVAL', verdict: triageVerdict.recommendation };
});
```

### Hosting Configuration: `render.yaml`
```yaml
services:
  - type: web
    name: dispute-defender
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PAYPAL_ENV
        value: sandbox
      - key: PAYPAL_CLIENT_ID
        sync: false
      - key: PAYPAL_CLIENT_SECRET
        sync: false
      - key: PAYPAL_WEBHOOK_ID
        sync: false
      - key: AI_MODEL
        value: gemini-2.5-flash
```

---

## 4. Sponsor Track 3: APIMatic Context Plugin ($1,000 Target)

### Implementation
- Install and configure APIMatic's Context Plugin in the agent coding environment.
- Use the plugin to parse the official PayPal Server SDK OpenAPI / API specifications for:
  - Orders v2 (`/v2/checkout/orders/{id}`)
  - Transaction Search v1 (`/v1/reporting/transactions`)
  - Shipment Tracking v1 (`/v1/shipping/trackers`)
- In the project documentation and README, highlight how APIMatic ensured type-safe, version-accurate SDK invocation throughout development.

---

## 5. Judge Scoring Alignment Matrix

| Evaluation Criterion | Weight | How Dispute Defender Wins | Evidence in Repo / Demo |
| :--- | :--- | :--- | :--- |
| **Technological Implementation** | High | Clean integration of PayPal Agent Toolkit, Server SDK, custom REST multipart evidence client, signed webhooks, and Render durable workflows | `src/lib/paypal/*`, `src/lib/workflows/*` |
| **Design & UX** | High | Enterprise-grade AG Grid command center, visual SLA countdowns, side-by-side redaction diff viewer, and 1-click approval modal | `src/components/queue/*`, `src/components/review/*` |
| **Potential Impact** | High | Quantifiable dollar savings for solo merchants facing 10-day dispute deadlines; transforms a 45-min chore into a 30-sec review | PRD metrics, user persona, Devpost pitch |
| **Innovation / Idea** | High | Solves the exact gap in the official PayPal Agent Toolkit (which cannot provide evidence) with a privacy-preserving human-in-the-loop agent | Architecture doc, Triage Agent, Redactor |
| **Presentation** | High | Punchy 2:40 video featuring split-screen sandbox buyer filing -> instant agent triage -> 1-click submission -> evidence confirmed in PayPal Resolution Center | `plan/05_DEMO_SCRIPT_AND_DEVPOST_SUBMISSION.md` |
