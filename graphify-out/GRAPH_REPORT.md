# Graph Report - .  (2026-10-31)

## Corpus Check
- 146 files · ~220,205 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 324 nodes · 506 edges · 20 communities (13 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 1,250 input · 850 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Zero-Trust PII Redaction Engine|Zero-Trust PII Redaction Engine]]
- [[_COMMUNITY_E2E Dispute Lifecycle Testing|E2E Dispute Lifecycle Testing]]
- [[_COMMUNITY_API Routes & Audit Logging|API Routes & Audit Logging]]
- [[_COMMUNITY_Project Configuration & Dev Dependencies|Project Configuration & Dev Dependencies]]
- [[_COMMUNITY_Database Seeding & Test Utilities|Database Seeding & Test Utilities]]
- [[_COMMUNITY_PayPal Client & Server SDK Integrations|PayPal Client & Server SDK Integrations]]
- [[_COMMUNITY_Regex Validation & Unit Test Fixtures|Regex Validation & Unit Test Fixtures]]
- [[_COMMUNITY_TypeScript Compiler Options|TypeScript Compiler Options]]
- [[_COMMUNITY_Core NPM Production Dependencies|Core NPM Production Dependencies]]
- [[_COMMUNITY_Fintech Agent Architecture & Sponsors|Fintech Agent Architecture & Sponsors]]
- [[_COMMUNITY_AI Triage Engine & Output Schemas|AI Triage Engine & Output Schemas]]
- [[_COMMUNITY_AG Grid Dispute Queue UI|AG Grid Dispute Queue UI]]
- [[_COMMUNITY_Risk Analytics Dashboard UI|Risk Analytics Dashboard UI]]
- [[_COMMUNITY_Audit Trail Compliance UI|Audit Trail Compliance UI]]
- [[_COMMUNITY_Root Application Layout & Navigation|Root Application Layout & Navigation]]
- [[_COMMUNITY_Next.js Build Configuration|Next.js Build Configuration]]
- [[_COMMUNITY_PostCSS Styling Configuration|PostCSS Styling Configuration]]
- [[_COMMUNITY_Tailwind CSS Styling Configuration|Tailwind CSS Styling Configuration]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `scripts` - 14 edges
3. `dependencies` - 14 edges
4. `db` - 12 edges
5. `Dispute Defender System Architecture` - 11 edges
6. `devDependencies` - 10 edges
7. `PayPalDispute` - 9 edges
8. `disputes` - 8 edges
9. `processDisputePipeline()` - 8 edges
10. `triageDecisions` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Dispute Defender System Architecture` --CONTAINS--> `Zero-Trust PII Redactor`  [EXTRACTED]
  dispute-defender/README.md → dispute-defender/src/lib/redactor/index.ts
- `Dispute Defender System Architecture` --USES--> `PayPal Agent Toolkit`  [EXTRACTED]
  dispute-defender/README.md → dispute-defender/package.json
- `Dispute Defender System Architecture` --ENFORCES--> `Human-in-the-Loop Approval Gate`  [EXTRACTED]
  dispute-defender/README.md → dispute-defender/src/app/disputes/[id]/page.tsx
- `AG Grid Dispute Command Center` --RENDERS--> `Dispute Defender System Architecture`  [EXTRACTED]
  dispute-defender/src/components/queue/DisputeGrid.tsx → dispute-defender/README.md
- `Dispute Defender System Architecture` --ENHANCED_BY--> `APIMatic Context Plugin`  [EXTRACTED]
  dispute-defender/README.md → dispute-defender/src/lib/paypal/server-sdk.ts

## Communities (20 total, 7 thin omitted)

### Community 0 - "Zero-Trust PII Redaction Engine"
Cohesion: 0.05
Nodes (45): ADDRESS_REGEX, RedactionResult, sanitizeDisputeContext(), sanitizeText(), addressStressCases, clean, exc, excluded (+37 more)

### Community 1 - "E2E Dispute Lifecycle Testing"
Cohesion: 0.07
Nodes (18): acceptPayPalDisputeClaim(), buildTriageUserPrompt(), generateDeterministicTriageVerdict(), GET(), GET2(), getDisputeActionLinks(), getPayPalAccessToken(), getPayPalBaseUrl() (+10 more)

### Community 2 - "API Routes & Audit Logging"
Cohesion: 0.15
Nodes (23): POST(), GET(), AuditActor, AuditEventType, logAuditEvent(), db, auditLogs, disputeContexts (+15 more)

### Community 3 - "Project Configuration & Dev Dependencies"
Cohesion: 0.06
Nodes (34): allowScripts, author, description, devDependencies, autoprefixer, drizzle-kit, postcss, tailwindcss (+26 more)

### Community 4 - "Database Seeding & Test Utilities"
Cohesion: 0.09
Nodes (17): closeDatabase(), columnForTable(), columnSql(), { DatabaseSync }, mapRow(), physicalColumn(), quote(), sqlite (+9 more)

### Community 5 - "PayPal Client & Server SDK Integrations"
Cohesion: 0.11
Nodes (14): CachedToken, getPayPalAccessToken(), getPayPalBaseUrl(), AcceptClaimParams, acceptPayPalDisputeClaim(), isActionAllowed(), listPayPalDisputes(), submitDisputeEvidence() (+6 more)

### Community 6 - "Regex Validation & Unit Test Fixtures"
Cohesion: 0.1
Nodes (18): ADDRESS_REGEX, addressCases, b5, b6, bundleRes, exc, financialCases, inc (+10 more)

### Community 7 - "TypeScript Compiler Options"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 8 - "Core NPM Production Dependencies"
Cohesion: 0.14
Nodes (14): dependencies, ag-grid-community, ag-grid-react, ai, @ai-sdk/google, @ai-sdk/openai, clsx, drizzle-orm (+6 more)

### Community 9 - "Fintech Agent Architecture & Sponsors"
Cohesion: 0.2
Nodes (12): AG Grid Dispute Command Center, APIMatic Context Plugin, Carrier Detection Intelligence, Dispute Defender System Architecture, Human-in-the-Loop Approval Gate, PayPal Agent Toolkit, PayPal Disputes REST API (v1), Render Deployment & Workflows (+4 more)

### Community 10 - "AI Triage Engine & Output Schemas"
Cohesion: 0.25
Nodes (8): buildTriageUserPrompt(), EvidenceChecklistItemSchema, TriageVerdict, TriageVerdictSchema, generateDeterministicTriageVerdict(), isVerdictGrounded(), runTriageAgent(), TriageVerdict

## Knowledge Gaps
- **147 isolated node(s):** `ADDRESS_REGEX`, `trackingCases`, `res`, `financialCases`, `inc` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sanitizeDisputeContext()` connect `Zero-Trust PII Redaction Engine` to `API Routes & Audit Logging`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `sanitizeText()` connect `Zero-Trust PII Redaction Engine` to `API Routes & Audit Logging`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `ADDRESS_REGEX`, `trackingCases`, `res` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Zero-Trust PII Redaction Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `E2E Dispute Lifecycle Testing` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Project Configuration & Dev Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Database Seeding & Test Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._