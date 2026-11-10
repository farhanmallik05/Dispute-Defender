# Dispute Defender (PayPal AI Hackathon Master Workspace)

> **Dispute Defender**: Open-source autonomous AI agent that triages PayPal disputes, builds the evidence packet, and submits it after one-click merchant approval.

This repository contains the complete hackathon submission materials, architecture documentation, and codebase:

## Workspace Structure
- **[`plan/`](./plan/)**: Comprehensive strategic planning suite
  - [`01_PRD_AND_VISION.md`](./plan/01_PRD_AND_VISION.md): Complete PRD, target user persona, jobs to be done, and scope boundaries.
  - [`02_ARCHITECTURE_AND_SPECS.md`](./plan/02_ARCHITECTURE_AND_SPECS.md): Architectural topology, multipart evidence REST spec, HATEOAS link evaluation, and PII redactor.
  - [`03_SPONSOR_ALIGNMENT_STRATEGY.md`](./plan/03_SPONSOR_ALIGNMENT_STRATEGY.md): Targeted technical alignment for **AG Grid / AG Studio** ($5k track), **Render Workflows** ($1k track), and **APIMatic Context Plugin** ($1k track).
  - [`04_DAY_BY_DAY_EXECUTION_TIMELINE.md`](./plan/04_DAY_BY_DAY_EXECUTION_TIMELINE.md): 17-day execution timeline with daily deliverables and Gates 1–4.
  - [`05_DEMO_SCRIPT_AND_DEVPOST_SUBMISSION.md`](./plan/05_DEMO_SCRIPT_AND_DEVPOST_SUBMISSION.md): Timed 2:40 video script, split-screen scenes, and copy-paste Devpost submission text.
  - [`06_RISK_MATRIX_AND_FALLBACKS.md`](./plan/06_RISK_MATRIX_AND_FALLBACKS.md): Sandbox friction mitigations, token refresh rules, and emergency scope cut order.
  - [`07_PPT_PITCH_DECK.md`](./plan/07_PPT_PITCH_DECK.md): 12-slide pitch deck blueprint, timed live pitch scripts, and judge Q&A defense guide.
  - [`08_VISUAL_ASSETS_SHOWCASE.md`](./plan/08_VISUAL_ASSETS_SHOWCASE.md): 10-piece production visual asset catalogue and Devpost showcase layout.
  - [`09_MASTER_GAP_CLOSURE_PLAN.md`](./plan/09_MASTER_GAP_CLOSURE_PLAN.md): Exhaustive 8-phase gap closure blueprint and technical completion roadmap.
  - [`PROJECT_REPORT.md`](./plan/PROJECT_REPORT.md): Comprehensive end-to-end master project report for hackathon submission and evaluation.
- **[`presentation/`](./presentation/)**: Submission presentation slide deck
  - [`dispute-defender.md`](./presentation/dispute-defender.md): 12-slide Marp-compatible presentation deck with speaker notes and honest verification boundaries.
- **[`PAYPAL_DESIGN.md`](./PAYPAL_DESIGN.md)**: PayPal-inspired visual design tokens, typography, hierarchy, and interaction specifications.
- **[`dispute-defender/`](./dispute-defender/)**: The production fullstack application (Next.js 14, AG Grid, Vercel AI SDK, SQLite, Render deployment).

## Quick Start
1. Navigate to the application directory:
   ```bash
   cd dispute-defender
   ```
2. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   ```
3. Run the comprehensive test harness:
   ```bash
   # Unified test runner (Redactor, Carrier, Health, Resilience, E2E, Challenger)
   npm run test:all

   # Adversarial redactor & challenger stress suites
   npx tsx src/test/redactor-adversarial.test.ts
   npx tsx src/test/challenger-adversarial.test.ts
   ```
4. Seed sandbox dispute scenarios:
   ```bash
   npm run seed
   ```
5. Build and start the production application:
   ```bash
   npm run build
   npm start
   ```
   Or start in development mode: `npm run dev` (http://localhost:3000)

## Verified Test Coverage (100% Pass Rate)
- **Unit & Security**: Zero-Trust PII Redaction (5/5)
- **Carrier Intelligence**: Pattern detection for UPS, USPS, FedEx, DHL (6/6)
- **Self-Diagnostic Health**: SQLite, PayPal auth, and AI model health probes (6/6)
- **UI Resilience**: Graceful handling of empty, 404, 400, and offline states (5/5)
- **4-Tier E2E Suite**: Opaque-box verification across 32 integration scenarios (32/32)
- **Empirical Challenger**: Dynamic carrier sourcing & HATEOAS pre-flight checks (14/14)
- **Adversarial Stress Suites**: ReDoS, prompt injections, boundary addresses (81/81)
- **Total Passing Automated Tests**: **149 / 149**

## License
MIT License. Open source and self-hostable.
