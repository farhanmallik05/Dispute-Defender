# Dispatch Assignment: E2E Test Suite Writer

## Objective
Implement a comprehensive, opaque-box 4-tier automated test harness and runner for Dispute Defender (`src/test/e2e-runner.ts`) based on `TEST_INFRA.md` and `ORIGINAL_REQUEST.md`.

## Mandatory Inputs to Read
1. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\ORIGINAL_REQUEST.md` (Mandatory - read first)
2. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\orchestrator_1\TEST_INFRA.md`
3. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\orchestrator_1\PROJECT.md`
4. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\explorer_survey_3\survey_report.md` (Section 3: Testing Strategy)

## File Ownership
You EXCLUSIVELY own and may create/modify:
- `src/test/e2e-runner.ts`
- `src/test/e2e-helpers.ts` (if needed)
- `package.json` (add `"test:e2e": "tsx src/test/e2e-runner.ts"` script)

DO NOT modify files outside your ownership.

## Concrete Tasks
1. Build `src/test/e2e-runner.ts` that implements tests covering:
   - **Tier 1 (Core Feature Coverage, happy paths)**:
     - Webhook signature verification
     - Sandbox sync routine
     - Context aggregator merging order & tracking
     - Zero-Trust redactor 100% masking PII
     - Triage agent structured output schema conformance
     - Delivered tracking -> FIGHT (>90% confidence) with PROOF_OF_FULFILLMENT
     - Missing tracking -> ACCEPT (>90% confidence)
     - Approval route dynamic tracking submission
     - Accept claim route execution & audit logging
   - **Tier 2 (Boundary Value Analysis)**:
     - SLA countdown urgency partition (<48h urgent, <24h critical)
     - Extreme dispute amounts ($0.01 micro-transaction, $10,000.00 high value)
     - Sparse context (missing message or tracking)
     - Complex addresses with varied suffixes
     - Dual HATEOAS link styles
   - **Tier 3 (Pairwise Interactions)**:
     - Combinations across dispute reasons (INR vs SNAD), tracking statuses (DELIVERED, IN_TRANSIT, MISSING), and merchant actions
   - **Tier 4 (Real-World Application Workflows & Stress)**:
     - Full lifecycle simulation: Ingest -> Context -> Redact -> Triage -> Edit Rebuttal -> Approve -> PayPal API -> Audit Chain
     - Prompt injection defense test (verifying prompt injection in buyer message is neutralized and does not alter system recommendation)
     - Audit chain completeness verification (every event timestamped in chronological order)
2. Ensure the test runner can run via `npm run test:e2e` and outputs clean, structured results: total tests, passed, failed, and timing.
3. Test runner must support `INTEGRITY_MODE=demo` (hermetic local mocking using the app's internal mock/sandbox fallbacks) and `INTEGRITY_MODE=sandbox` (live PayPal sandbox if credentials are present).
4. Run `npm run test:e2e` and document results.
5. Publish `d:\AI-Lab\Hackathon\Paypal AI Hackathon\TEST_READY.md` once complete with coverage summary.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Criteria
- `src/test/e2e-runner.ts` created and functional.
- `"test:e2e"` script in `package.json`.
- `npm run test:e2e` executes and reports results cleanly.
- `d:\AI-Lab\Hackathon\Paypal AI Hackathon\TEST_READY.md` published.
- Output handoff report written to `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\test_writer_e2e_1\handoff.md`.
- Communicate completion back via `send_message`.


## 2026-10-25T19:53:28Z
You are test_writer_e2e_1.
Your working directory for metadata and reports is:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\test_writer_e2e_1

Read your instructions in:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\test_writer_e2e_1\DISPATCH.md

Crucially read:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\ORIGINAL_REQUEST.md
and:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\orchestrator_1\TEST_INFRA.md
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\explorer_survey_3\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. Complete 4-tier opaque-box E2E automated test harness in src/test/e2e-runner.ts covering Tiers 1-4 (>= 25 test cases).
2. Add "test:e2e" script to package.json.
3. Support both INTEGRITY_MODE=demo and INTEGRITY_MODE=sandbox.
4. Run npm run test:e2e and verify execution.
5. Publish d:\AI-Lab\Hackathon\Paypal AI Hackathon\TEST_READY.md once complete.

Write your handoff to:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\test_writer_e2e_1\handoff.md
When done, send a message back with test results.
