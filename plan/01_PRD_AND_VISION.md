# Dispute Defender: Product Requirements Document (PRD) & Product Vision

**Version:** 1.0.0  
**Target Milestone:** PayPal AI Hackathon  
**Author:** @Farhan  
**Date:** October 26, 2026  

---

## 1. Executive Summary & Pitch

**Product Name:** Dispute Defender  
**Tagline:** Autonomous AI agent that triages PayPal disputes, builds the evidence packet, and submits it after one-click merchant approval.  

### The Problem
Small and solo merchants who accept PayPal payments lose thousands of dollars each year to preventable chargebacks and disputes. When a customer files a dispute (e.g. *Merchandise Not Received* or *Significantly Not as Described*), the seller response clock starts ticking immediately—usually granting only 10 to 20 days. 

Investigating and resolving each dispute is painful and fragmented:
1. The merchant must log into the PayPal Resolution Center to read the buyer's claims.
2. They must navigate to their e-commerce store or transaction logs to identify the exact order.
3. They must pull tracking records from carriers (USPS, FedEx, UPS, DHL) to obtain proof of delivery.
4. They must craft a formal legal rebuttal note and format evidence to PayPal's strict specification.

Because solo sellers lack dedicated chargeback operations teams, disputes often sit unattended until the deadline lapses, resulting in default judgment, lost funds, lost merchandise, and PayPal dispute fees.

### The Solution: Dispute Defender
Dispute Defender connects directly to the merchant's PayPal account via the **PayPal Agent Toolkit** and **Disputes REST API**. 

- **Automated Ingestion**: Listens for real-time `CUSTOMER.DISPUTE.*` webhooks and offers an on-demand sync mechanism.
- **Autonomous Context Gathering**: Gathers order details, transaction history, carrier tracking status, and buyer messages into an aggregated dossier.
- **Zero-Trust PII Redaction**: Strips sensitive buyer personal identifiable information (name, address, email, phone) before transmitting context to an LLM.
- **Intelligent Triage**: An AI agent evaluates the claim against the factual evidence, issuing a structured verdict (**FIGHT** vs **ACCEPT**), confidence score, and an itemized evidence checklist with direct source traceability.
- **Human-in-the-Loop 1-Click Submission**: Displays a high-clarity command screen with editable draft rebuttal notes. Upon a single merchant click, Dispute Defender compiles the multipart evidence payload and submits it directly into PayPal's Disputes API.

---

## 2. User Persona & Jobs to be Done (JTBD)

### Target User: The Solo Online Merchant / SMB
- **Name:** Alex, solo e-commerce seller (specialty goods, apparel, or digital merchandise).
- **Volume:** 200–2,000 orders/month; encounters 5–15 disputes per month.
- **Pain Point:** Stressed by dispute deadlines, overwhelmed by manual evidence gathering across multiple tabs, anxious about making procedural mistakes that cause lost chargebacks.

### Jobs to be Done
> *"When a buyer files a PayPal dispute, help me instantly determine whether the dispute is winnable, assemble the required proof of fulfillment, and file the official evidence packet to PayPal with a single click so that I protect my revenue without spending hours in administrative paperwork."*

---

## 3. Product Scope & Milestones

### In-Scope (Hackathon MVP)
1. **Intake & Ingestion**:
   - Webhook endpoint with cryptographic signature verification (`verify-webhook-signature`).
   - Manual "Sync Disputes" button that pulls all active disputes via the API.
2. **Context Bundle Assembler**:
   - Pulls order records (`get_order`) and transaction history (`list_transactions`).
   - Retrieves carrier shipment tracking (`get_shipment_tracking`).
   - Captures buyer dispute message logs.
3. **Privacy & Redaction Layer**:
   - Redacts buyer personal data (name, email, shipping street address, phone, IP) before any LLM prompt.
   - Merchant-facing redaction diff preview for complete audit transparency.
4. **AI Triage Engine**:
   - Structured JSON output via Vercel AI SDK.
   - Recommendation: `FIGHT` or `ACCEPT`.
   - Evidentiary checklist citing exact source fields.
   - Pre-drafted merchant rebuttal note.
5. **Human-in-the-Loop Review Screen**:
   - Built with AG Grid: sorts disputes by urgency (`seller_response_due_date`).
   - Review modal: displays verdict, reasons, evidence checklist, draft notes editor, and raw vs redacted diff.
   - Non-negotiable manual approval gate: "Approve & Submit Evidence" or "Accept Claim & Refund".
6. **Submission Engine**:
   - `provide-evidence` custom REST client sending `multipart/form-data` with structured `input` payload.
   - `accept_dispute_claim` execution for unwinnable disputes.
7. **Immutable Audit Trail**:
   - Logs every webhook event, tool lookup, model input, merchant edit, and PayPal API response.

### Stretch Goals (Ranked Priority)
1. **Outcome Tracking**: Ingest `CUSTOMER.DISPUTE.RESOLVED` and calculate merchant win rates.
2. **Dispute Analytics Dashboard (AG Studio)**: Visual breakdown by dispute reason, risk volume, and resolution speed.
3. **Interactive Dispute State Simulator**: Sandbox controls to trigger `require-evidence` and `adjudicate` for live demonstrations.

### Out-of-Scope (Hackathon Non-Goals)
- Multi-tenant OAuth onboarding (Single merchant environment credentials used).
- Autonomous evidence submission without human approval (Zero auto-pilot submissions).
- Production live PayPal transactions (100% Sandbox focused for safe evaluation).

---

## 4. Key Differentiators & Why This Wins

| Dimension | Standard Hackathon Submissions | Dispute Defender (Winning Approach) |
| :--- | :--- | :--- |
| **PayPal API Depth** | Basic order or invoice lookup | Closes the loop on the PayPal Disputes API with custom multipart `provide-evidence` |
| **Agent Autonomy** | Open-loop chatbots or auto-filers | Autonomous context gathering paired with a strict human approval gate |
| **Data Privacy** | Raw user data dumped into LLMs | Zero-trust PII redaction layer with full merchant diff inspection |
| **Production Realism** | Mocked or hardcoded data | Real PayPal Sandbox integration verified in the PayPal Merchant Resolution Center |
| **Sponsor Synergy** | Single sponsor mentioned briefly | Triple sponsor integration: Render Workflows + AG Grid / AG Studio + APIMatic |
