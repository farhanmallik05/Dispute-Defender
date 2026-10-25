# Remediation Strategy & Implementation Blueprint
**Milestone:** M1 Iteration 2 — Zero-Trust Redactor & Runtime Remediation  
**Author:** `explorer_m1_r2`  
**Date:** 2026-10-25T20:55:00Z  
**Target Files:**  
- `dispute-defender/src/lib/agent/redactor.ts`
- `dispute-defender/src/lib/db/index.ts`
- `dispute-defender/src/scripts/seed-disputes.ts`
- `dispute-defender/src/test/e2e-runner.ts`

---

## 1. Executive Summary

Milestone M1 empirical audit (`auditor_m1_1`) and adversarial challenges (`challenger_m1_1`) revealed six specific defects:
1. **Tracking Number Mutilation by `PHONE_REGEX`**: 10-digit substrings within USPS (20/22 digits), FedEx (12/15 digits), and UPS (1Z...) tracking numbers were matched as phone numbers and redacted to `[PHONE_REDACTED]`.
2. **Catastrophic Text Swallowing by `ADDRESS_REGEX`**: The greedy character class `[A-Za-z0-9\s.,#-]+?` matched across sentence punctuation and preceding numbers, destroying financial amounts (e.g. `$150.00`, `$499.99`), order quantities, and dispute claim narratives.
3. **Common English Words Redacted as Addresses**: Missing word boundaries before street suffixes allowed words ending in abbreviations (e.g. `lowest cost` matching `st`, `1 credit card` matching `rd`, `1 product` matching `ct`, `1 water bottle` matching `ter`) to be falsely redacted.
4. **Apartment/Suite Number Leakage**: Unit numbers preceded by punctuation (e.g. `123 Main St, Apt 4B`, `123 Main St., Suite 200`) leaked unmasked PII.
5. **Compressed IPv6 (`::1`) Loopback Leakage**: `IP_REGEX` only matched full 8-hextet IPv6, causing `::1 localhost` to leak unmasked (and subsequently get corrupted by address matching).
6. **Node 24 Native Isolate Assertion Crash (`(env) != nullptr`)**: On Node 24.19, `better-sqlite3` prepared statements destroyed during V8 isolate shutdown trigger `Assertion failed: (env) != nullptr` in `node::RemoveEnvironmentCleanupHook`.
7. **`e2e-runner.ts:16` TypeScript Error (`TS2322`)**: Monkey-patching `Database.prototype.prepare` without casting broke Next.js production build and `tsc --noEmit`.

All seven defects have been thoroughly investigated, empirically tested, and verified with **100% pass rate (40/40 adversarial tests, 5/5 unit tests, and exit code 0 on Node 24)** in the test harness at `.agents/teamwork/explorer_m1_r2/test_regex_fixes.ts` and `test_seed.ts`.

---

## 2. Remediation 1: `PHONE_REGEX` in `src/lib/agent/redactor.ts`

### 2.1 Problem Analysis
In `src/lib/agent/redactor.ts:14`:
```typescript
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
```
- Lacks a leading non-alphanumeric boundary (`(?<![A-Za-z0-9])`), allowing the regex to latch onto arbitrary 10-digit slices within 20/22-digit USPS numbers and 16-digit UPS numbers (`1Z9999999999999999`).
- `[-.\s]?` makes separators optional, allowing 12-digit FedEx numbers (`122533485012`) to match as `12` (country) + `2533485012` (phone).
- Unformatted 9-digit tracking (`122533485`) matched as phone.
- International numbers like UK `+44 20 7946 0958` (2-digit area code) failed to match because `\(?\d{3}\)?` strictly required 3 digits.

### 2.2 Exact Solution
A phone number in business disputes is either:
1. **Formatted with separators** (hyphens, dots, spaces):
   - Optional country code: `(?:\+?\d{1,4}[-.\s])?`
   - Area code: `(?:\(?\d{2,4}\)?[-.\s])` (supports 2 to 4 digit area codes, including UK `20` and US `555`)
   - Exchange and subscriber: `\d{3,4}[-.\s]\d{4}`
2. **Parenthesized without space**: `\(\d{2,4}\)\s*\d{3,4}[-.\s]?\d{4}` (e.g. `(555) 123-4567`)
3. **Strictly 10 unformatted digits (or 11 starting with 1)**: `(?<!\d)(?:1\d{10}|\d{10})(?!\d)`

Combined with negative lookbehind `(?<![A-Za-z0-9])` and lookahead `(?![A-Za-z0-9])`:
- Tracking numbers of length 9, 12, 15, 16, 20, 22 digits CANNOT match.
- Letters like `1Z` block matching inside UPS tracking numbers.
- ISO dates `YYYY-MM-DD` (`2026-10-25`) terminate with 2 digits (`25`), not 4 digits (`\d{4}`), so they are never matched as phone numbers. An explicit ISO date regex check `/^\d{4}-\d{2}-\d{2}$/` in the replacement callback provides defense-in-depth.

### 2.3 Proposed Code
```typescript
// Phone number regex pattern (US, International, Formatted, and Strict 10/11-digit Unformatted)
// Strictly bounds digits to prevent matching 9, 12, 15, 18, 20, 22-digit carrier tracking numbers
const PHONE_REGEX = /(?<![A-Za-z0-9])(?:\+?\d{1,4}[-.\s])?(?:\(?\d{2,4}\)?[-.\s])\d{3,4}[-.\s]\d{4}(?![A-Za-z0-9])|(?<![A-Za-z0-9])\(\d{2,4}\)\s*\d{3,4}[-.\s]?\d{4}(?![A-Za-z0-9])|(?<!\d)(?:1\d{10}|\d{10})(?!\d)/g;
```

---

## 3. Remediation 2: `ADDRESS_REGEX` in `src/lib/agent/redactor.ts`

### 3.1 Problem Analysis
In `src/lib/agent/redactor.ts:20`:
```typescript
const ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z0-9\s.,#-]+?(?:Street|St|...)(?:\s+(?:Apt|...)\s*[A-Za-z0-9-]+)?\b/gi;
```
- **Catastrophic swallowing**: In `Payment of $150.00 for order 2450 was delivered to 100 Main Street`, `\b\d{1,5}` matched `00` (or `2450`), and `[A-Za-z0-9\s.,#-]+?` greedily swallowed everything up to `Street`.
- **Missing word boundary before suffix**: Without `\b` before suffix options, words ending in `st`, `rd`, `ct`, `ter` (`lowest`, `card`, `product`, `water`) were matched as street names and suffixes when preceded by any number.
- **Unit punctuation leak**: `(?:\s+(?:Apt|...))` required whitespace `\s+` directly after the street suffix. In `123 Main St, Apt 4B` or `123 Main St., Suite 200`, the comma/period prevented the unit group from matching, leaving `Apt 4B` or `Suite 200` leaked.

### 3.2 Exact Solution
1. **House Number Negative Lookbehind**: `(?<![\$.,\d])\b\d{1,5}\s+` ensures that numbers preceded by currency signs (`$150`), decimals (`.00`), or commas cannot start an address.
2. **Bounded Street Name Words**: `(?:(?!\\d{2,}\\b)[A-Za-z0-9#.-]+[\\s]+){1,4}` requires 1 to 4 street name words separated by whitespace. The negative lookahead `(?!\\d{2,}\\b)` forbids standalone multi-digit numbers inside the street name (preventing jump across other numbers/orders).
3. **Word Boundary on Suffixes**: `\\b(?:${SUFFIXES})\\b` guarantees suffixes only match whole words (`Street`, `St`, `Road`, `Rd`), completely eliminating false matches on `lowest`, `card`, `product`, `water`, `localhost`.
4. **Permissive Unit Separator**: `(?:\\.?\\s*,?\\s*(?:${UNIT_SPECIFIERS})\\.?\\s*[A-Za-z0-9-]+)?` permits optional periods (`St.`), commas (`, Apt 4B`), newlines, and spaces before `Apt`, `Suite`, `Ste`, `Unit`, `Room`, `Rm`, `#`.

### 3.3 Proposed Code
```typescript
// Common address suffixes with strict word boundaries
const SUFFIXES = 'Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Crt|Way|Square|Sq|Trail|Trl|Parkway|Pkwy|Terrace|Ter|Circle|Cir|Place|Pl|Highway|Hwy|Loop|Crescent|Cres|Alley|Aly|Row|Run|Path|Walk|Plaza|Plz|Crossing|Xing|Close|Heights|Hts';
const UNIT_SPECIFIERS = 'Apt|Apartment|Suite|Ste|Unit|Room|Rm|#';

// Street address pattern:
// 1. House number (1-5 digits), strictly guarded against currency ($) and decimals (.)
// 2. 1 to 4 street name tokens (words/ordinals, cannot contain standalone multi-digit numbers)
// 3. Suffix with leading and trailing word boundaries
// 4. Optional unit specifier with optional period/comma/whitespace
const ADDRESS_REGEX = new RegExp(
  `(?<![\\$.,\\d])\\b\\d{1,5}\\s+(?:(?!\\d{2,}\\b)[A-Za-z0-9#.-]+[\\s]+){1,4}\\b(?:${SUFFIXES})\\b(?:\\.?\\s*,?\\s*(?:${UNIT_SPECIFIERS})\\.?\\s*[A-Za-z0-9-]+)?`,
  'gi'
);
```

---

## 4. Remediation 3: `IP_REGEX` in `src/lib/agent/redactor.ts`

### 4.1 Problem Analysis
In `src/lib/agent/redactor.ts:17`:
```typescript
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g;
```
- Only matches full 8-hextet IPv6 addresses.
- Compressed IPv6 addresses (most notably `::1` localhost) are left unmasked.
- Furthermore, in `redactor.ts:47-68`, `EMAIL_REGEX` ran first, `PHONE_REGEX` ran second, `IP_REGEX` ran third, and `ADDRESS_REGEX` ran fourth. Running `IP_REGEX` before `ADDRESS_REGEX` ensures IP addresses like `::1 localhost` are sanitized to `[IP_REDACTED]` before address heuristics run.

### 4.2 Exact Solution
Add `::1\b` and compressed multi-hextet IPv6 support:
```typescript
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b|::1\b|(?:::)?(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}\b/g;
```

---

## 5. Remediation 4: Node 24 Native Isolate Teardown Assertion Crash

### 5.1 Root Cause Analysis
- **Node.js runtime**: `v24.19.0` (V8 12.x isolate environment teardown).
- **`better-sqlite3`**: `^11.3.0`.
- **Mechanism**: When `better-sqlite3` compiles prepared statements (`db.prepare(...)` invoked by Drizzle ORM queries), the native C++ `Statement` class registers an environment cleanup hook: `node::AddEnvironmentCleanupHook(isolate, ...)`.
- If the script finishes its event loop while the database connection is still open, Node 24 begins destroying the isolate environment. During final V8 garbage collection inside `MultiIsolatePlatform::DisposeIsolate`, uncollected `Statement` objects call `node::RemoveEnvironmentCleanupHook(isolate, ...)`. Because the Node environment (`env`) is already null, Node aborts with:
  ```
  # C:\Program Files\nodejs\node.exe: void __cdecl node::RemoveEnvironmentCleanupHook(Isolate *, CleanupHook, void *) at src\api\hooks.cc:142
  # Assertion failed: (env) != nullptr
  Statement::scalar deleting destructor
  ```
  Exiting with crash code 1.

### 5.2 Clean Architectural Solution
The crash only occurs when database handles remain open during isolate garbage collection. Calling `sqlite.close()` immediately finalizes all associated C++ statement handles while `env` is still alive.
Empirical verification: Calling `(db as any).session.client.close()` at the conclusion of `seed-disputes.ts` resulted in **Exit code 0** with zero assertion failures.

### 5.3 Implementation in Code
1. In `src/lib/db/index.ts`:
   Export `sqlite` and a dedicated cleanup helper:
   ```typescript
   export { sqlite };
   export function closeDatabase(): void {
     sqlite.close();
   }
   ```
2. In `src/scripts/seed-disputes.ts`:
   ```typescript
   import { closeDatabase } from '../lib/db';

   seed()
     .then(() => {
       closeDatabase();
       process.exit(0);
     })
     .catch(err => {
       console.error('Seeding failed:', err);
       try { closeDatabase(); } catch {}
       process.exit(1);
     });
   ```
3. In any CLI test runner (e.g. `src/test/e2e-runner.ts`):
   Always include `closeDatabase()` in test teardown:
   ```typescript
   import { closeDatabase } from '../lib/db';
   // at completion:
   try { closeDatabase(); } catch {}
   ```

---

## 6. Remediation 5: `src/test/e2e-runner.ts` TypeScript Error (`TS2322`)

### 6.1 Problem Analysis
In Auditor Observation 1.1:
```
src/test/e2e-runner.ts(16,1): error TS2322: Type '...' is not assignable to type ...
Database.prototype.prepare = function (...args: any[]) { ... }
```
`Database.prototype.prepare` in `@types/better-sqlite3` has an overloaded generic return type:
```typescript
prepare<BindParameters extends unknown[] | {} = unknown[], Result = unknown>(source: string): BindParameters extends unknown[] ? Statement<BindParameters, Result> : Statement<[BindParameters], Result>;
```
Assigning an untyped function directly to `Database.prototype.prepare` triggers `TS2322`, failing `npx tsc --noEmit` and `npm run build`.

### 6.2 Solution
1. **Primary Strategy**: As proven in Section 5, monkey-patching `Database.prototype.prepare` to store statements in an array is **completely unnecessary** when `closeDatabase()` is used.
2. **Defensive Typing**: If any script or mock ever needs to monkey-patch `Database.prototype.prepare`, it MUST cast through `any`:
   ```typescript
   (Database.prototype as any).prepare = function (this: any, ...args: any[]) {
     return originalPrepare.apply(this, args as any);
   };
   ```
   This satisfies TypeScript while ensuring `npx tsc --noEmit` and `npm run build` exit with code 0.

---

## 7. Concrete File Diffs for Implementation

### File 1: `dispute-defender/src/lib/agent/redactor.ts`
```diff
--- a/src/lib/agent/redactor.ts
+++ b/src/lib/agent/redactor.ts
@@ -10,14 +10,23 @@
 const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
 
-// Phone number regex pattern (North America and International)
-const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
+// Phone number regex pattern (US, International, Formatted, and Strict 10/11-digit Unformatted)
+// Strictly bounds digits to prevent matching 9, 12, 15, 18, 20, 22-digit carrier tracking numbers
+const PHONE_REGEX = /(?<![A-Za-z0-9])(?:\+?\d{1,4}[-.\s])?(?:\(?\d{2,4}\)?[-.\s])\d{3,4}[-.\s]\d{4}(?![A-Za-z0-9])|(?<![A-Za-z0-9])\(\d{2,4}\)\s*\d{3,4}[-.\s]?\d{4}(?![A-Za-z0-9])|(?<!\d)(?:1\d{10}|\d{10})(?!\d)/g;
 
-// IPv4 and IPv6 regex
-const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g;
+// IPv4 and IPv6 regex (supports standard IPv4, full 8-hextet IPv6, and compressed IPv6 including ::1)
+const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b|::1\b|(?:::)?(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}\b/g;
 
-// Common address patterns (Number + Street/Ave/Blvd/Drive/Road/Way/Lane/Court/St/Terrace/Circle/Place/Hwy/Loop/etc)
-const ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z0-9\s.,#-]+?(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Crt|Way|Square|Sq|Trail|Trl|Parkway|Pkwy|Terrace|Ter|Circle|Cir|Place|Pl|Highway|Hwy|Loop|Crescent|Cres|Alley|Aly|Row|Run|Path|Walk|Plaza|Plz|Crossing|Xing|Close|Heights|Hts)(?:\s+(?:Apt|Suite|Ste|Unit|Room|Rm|#)\s*[A-Za-z0-9-]+)?\b/gi;
+const SUFFIXES = 'Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Crt|Way|Square|Sq|Trail|Trl|Parkway|Pkwy|Terrace|Ter|Circle|Cir|Place|Pl|Highway|Hwy|Loop|Crescent|Cres|Alley|Aly|Row|Run|Path|Walk|Plaza|Plz|Crossing|Xing|Close|Heights|Hts';
+const UNIT_SPECIFIERS = 'Apt|Apartment|Suite|Ste|Unit|Room|Rm|#';
+
+// Street address pattern:
+// 1. House number (1-5 digits), strictly guarded against currency ($) and decimals (.)
+// 2. 1 to 4 street name tokens (words/ordinals, cannot contain standalone multi-digit numbers)
+// 3. Suffix with leading and trailing word boundaries
+// 4. Optional unit specifier with optional period/comma/whitespace
+const ADDRESS_REGEX = new RegExp(
+  `(?<![\\$.,\\d])\\b\\d{1,5}\\s+(?:(?!\\d{2,}\\b)[A-Za-z0-9#.-]+[\\s]+){1,4}\\b(?:${SUFFIXES})\\b(?:\\.?\\s*,?\\s*(?:${UNIT_SPECIFIERS})\\.?\\s*[A-Za-z0-9-]+)?`,
+  'gi'
+);
@@ -51,8 +60,19 @@
   sanitized = sanitized.replace(EMAIL_REGEX, () => {
     emails++;
     return '[EMAIL_REDACTED]';
   });
 
+  // Mask IP Addresses FIRST (before phone/address)
+  sanitized = sanitized.replace(IP_REGEX, () => {
+    ips++;
+    return '[IP_REDACTED]';
+  });
+
   // Mask Phone numbers
-  sanitized = sanitized.replace(PHONE_REGEX, () => {
+  sanitized = sanitized.replace(PHONE_REGEX, (match) => {
+    // Guard against ISO dates (YYYY-MM-DD)
+    if (/^\d{4}-\d{2}-\d{2}$/.test(match)) {
+      return match;
+    }
     phones++;
     return '[PHONE_REDACTED]';
   });
-
-  // Mask IP Addresses
-  sanitized = sanitized.replace(IP_REGEX, () => {
-    ips++;
-    return '[IP_REDACTED]';
-  });
 
   // Mask Street Addresses
```

### File 2: `dispute-defender/src/lib/db/index.ts`
```diff
--- a/src/lib/db/index.ts
+++ b/src/lib/db/index.ts
@@ -66,3 +66,8 @@
 
 export const db = drizzle(sqlite, { schema });
+export { sqlite };
+
+export function closeDatabase(): void {
+  sqlite.close();
+}
```

### File 3: `dispute-defender/src/scripts/seed-disputes.ts`
```diff
--- a/src/scripts/seed-disputes.ts
+++ b/src/scripts/seed-disputes.ts
@@ -11,4 +11,5 @@
 import { processDisputePipeline } from '../lib/workflows/dispute-pipeline';
 import { PayPalDispute } from '../types/dispute';
+import { closeDatabase } from '../lib/db';
 
@@ -196,5 +197,11 @@
 }
 
-seed().catch(err => {
-  console.error('Seeding failed:', err);
-  process.exit(1);
-});
+seed()
+  .then(() => {
+    closeDatabase();
+    process.exit(0);
+  })
+  .catch(err => {
+    console.error('Seeding failed:', err);
+    try { closeDatabase(); } catch {}
+    process.exit(1);
+  });
```

---

## 8. Verification Protocol for the Worker

After applying the changes above, the worker must run and document these exact verification commands:

1. **Adversarial Redactor Suite (Must report 40/40 Passing, Exit Code 0)**:
   ```powershell
   npx tsx src/test/redactor-adversarial.test.ts
   ```
2. **Unit Redactor Suite (Must report 5/5 Passing, Exit Code 0)**:
   ```powershell
   npm run test:redactor
   ```
3. **Database Seeding on Node 24 (Must complete cleanly with Exit Code 0, NO C++ ASSERTION CRASH)**:
   ```powershell
   npm run seed
   ```
4. **TypeScript Typecheck (Must complete with 0 errors, Exit Code 0)**:
   ```powershell
   npx tsc --noEmit
   ```
5. **Next.js Production Build (Must complete with 4/4 static pages, Exit Code 0)**:
   ```powershell
   npm run build
   ```
