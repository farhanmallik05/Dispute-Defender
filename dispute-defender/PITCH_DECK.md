# Dispute Defender: Pitch Deck & Presentation Guide 🛡️

This document contains the complete slide-by-slide presentation deck, design specifications, timed 3-minute stage pitch script, 30-second elevator pitch, and judge Q&A defense sheet for **Dispute Defender** at the **PayPal AI Hackathon**.

For the strategic planning suite, please see the [`plan/`](../plan/) directory:
- [`01_PRD_AND_VISION.md`](../plan/01_PRD_AND_VISION.md)
- [`02_ARCHITECTURE_AND_SPECS.md`](../plan/02_ARCHITECTURE_AND_SPECS.md)
- [`03_SPONSOR_ALIGNMENT_STRATEGY.md`](../plan/03_SPONSOR_ALIGNMENT_STRATEGY.md)
- [`04_DAY_BY_DAY_EXECUTION_TIMELINE.md`](../plan/04_DAY_BY_DAY_EXECUTION_TIMELINE.md)
- [`05_DEMO_SCRIPT_AND_DEVPOST_SUBMISSION.md`](../plan/05_DEMO_SCRIPT_AND_DEVPOST_SUBMISSION.md)
- [`06_RISK_MATRIX_AND_FALLBACKS.md`](../plan/06_RISK_MATRIX_AND_FALLBACKS.md)
- [`07_PPT_PITCH_DECK.md`](../plan/07_PPT_PITCH_DECK.md)

---

## 📑 Slide Deck Summary (12 Slides)

1. **Slide 1: Title & Bold Vision** — Dispute Defender: The Autonomous AI Agent for PayPal Merchants.
2. **Slide 2: The $100M Problem** — The Ticking SLA Clock, Multi-Tab Chaos & Default Forfeitures.
3. **Slide 3: The Root Cause** — Why Solo Sellers Lack Enterprise Chargeback Operations.
4. **Slide 4: Introducing Dispute Defender** — 30-Second Review vs 45-Minute Investigation.
5. **Slide 5: The 5-Stage Autonomous Pipeline** — Ingest ➔ Aggregate ➔ Redact ➔ Triage ➔ Submit.
6. **Slide 6: Zero-Trust Security & PII Redaction** — Deterministic regex masking of buyer privacy data.
7. **Slide 7: Strict Human-in-the-Loop Governance** — Autonomous preparation, 100% human authorization.
8. **Slide 8: Closing the PayPal API Gap** — Custom multipart `POST /v1/customer/disputes/{id}/provide-evidence`.
9. **Slide 9: Triple Sponsor Architecture** — AG Grid Command Center + Render Workflows + APIMatic Server SDK.
10. **Slide 10: Empirical Demonstration** — PP-D-27801 Fight with FedEx Proof vs PP-D-27802 Accept without penalty.
11. **Slide 11: Market Opportunity & Unit Economics** — 35M+ PayPal SMBs, 15x ROI on subscription.
12. **Slide 12: Roadmap & Vision** — Multi-carrier auto-dispatch, Shopify integration & GitHub Open Source CTA.

---

## ⏱️ 3-Minute Timed Pitch Script

- **0:00 - 0:30 (The Problem):** The stress of the 10-day ticking clock and 4-tab investigation.
- **0:30 - 1:00 (The Solution):** Automated intake, context gathering via PayPal Agent Toolkit and carrier APIs.
- **1:00 - 1:30 (Privacy & Triage):** Zero-trust PII redaction and evidence-grounded AI verdict (FIGHT vs ACCEPT).
- **1:30 - 2:05 (Governance & PayPal Gap):** Strict 1-click human gate + custom multipart evidence submission REST client.
- **2:05 - 2:35 (Sponsors & Evidence):** AG Grid SLA badges, Render deployment, 46/46 passing test cases.
- **2:35 - 2:50 (Wrap & Call to Action):** 100% open-source, giving solo merchants big business power.

---

*For full slide layouts, typography guidelines, spoken word-for-word scripts, and judge defense answers, refer to [`plan/07_PPT_PITCH_DECK.md`](../plan/07_PPT_PITCH_DECK.md).*
