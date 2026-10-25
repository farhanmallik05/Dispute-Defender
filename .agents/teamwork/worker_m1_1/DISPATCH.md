# Dispatch Assignment: Milestone M1 Worker (Core Pipeline & Backend Remediation)

## Objective
Implement core pipeline fixes and build remediation in `dispute-defender` per requirements R1, R2, R5, and acceptance criteria.

## Mandatory Inputs to Read
1. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\ORIGINAL_REQUEST.md` (Mandatory - read first)
2. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\orchestrator_1\PROJECT.md`
3. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\spec_miner_survey_1\survey_report.md`
4. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\explorer_survey_2\survey_report.md`
5. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\explorer_survey_3\survey_report.md`

## File Ownership
You EXCLUSIVELY own and may modify:
- `src/lib/agent/redactor.ts`
- `src/test/redactor.test.ts`
- `src/app/api/disputes/[id]/approve/route.ts`
- `src/lib/workflows/dispute-pipeline.ts`
- `src/lib/paypal/disputes.ts`
- `src/lib/paypal/webhook-verify.ts`
- `next.config.mjs`
- `package.json` (if build script adjustments are needed)

DO NOT modify files outside your ownership.

## Concrete Tasks
1. **Fix Zero-Trust PII Redactor**:
   In `src/lib/agent/redactor.ts:20`, expand `ADDRESS_REGEX` to include `Terrace`, `Circle`, `Place`, `Highway`, `Loop`, `Crescent`, `Crt`, etc., and ensure unit tests in `src/test/redactor.test.ts` pass with 100% masking on all test cases (including `742 Evergreen Terrace`). Run `npm run test:redactor` to verify.
2. **Fix Approval Route Dynamic Tracking Sourcing**:
   In `src/app/api/disputes/[id]/approve/route.ts`, remove hardcoded `trackingNumber: '122533485'` and `carrierName: 'FEDEX'`. Dynamically load the associated dispute and dispute context from the database (`disputeContexts`), parse the stored tracking data or carrier information, and provide the real carrier and tracking number to `submitDisputeEvidence()`.
3. **Fix Drizzle ORM Query in Dispute Pipeline**:
   In `src/lib/workflows/dispute-pipeline.ts:144`, replace `.where({ id: disputeId } as any)` with `.where(eq(disputes.id, disputeId))`.
4. **Fix PayPal HATEOAS Link Matching**:
   In `src/lib/paypal/disputes.ts`, update `isActionAllowed()` to check both hyphenated and underscore link relations (`provide-evidence` / `provide_evidence`, `accept-claim` / `accept_claim`).
5. **Resolve Next.js Production Build Issue**:
   Ensure `npm run build` succeeds cleanly. In `next.config.mjs`, ensure `experimental: { serverComponentsExternalPackages: ['better-sqlite3'] }` (or `serverExternalPackages: ['better-sqlite3']` for Next 14/15) is configured, and run whatever build/compile steps are needed so `npm run build` exits 0.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Criteria
- `npm run test:redactor` passes with 100% assertions.
- `npx tsc --noEmit` passes with 0 errors.
- `npm run build` passes with 0 errors.
- Output handoff report written to `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\worker_m1_1\handoff.md`.
- Communicate completion back via `send_message`.


## 2026-10-25T19:53:28Z
You are worker_m1_1.
Your working directory for metadata and reports is:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\worker_m1_1

Read your instructions in:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\worker_m1_1\DISPATCH.md

Crucially read:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\ORIGINAL_REQUEST.md
and:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\orchestrator_1\PROJECT.md
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\explorer_survey_2\survey_report.md
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\spec_miner_survey_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. Fix ADDRESS_REGEX in src/lib/agent/redactor.ts so npm run test:redactor passes 100%.
2. Fix src/app/api/disputes/[id]/approve/route.ts to dynamically read tracking and carrier from disputeContexts.
3. Fix Drizzle query in src/lib/workflows/dispute-pipeline.ts:144.
4. Fix PayPal HATEOAS link checking in src/lib/paypal/disputes.ts.
5. Resolve better-sqlite3 build/runtime configuration in next.config.mjs so npm run build succeeds cleanly.

Run npm run test:redactor, npx tsc --noEmit, and npm run build.
Write your handoff to:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\worker_m1_1\handoff.md
When done, send a message back with your verification commands and outputs.
