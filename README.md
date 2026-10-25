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
- **[`dispute-defender/`](./dispute-defender/)**: The production fullstack application (Next.js 14, AG Grid, Vercel AI SDK, SQLite / Drizzle ORM, Render Workflows).

## Quick Start
1. Navigate to the application directory:
   ```bash
   cd dispute-defender
   ```
2. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   ```
3. Run the PII Redaction unit test suite:
   ```bash
   npm run test:redactor
   ```
4. Seed sandbox dispute scenarios:
   ```bash
   npm run seed
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## License
MIT License. Open source and self-hostable.
