# Handoff Report: Milestone M1 Empirical Challenge — Zero-Trust Redactor

**Agent ID:** `challenger_m1_1`  
**Recipient:** `fc241d00-af3b-4d42-b8f8-25280e0576ca` (Orchestrator)  
**Date:** 2026-10-25T20:25:00Z  
**Verdict:** **REQUEST_CHANGES**  
**Target File Under Review:** `src/lib/agent/redactor.ts`  
**Empirical Test Suite:** `src/test/redactor-adversarial.test.ts`  

---

## 1. Observation

An empirical adversarial test suite consisting of 40 boundary and stress cases was created in `src/test/redactor-adversarial.test.ts` and executed using `npx tsx src/test/redactor-adversarial.test.ts`.

Execution resulted in **16 failures out of 40 tests** (exit code 1).

### Observation 1.1: Tracking Number Mutilation by `PHONE_REGEX`
- In `src/lib/agent/redactor.ts:14`:
  ```typescript
  const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  ```
- Because `PHONE_REGEX` lacks a leading word boundary (`\b`) or negative lookbehind (`(?<!\d)`), it matches 10-digit substrings within valid tracking numbers.
- Verbatim tool command output:
  ```powershell
  npx tsx -e "import { sanitizeText } from './src/lib/agent/redactor'; console.log(sanitizeText('Shipped via USPS with tracking 9400111899562534567890 on Monday'));"
  ```
  Result:
  ```json
  {
    "sanitizedText": "Shipped via USPS with tracking 940011189[PHONE_REDACTED] on Monday",
    "replacements": { "emails": 0, "phones": 1, "ips": 0, "addresses": 0, "names": 0 }
  }
  ```
- Multiple tracking number formats were empirically verified as corrupted:
  - USPS 22-digit tracking (`9400111899562534567890`) -> `940011189[PHONE_REDACTED]`
  - USPS 20-digit tracking (`92055000000000000000`) -> `9205500[PHONE_REDACTED]`
  - FedEx 12-digit tracking (`122533485012`) -> `[PHONE_REDACTED]`
  - FedEx 15-digit tracking (`961101900000000`) -> `96[PHONE_REDACTED]`
  - UPS 18-character tracking (`1Z9999999999999999`) -> `1Z999[PHONE_REDACTED]`

### Observation 1.2: Catastrophic Overmatching of `ADDRESS_REGEX` Swallowing Amounts and Dispute Facts
- In `src/lib/agent/redactor.ts:20`:
  ```typescript
  const ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z0-9\s.,#-]+?(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Crt|Way|Square|Sq|Trail|Trl|Parkway|Pkwy|Terrace|Ter|Circle|Cir|Place|Pl|Highway|Hwy|Loop|Crescent|Cres|Alley|Aly|Row|Run|Path|Walk|Plaza|Plz|Crossing|Xing|Close|Heights|Hts)(?:\s+(?:Apt|Suite|Ste|Unit|Room|Rm|#)\s*[A-Za-z0-9-]+)?\b/gi;
  ```
- Because `[A-Za-z0-9\s.,#-]+?` matches across sentence punctuation (`.`, `,`) and letters/spaces, any initial number (e.g. quantity, amount, order ID) preceding an address causes the regex to swallow all preceding text:
  - `sanitizeText('Payment of 50 dollars for delivery to 100 Main Street')`
    => `"Payment of [STREET_ADDRESS_REDACTED]"` (financial amount and delivery note destroyed)
  - `sanitizeText('Buyer claimed 2 items were damaged. Sent to 742 Evergreen Terrace')`
    => `"Buyer claimed [STREET_ADDRESS_REDACTED]"` (entire claim rationale destroyed)
  - `sanitizeText('Purchased 3 units for 99 USD delivered to 555 King Crescent')`
    => `"Purchased [STREET_ADDRESS_REDACTED]"` (quantity and financial amount destroyed)
  - `sanitizeText('I paid $499.99 for order TX-ADV-789. Send replacement to 344 Clinton St')`
    => `"I paid $499.[STREET_ADDRESS_REDACTED]"` (cents, order ID, and instructions destroyed)

### Observation 1.3: Non-Address English Words Redacted Due to Missing Word Boundary Before Street Suffix
- Because there is no word boundary before `(?:Street|St|Road|Rd|Court|Ct|...)` in `ADDRESS_REGEX`, words ending in abbreviations like `st`, `rd`, `ct`, `ter` match when preceded by a number:
  - `sanitizeText('Order had 2 items at lowest cost')`
    => `"Order had [STREET_ADDRESS_REDACTED] cost"` (`lowest` ends in `st`)
  - `sanitizeText('Customer paid with 1 credit card')`
    => `"Customer paid with [STREET_ADDRESS_REDACTED]"` (`card` ends in `rd`)
  - `sanitizeText('Customer bought 1 product')`
    => `"Customer bought [STREET_ADDRESS_REDACTED]"` (`product` ends in `ct`)
  - `sanitizeText('Customer filed 1 dispute request')`
    => `"Customer filed [STREET_ADDRESS_REDACTED]"` (`request` ends in `st`)
  - `sanitizeText('Received 1 water bottle')`
    => `"Received [STREET_ADDRESS_REDACTED] bottle"` (`water` ends in `ter`)

### Observation 1.4: Apartment & Suite PII Leakage When Formatted With Comma/Period
- In `src/lib/agent/redactor.ts:20`:
  The unit subpattern `(?:\s+(?:Apt|Suite|Ste|Unit|Room|Rm|#)\s*[A-Za-z0-9-]+)?` requires whitespace `\s+` immediately preceding the unit designator.
- When addresses contain commas or periods (standard address formatting):
  - `sanitizeText('Sent to 123 Main St, Apt 4B for review')`
    => `"Sent to [STREET_ADDRESS_REDACTED], Apt 4B for review"` (`Apt 4B` leaked!)
  - `sanitizeText('Office at 123 Main St., Suite 200 today')`
    => `"Office at [STREET_ADDRESS_REDACTED]., Suite 200 today"` (`Suite 200` leaked!)
  - `sanitizeText('100 Ocean Parkway, Apt 4B')`
    => `"[STREET_ADDRESS_REDACTED], Apt 4B"` (`Apt 4B` leaked!)

### Observation 1.5: International Phone Formats Unredacted
- In `src/lib/agent/redactor.ts:14`:
  `\(?\d{3}\)?` strictly enforces a 3-digit area code.
- International formats such as UK `+44 20 7946 0958` (2-digit area code) are unredacted:
  - `sanitizeText('UK number is +44 20 7946 0958 call now')`
    => `"UK number is +44 20 7946 0958 call now"` (leaked unredacted!)

---

## 2. Logic Chain

1. **Requirement Violation (R2 & Acceptance Criteria):**
   - Requirement R2 mandates: *"redact all buyer personal identifiable information (emails, phone numbers, street addresses, buyer names, IP addresses) while strictly preserving tracking numbers, carrier names, delivery statuses, amounts, and dispute timelines."*
   - Acceptance Criteria state: *"Unit tests for the Zero-Trust Redactor pass with 100% masking of sample emails, phones, addresses, and names, while tracking numbers and order amounts remain untouched."*
2. **Impact of Observation 1.1 (Tracking Corruption):**
   - In real dispute workflows, tracking numbers often appear in buyer messages ("I tracked 9400111899562534567890 and it was empty") and rebuttal notes.
   - When `PHONE_REGEX` mutilates tracking numbers into `940011189[PHONE_REDACTED]`, downstream triage agents cannot correlate buyer statements with carrier records, violating R3 ("never hallucinate tracking numbers or facts not in the evidence bundle").
3. **Impact of Observations 1.2 & 1.3 (Catastrophic Overmatching):**
   - Because `ADDRESS_REGEX` spans sentences and lacks a `\b` before suffix types, any sentence mentioning a quantity, cost, or item count (e.g. `50 dollars`, `2 items damaged`, `1 credit card`) is destroyed. The LLM triage model receives sanitized messages with critical facts wiped out.
4. **Impact of Observation 1.4 (PII Leakage):**
   - Apartment and suite numbers (`Apt 4B`, `Suite 200`) are buyer location PII. Failing to redact them when preceded by a comma leaks buyer PII to third-party LLMs, violating zero-trust guarantees.
5. **Conclusion from Observations 1.1–1.5:**
   - The current redactor implementation fails 16 of 40 adversarial test cases. Therefore, the implementation cannot be approved in its current state.

---

## 3. Caveats

- Carrier tracking data present in the structured `shipmentTracking` array of `DisputeContextBundle` is correctly preserved in `sanitizedShipmentInfo` because `sanitizeDisputeContext` does not pass `track.tracking_number` through `sanitizeText`. The corruption occurs whenever tracking numbers appear in buyer messages, dispute descriptions, or seller notes.
- Email masking, standard IPv4 masking, and buyer name masking passed 100% of tested cases.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

`worker_m1_1` must remediate `src/lib/agent/redactor.ts` with the following targeted adjustments:

1. **Fix `PHONE_REGEX` to prevent tracking number mutilation:**
   Add a leading word boundary / non-digit check and bound total digit count:
   ```typescript
   const PHONE_REGEX = /(?:^|(?<!\d))(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}(?!\d)/g;
   ```
   Or explicitly guard against long digit strings (>11 digits).
2. **Fix `ADDRESS_REGEX` to prevent catastrophic overmatching:**
   - Restrict the street name tokens to 1–4 words without sentence punctuation: `(?:\b[A-Za-z0-9#.-]+\s+){1,4}`.
   - Enforce a word boundary `\b` immediately before the street suffix group:
     `\b(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Crt|Way|Square|Sq|Trail|Trl|Parkway|Pkwy|Terrace|Ter|Circle|Cir|Place|Pl|Highway|Hwy|Loop|Crescent|Cres|Alley|Aly|Row|Run|Path|Walk|Plaza|Plz|Crossing|Xing|Close|Heights|Hts)\b`
   - Allow optional period, comma, and whitespace before unit specifiers:
     `(?:\.?,?\s*(?:Apt|Suite|Ste|Unit|Room|Rm|#)\s*[A-Za-z0-9-]+)?`
3. **Ensure full pass of `src/test/redactor-adversarial.test.ts` (40/40 passing).**

---

## 5. Verification Method

To independently reproduce the failures and verify remediation:

1. **Run the Empirical Adversarial Test Suite:**
   ```powershell
   npx tsx src/test/redactor-adversarial.test.ts
   ```
   - Current result: Exits with code 1, reporting 16 failures.
   - Acceptance criteria: Must exit with code 0, reporting `Total Tests Run: 40, Passed: 40, Failed: 0`.

2. **Verify Tracking Number Preservation in Message Context:**
   ```powershell
   npx tsx -e "import { sanitizeText } from './src/lib/agent/redactor'; console.log(sanitizeText('Tracking 9400111899562534567890 delivered'));"
   ```
   - Must output: `Tracking 9400111899562534567890 delivered` without `[PHONE_REDACTED]`.

3. **Verify Financial Amount & Sentence Narrative Preservation:**
   ```powershell
   npx tsx -e "import { sanitizeText } from './src/lib/agent/redactor'; console.log(sanitizeText('Payment of 50 dollars for delivery to 100 Main Street'));"
   ```
   - Must output: `Payment of 50 dollars for delivery to [STREET_ADDRESS_REDACTED]`.

4. **Verify Apartment/Suite Masking With Punctuation:**
   ```powershell
   npx tsx -e "import { sanitizeText } from './src/lib/agent/redactor'; console.log(sanitizeText('123 Main St, Apt 4B'));"
   ```
   - Must output: `[STREET_ADDRESS_REDACTED]` (no trailing `Apt 4B`).
