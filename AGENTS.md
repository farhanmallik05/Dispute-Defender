# Repository Agent Instructions

## Scope and source of truth

- The runnable application is `dispute-defender/`; run all npm commands from that directory.
- `plan/` and `presentation/` contain hackathon submission material; update claims only after checking the current code and verification output.
- Treat `README.md`, `HANDOFF.md`, and plan documents as potentially aspirational; package scripts and executable code are authoritative.

## Runtime and persistence

- Use Node `>=22.5.0`; the database uses the built-in `node:sqlite` driver, not `better-sqlite3`.
- `src/lib/db/index.ts` creates the SQLite schema at startup and exposes a small Drizzle-shaped adapter; do not assume full Drizzle query support or replace the driver casually.
- `DATABASE_URL` is a SQLite filename and defaults to `sqlite.db` relative to the process working directory. Use `DATABASE_URL=:memory:` or a fresh temporary file for tests so local database/WAL state cannot affect results.
- File-backed startup uses a transient `<database>.init.lock` to serialize SQLite schema/PRAGMA initialization across Next build workers; the lock is ignored by Git and should disappear after startup.
- `npm run db:push` is not the normal setup path; there is no verified Drizzle migration workflow, because startup schema creation is the current mechanism.
- Never commit `.env`, PayPal/AI secrets, or generated SQLite files; use `.env.example` as the variable template.

## Setup and verification

```powershell
cd dispute-defender
npm install
Copy-Item .env.example .env
$env:INTEGRITY_MODE = "demo"
$env:DATABASE_URL = Join-Path $env:TEMP "dispute-defender-demo.sqlite"
npm run seed
npm run dev                 # http://localhost:3000
```

- Before submission, run `npm run build`, then `npm run test:all` with an isolated database; the latter runs redactor, carrier, health, resilience, E2E, and challenger checks in package-script order.
- Run adversarial checks separately when changing privacy or approval behavior: `npx tsx src/test/redactor-adversarial.test.ts` and `npx tsx src/test/challenger-adversarial.test.ts`.
- `npm run test:e2e` and `npm run test:challenger` write fixed dispute IDs and one-time approval states; use a fresh database for each standalone run.
- `npm run lint` currently invokes Next's interactive setup because no ESLint configuration is present; it is not a usable non-interactive CI check.
- Test scripts intentionally avoid explicitly closing the process-owned SQLite handle because Node 24 native cleanup can crash during pending async teardown.

## Application boundaries and safety rules

- The core path is webhook or sync ingress → `processDisputePipeline` → redacted context and triage decision → merchant approval at `/api/disputes/[id]/approve` → PayPal REST action.
- `INTEGRITY_MODE=demo` uses deterministic local heuristics/fixtures. Do not describe demo responses, seeded disputes, or local audit rows as PayPal Sandbox results.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` are required for Sandbox integration; a Gemini or OpenAI key is needed only for real model inference.
- `PAYPAL_ENV` selects the PayPal API environment, while the webhook route currently checks `PAYPAL_MODE=live` before requiring signature headers; reconcile these names before claiming production-ready webhook protection.
- Never fabricate tracking, delivery, win rates, or PayPal outcomes. Missing shipment data must remain missing, and failed external submissions must not become successful local state.
- Preserve the human approval gate, PayPal HATEOAS action-link validation, webhook event replay protection, and PII-redaction tests when changing the financial-action path.
- The sync route falls back to a generated local seed when live PayPal data is unavailable; keep that behavior explicitly labeled as demo/fallback behavior.

## Hackathon completion

- Keep the presentation honest about what is locally verified versus externally confirmed; local tests do not prove live PayPal acceptance, deployment, compliance, user research, or dispute win rates.
- For a real Sandbox demo, configure credentials in `dispute-defender/.env`, use separate Sandbox accounts, and verify the resulting action in PayPal before presenting it as an integration result.
