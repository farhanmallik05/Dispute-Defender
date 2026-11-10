# Dispute Defender — PayPal-Inspired Product Design

This document defines the visual system for the hackathon prototype. It uses a restrained PayPal-inspired palette and information hierarchy without presenting the application as an official PayPal product.

## Design direction

- **Tone:** trusted, calm, operational, and reviewable.
- **Primary task:** help a merchant understand a dispute and make one explicit decision.
- **Density:** compact tables and short labels; avoid decorative dashboard widgets.
- **Hierarchy:** deadline and amount first, evidence second, action last.
- **Trust language:** distinguish local demo data, stored evidence, submitted requests, and confirmed outcomes.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| PayPal navy | `#003087` | Product title, selected navigation, primary emphasis |
| PayPal blue | `#0070BA` | Primary action, links, active indicators |
| PayPal yellow | `#FFC439` | Review-needed accent and attention marker |
| Page gray | `#F5F7FA` | Application background |
| Border gray | `#D9E0E7` | Card, table, and input borders |
| Text gray | `#52606D` | Supporting text and labels |
| Success | Emerald 600 | Confirmed local processing or submitted state |
| Warning | Amber 600 | Missing evidence, review-needed state |
| Error | Red 600 | Failed request or blocked action |

Use navy or blue for product actions. Use yellow and amber for attention, never as a success color. Keep status colors paired with text so color is not the only signal.

## Layout

- Page background is `#F5F7FA`.
- Header is white, 68px high, sticky, and separated by a single muted border.
- Content uses a centered `max-w-7xl` container with responsive horizontal padding.
- Cards use a 1px border, `rounded-lg`, white background, and a small shadow.
- Avoid stacked rounded containers where a border or divider is enough.
- The queue is the default landing page; review pages use a two-column layout on large screens and one column on small screens.

## Components

### Header

- Circular navy `DD` mark rather than an unofficial PayPal logo.
- Product name in navy.
- Environment badge must say `Demo mode` or `PayPal Sandbox`; do not imply live production status.
- Navigation labels: `Dispute Queue`, `Overview`, `Activity`, `Health`.

### Queue

- Heading: `Dispute queue`.
- Supporting copy explains the user action: review, verify, decide.
- Three summary cards: open amount at risk, awaiting review, evidence submitted.
- Use tabs for `All Disputes`, `Awaiting Review`, `Critical`, `Evidence Filed`, and `Settled`.
- Search copy is short: `Search dispute ID or reason`.
- The table keeps the decision columns visible: urgency, claim reason, amount, recommendation, status, action.

### Review page

- Top row contains back navigation, case stage, and redaction inspection.
- Recommendation is a compact left-accented banner, not a large hero block.
- Evidence rows show the claim, source field, and verified/missing icon.
- Approval panel has a navy top border and one primary blue action.
- The ACCEPT action remains secondary and outlined because it is still a financial decision.
- Redaction inspection uses a dark comparison panel with neutral labels: `Stored source fields` and `Sanitized triage context`.

### Overview and activity

- Overview reports stored facts only: open amount, evidence submitted, seller-favour outcomes, accepted claims, and cases with due dates.
- Activity is a chronological log. Do not label it cryptographically immutable unless the implementation provides cryptographic chaining.
- Sponsor names, prize amounts, and implementation claims belong in submission material, not the merchant workflow.

## Content rules

- Say `recorded`, `stored`, or `submitted` only when the corresponding local state exists.
- Say `confirmed outcome` only when a PayPal resolution event supplies an outcome.
- Say `demo data` when the app is using deterministic fixtures or simulated responses.
- Do not claim a dispute win from a FIGHT recommendation, a confidence score, or an evidence submission.
- Do not describe regex redaction as universal, cryptographic, or certified privacy protection.
- Use sentence case for headings and buttons; reserve uppercase for small eyebrows and status labels.

## Interaction and accessibility

- Every action button has a clear disabled state while a request is in flight.
- Keep the human approval gate explicit; no background action may submit a PayPal response.
- Preserve keyboard access to table rows, search, tabs, and approval buttons.
- Use `:focus-visible` outlines with a blue contrast ring.
- Respect `prefers-reduced-motion`; urgency animation is optional and must not be the only indication of a deadline.
- Keep error and warning messages adjacent to the affected action, with a retry path where possible.

## Implementation map

- Global tokens and focus behavior: `dispute-defender/src/app/globals.css`
- Shell and navigation: `dispute-defender/src/app/layout.tsx`
- Queue: `dispute-defender/src/app/page.tsx` and `src/components/queue/DisputeGrid.tsx`
- Case review: `dispute-defender/src/app/disputes/[id]/page.tsx`
- Overview: `dispute-defender/src/app/analytics/page.tsx`
- Activity: `dispute-defender/src/app/audit/page.tsx`
- Loading, empty, and error states: `src/components/common/StateViews.tsx`

## Visual verification

1. Run the app with seeded demo data.
2. Check `/`, `/disputes/PP-D-27801`, `/analytics`, and `/audit` at desktop and narrow viewport widths.
3. Confirm the demo badge is visible and no page claims a confirmed PayPal result.
4. Test keyboard focus and the approval disabled state.
5. Run `npm run build` after visual changes.
