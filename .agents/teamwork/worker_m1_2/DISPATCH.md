# Dispatch Assignment: Worker for Milestone M1 Iteration 2 Remediation

## Objective
Apply the exact, verified remediation diffs from `explorer_m1_r2/remediation_strategy.md` to resolve all redactor regex flaws, e2e-runner type errors, and Node 24 isolate exit crashes.

## Mandatory Inputs to Read
1. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\ORIGINAL_REQUEST.md` (Mandatory - read first)
2. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\orchestrator_1\PROJECT.md`
3. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\explorer_m1_r2\remediation_strategy.md` (CRITICAL - follow this blueprint)
4. `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\auditor_m1_1\handoff.md`

## File Ownership
You EXCLUSIVELY own and may modify:
- `src/lib/agent/redactor.ts`
- `src/lib/db/index.ts`
- `src/scripts/seed-disputes.ts`
- `src/test/e2e-runner.ts` (if fixing TypeScript compile errors)

DO NOT modify files outside your ownership.

## Concrete Implementation Tasks
1. **Apply Redactor Regex Fixes** in `src/lib/agent/redactor.ts`:
   - Replace `PHONE_REGEX` with the bounded pattern from Section 2.3 of `remediation_strategy.md`.
   - Replace `ADDRESS_REGEX` with the bounded `SUFFIXES` and `UNIT_SPECIFIERS` pattern from Section 3.3.
   - Replace `IP_REGEX` with the compressed IPv6 pattern from Section 4.2.
   - In `sanitizeText`: run `IP_REGEX` before `PHONE_REGEX`, guard against ISO dates in phone replacement, and apply `ADDRESS_REGEX`.
2. **Apply DB Cleanup & Node 24 Crash Fix**:
   - In `src/lib/db/index.ts`: export `sqlite` and `closeDatabase(): void { sqlite.close(); }`.
   - In `src/scripts/seed-disputes.ts`: import and call `closeDatabase()` in `.then()` and `.catch()`.
3. **Fix Any Type Error in `src/test/e2e-runner.ts`**:
   - Ensure `npx tsc --noEmit` exits with code 0.
4. **Run Verification Commands**:
   - `npx tsx src/test/redactor-adversarial.test.ts` (must be 40/40 passed)
   - `npm run test:redactor` (must be 5/5 passed)
   - `npm run seed` (must exit code 0 without crash)
   - `npx tsc --noEmit` (must be 0 errors, code 0)
   - `npm run build` (must exit code 0)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Criteria
- All 5 verification commands pass with exit code 0.
- Output handoff report written to `d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\worker_m1_2\handoff.md`.
- Communicate completion back via `send_message`.

## 2026-10-25T20:55:21Z
[Message] timestamp=2026-10-25T20:55:21Z sender=fc241d00-af3b-4d42-b8f8-25280e0576ca priority=MESSAGE_PRIORITY_HIGH content=You are worker_m1_2.
Your working directory is:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\worker_m1_2

Read your instructions in:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\worker_m1_2\DISPATCH.md

Crucially read:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\ORIGINAL_REQUEST.md
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\orchestrator_1\PROJECT.md
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\explorer_m1_r2\remediation_strategy.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Apply the exact diffs in src/lib/agent/redactor.ts, src/lib/db/index.ts, src/scripts/seed-disputes.ts, and ensure src/test/e2e-runner.ts compiles cleanly.
Run the 5 verification commands:
1. npx tsx src/test/redactor-adversarial.test.ts (must pass 40/40)
2. npm run test:redactor (must pass 5/5)
3. npm run seed (must exit 0)
4. npx tsc --noEmit (must pass 0 errors)
5. npm run build (must succeed exit 0)

Write your handoff to:
d:\AI-Lab\Hackathon\Paypal AI Hackathon\.agents\teamwork\worker_m1_2\handoff.md
Send a message back to the orchestrator with your command outputs and results.

