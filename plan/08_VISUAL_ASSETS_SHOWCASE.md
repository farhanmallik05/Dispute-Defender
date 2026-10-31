# Dispute Defender: Visual Assets & Product UI Showcase 🛡️

This gallery features the 10 high-resolution visual and architecture assets designed for **Dispute Defender**'s PayPal AI Hackathon submission, Devpost presentation, and investor pitch deck.

All image files are available in [`dispute-defender/public/images/`](../dispute-defender/public/images/) and [`plan/images/`](./images/).

---

## 🖼️ Gallery of 10 Hackathon Submission Assets

### 1. Hero Brand Banner & Identity
**File:** [`01_hero_banner.jpg`](./images/01_hero_banner.jpg)  
![Dispute Defender Hero Banner](./images/01_hero_banner.jpg)  
- **Description:** Cinematic dark fintech hero visual featuring the holographic cyan-blue cybersecurity shield emblem with PayPal corporate navy (`#003087`) and electric blue (`#0070BA`) accents. Floating 3D glass cards display real-time dispute metrics and AI verdict badges (`FIGHT 95% CONFIDENCE`).
- **Use Case:** Devpost header, GitHub repository hero banner, and Slide 1 of the Pitch Deck.

---

### 2. Dispute Command Center Queue (AG Grid Community)
**File:** [`02_command_center_queue.jpg`](./images/02_command_center_queue.jpg)  
![Dispute Command Center Queue](./images/02_command_center_queue.jpg)  
- **Description:** High-fidelity UI dashboard mockup of the Dispute Defender Command Center. Features KPI cards (Capital at Risk: $840.50, Win Rate: 92%, Active Disputes: 4) and the AG Grid data table with real-time SLA countdown pills (`CRITICAL: 14h Left` in glowing red, `URGENT: 48h Left` in amber), AI recommendations, and 1-click Review & Approve triggers.
- **Use Case:** AG Grid sponsor demonstration ($5,000 prize track) and Devpost product tour.

---

### 3. 1-Click Merchant Review Dossier & Approval Screen
**File:** [`03_review_dossier.jpg`](./images/03_review_dossier.jpg)  
![1-Click Review Dossier](./images/03_review_dossier.jpg)  
- **Description:** Detailed case review dossier for dispute `PP-D-27801` ($189.00 USD). Displays the glowing emerald green `RECOMMENDATION: FIGHT (95% Confidence)` verdict card, verified evidence checklist citing FedEx tracking (`122533485: DELIVERED`), editable merchant legal rebuttal draft, and the primary CTA button `Provide Evidence to PayPal (1-Click Approve)`.
- **Use Case:** Demonstrating strict Human-in-the-Loop governance and fact-traceable AI triage.

---

### 4. Zero-Trust PII Redaction Diff Modal
**File:** [`04_redaction_diff_modal.jpg`](./images/04_redaction_diff_modal.jpg)  
![Zero-Trust PII Redaction Diff Modal](./images/04_redaction_diff_modal.jpg)  
- **Description:** Side-by-side comparison modal illustrating fintech AI data privacy. The left column shows raw customer dispute context with sensitive privacy fields (name, email, street address) highlighted in alert red/amber. The right column shows the deterministic masked tokens (`[BUYER_NAME_REDACTED]`, `[EMAIL_REDACTED]`, `[STREET_ADDRESS_REDACTED]`) with a verified security badge: `100% PII Masked Before LLM Ingestion`.
- **Use Case:** Privacy, security, GDPR/CCPA compliance verification.

---

### 5. Official PayPal Sandbox Resolution Center Proof
**File:** [`05_paypal_resolution_center_proof.jpg`](./images/05_paypal_resolution_center_proof.jpg)  
![PayPal Resolution Center Proof](./images/05_paypal_resolution_center_proof.jpg)  
- **Description:** Split-screen photorealistic display proving end-to-end integration. The left pane shows Dispute Defender's toast notification `Evidence Submitted Successfully`. The right pane shows the live official PayPal Sandbox Resolution Center portal where dispute `PP-D-27801` has updated to `Under Review`, showing the uploaded FedEx tracking number, delivery date scan, and merchant legal note inside PayPal's official interface.
- **Use Case:** Proving Dispute Defender closes the loop on PayPal's REST Disputes API.

---

### 6. Accept Claim & Refund Defense Flow (Knowing When NOT to Fight)
**File:** [`06_accept_claim_defense.jpg`](./images/06_accept_claim_defense.jpg)  
![Accept Claim Defense Flow](./images/06_accept_claim_defense.jpg)  
- **Description:** Demonstrates Dispute Defender's strategic decision engine for unwinnable claims (dispute `PP-D-27802` with missing carrier tracking). An amber-gold warning card displays `RECOMMENDATION: ACCEPT CLAIM (REFUND BUYER)`. Highlights 0% win probability and advises accepting the claim immediately to save the merchant a non-refundable $15 dispute fee.
- **Use Case:** Highlighting merchant cost optimization and intelligent chargeback triage.

---

### 7. Risk Analytics Matrix (AG Grid & AG Studio)
**File:** [`07_risk_analytics_matrix.jpg`](./images/07_risk_analytics_matrix.jpg)  
![Risk Analytics Matrix](./images/07_risk_analytics_matrix.jpg)  
- **Description:** Executive risk analytics dashboard featuring the AG Grid Risk Matrix. Grouped by Dispute Reason (*Merchandise Not Received*, *Not As Described*, *Unauthorised Transaction*), metric columns show total at risk, defended capital ($3,420.00), win rates (88-92%), and primary defense playbooks, topped with sparkline KPI cards.
- **Use Case:** AG Grid / AG Studio sponsor prize submission ($5,000 track).

---

### 8. Immutable Audit Trail & Verifiable Event Chain
**File:** [`08_immutable_audit_trail.jpg`](./images/08_immutable_audit_trail.jpg)  
![Immutable Audit Trail](./images/08_immutable_audit_trail.jpg)  
- **Description:** Chronological audit event stream detailing every system milestone: `WEBHOOK_RECEIVED (HMAC Verified)`, `CONTEXT_AGGREGATED (Orders v2 + FedEx)`, `PII_REDACTED (4 entities masked)`, `AI_TRIAGE_COMPLETED (Verdict: FIGHT, Conf: 95%)`, `MERCHANT_APPROVED (Manual 1-Click Gate)`, and `EVIDENCE_SUBMITTED (PayPal REST API 200 OK)`. Each entry displays timestamps, actors, and cryptographic event hash pills.
- **Use Case:** Enterprise auditability, regulatory compliance, and non-repudiation.

---

### 9. 5-Stage System Architecture & Data Flow Pipeline
**File:** [`09_architecture_pipeline.jpg`](./images/09_architecture_pipeline.jpg)  
![Architecture Pipeline Diagram](./images/09_architecture_pipeline.jpg)  
- **Description:** Isometric 3D architectural diagram depicting the six interconnected modular blocks: 1. PayPal Webhooks (HMAC SHA-256) ➔ 2. Context Aggregator (PayPal Agent Toolkit Orders & Tracking) ➔ 3. Zero-Trust PII Redactor ➔ 4. Structured AI Triage Agent (Vercel AI SDK) ➔ 5. Human Approval Gate (1-Click UI) ➔ 6. Custom Multipart REST Evidence Injection into PayPal Disputes API.
- **Use Case:** Architecture slide in pitch deck and technical documentation.

---

### 10. Devpost Presentation & Feature Showcase Poster
**File:** [`10_devpost_showcase_poster.jpg`](./images/10_devpost_showcase_poster.jpg)  
![Devpost Showcase Poster](./images/10_devpost_showcase_poster.jpg)  
- **Description:** High-impact showcase presentation poster. Features a 3D MacBook Pro running the Dispute Defender command center alongside an iPhone showing mobile 1-click approval. Highlights sponsor track badges (AG Grid $5,000, Render $1,000, APIMatic $1,000) and key metrics (46/46 automated tests passing, 100% PII redaction, 0 default forfeitures).
- **Use Case:** Devpost project gallery cover, social media promotional banner, and hackathon submission thumbnail.
