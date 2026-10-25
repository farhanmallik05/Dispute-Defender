# Dispute Defender: Risk Matrix, Edge Cases & Emergency Contingency Plan

**Version:** 1.0.0  
**Target:** PayPal AI Hackathon  

---

## 1. Sandbox Mechanics & Technical Risk Assessment

Working with financial sandboxes introduces unique friction points. The table below identifies each potential point of failure, root cause, and pre-engineered mitigation.

| # | Risk / Failure Mode | Severity | Probability | Mitigation Strategy & Built-in Workaround |
| :- | :--- | :---: | :---: | :--- |
| **1** | **Dispute Creation API Restrictions**<br>Creating disputes programmatically requires buyer OAuth consent, `Log in with PayPal`, and `PayPal-Auth-Assertion` headers. | High | High | **Pre-Seed Protocol:** Do not attempt automated dispute creation in CI/CD. Create 6 distinct sandbox disputes manually in the PayPal Buyer Resolution Center on Oct 27, and store their IDs in `seed-disputes.ts`. |
| **2** | **Evidence Rejection Due to State Lock**<br>`POST /provide-evidence` fails with HTTP 400 if the dispute is not currently in `WAITING_FOR_SELLER_RESPONSE` or lacks the `provide-evidence` link. | High | Medium | **HATEOAS Link Gate & State Advancement:**<br>1. Always inspect `dispute.links` before rendering action buttons.<br>2. In Sandbox, use the status update API (`require-evidence`) to advance disputes to the required state. |
| **3** | **Localhost Webhook Delivery**<br>PayPal servers cannot send webhooks to `localhost:3000` during local development. | Medium | High | **Dual Ingestion Engine:**<br>1. Build a manual **Sync Disputes** button that polls `list_disputes` via the Agent Toolkit.<br>2. Build a local webhook simulator script (`scripts/simulate-webhook.ts`) that dispatches signed synthetic payloads.<br>3. Rely on the deployed Render URL for live PayPal webhook registration on Nov 2. |
| **4** | **Sandbox Token Expiration**<br>PayPal OAuth 2.0 access tokens expire every 3 to 8 hours (`expires_in: 32400`). Hardcoded tokens break mid-demo. | High | High | **Token Caching & Auto-Refresh Client:** Implement `getAccessToken()` with an in-memory cache and a 5-minute pre-expiry refresh buffer using `client_id` and `client_secret`. Never store static tokens. |
| **5** | **LLM Hallucination of Evidence**<br>The AI model invents fake tracking numbers or fabricates delivery confirmations. | Critical | Medium | **Fact-Traceability Enforcer:**<br>1. The prompt forbids adding any checklist item without citing an exact source field (`order.amount`, `tracking.carrier_name`).<br>2. The merchant review screen displays the evidence checklist with clickable source pill badges.<br>3. Non-negotiable human approval gate. |
| **6** | **Settled Sandbox Disputes Cannot Be Reopened**<br>Once evidence is submitted or a claim accepted in Sandbox, the dispute moves to `UNDER_REVIEW` or `RESOLVED` and cannot be reverted. | High | High | **Fresh Dispute Quarantine for Recording:** Seed 6 disputes initially for development. On Nov 9, generate 3 pristine disputes specifically for video recording, and hold 2 spare disputes in reserve. |
| **7** | **AG Studio Trial Licensing Friction**<br>AG Studio trial period or license key questions in Discord. | Medium | Low | **Pure AG Grid Community Fallback:** Build all queue and analytics features using standard AG Grid Community features with custom styling, so zero proprietary license keys are mandatory for judges to clone and run the repo. |

---

## 2. Prioritized Scope Cut Order (Contingency Triage)

If engineering hours are constrained by unexpected personal or professional obligations, features must be cut in this exact sequence to preserve the core winning narrative:

### Tier 1 Cuts (First to sacrifice)
1. **AG Studio Analytics Dashboard**: Replace `/analytics` with a simple stat summary card row (`Total Disputes`, `Protected Funds`, `Win Rate`).
2. **Render Workflows Durable Orchestration**: Fall back to an in-process asynchronous task runner with exponential backoff retries (`p-retry`).
3. **Make-Offer & Send-Message Actions**: Eliminate secondary settlement offers; focus 100% on the core `FIGHT` (provide evidence) and `ACCEPT` (refund) branches.

### Tier 2 Cuts (Second to sacrifice)
4. **Automated Outcome Webhook Tracking**: Remove `CUSTOMER.DISPUTE.RESOLVED` ingestion and calculate win rates statically from local decision logs.
5. **Sandbox Dispute State Simulator**: Remove admin simulator buttons; rely solely on manual sandbox dispute seeding.

### Non-Negotiable Invariants (NEVER CUT UNDER ANY CIRCUMSTANCES)
- **The Human Approval Gate**: An AI agent cannot autonomously move merchant money or file binding legal evidence without an explicit merchant click.
- **The PayPal Evidence Submission Client**: The custom multipart `provide-evidence` REST call that fills the PayPal Agent Toolkit gap.
- **Zero-Trust PII Redaction & Diff Inspector**: Redacting customer data before LLM inference and proving it in the UI.
- **Full Transparency Audit Log**: Chronicling every tool call, model input, and merchant action.
- **Working Local Clone & Sandbox Instructions**: The judges must be able to run the project or view the hosted Render instance with clear test credentials.
- **The 2:40 Video Demonstration**: Concise, punchy, showing real evidence appearing in PayPal's Resolution Center.
