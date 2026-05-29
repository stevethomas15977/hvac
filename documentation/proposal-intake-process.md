# Proposal Intake Process: MVP Requirements and UX Design

## 1) Purpose
Build a New Proposal intake experience in Angular that helps HVAC sales reps make a high-confidence Go / No Go decision before investing unpaid engineering labor.

Core economic question:
"Should I spend 4-8 hours of engineering time pursuing this opportunity at all?"

## 2) Scope and Product Focus
### In scope for MVP
- Bid Qualification Assistant (front-of-funnel)
- Proposal creation wizard with optional AI assistance
- Human decision gate with auditability and explainability artifacts

### Out of scope for MVP
- Full proposal generation automation
- Full model selection automation
- Submittal package automation

### Product categories
- Primary MVP: Cooling Towers
- Phase 2: Boilers and Pumps
- Chillers: context-only for now (not core MVP flow)
- Heat Exchangers: detect as out-of-scope unless manually overridden

## 3) Decision Framework
The qualification assistant must output one of:
- Go
- No Go
- Needs Review

Rule:
- If critical evidence is missing or conflicting, the assistant must return `Needs Review`.
- AI recommendation is advisory. Human approval is required for final decision.

## 4) Human Workflow Assumptions (Current State)
When a bid invitation arrives (email, Procore, ConstructConnect, shared link, etc.), reps evaluate:
1. Do I have applicable scope?
2. Am I approved by spec manufacturer list?
3. What is probability of winning?
4. How much effort is required?
5. What is estimated opportunity value?

These assumptions are valid and should drive the MVP UI and scoring model.

## 5) Required Intake Artifacts
### Artifact 1: Bid Invitation
- Project name, project number, bid due date, contacts

### Artifact 2: Mechanical Schedules (M-sheets)
- Equipment schedule references and core duty requirements

### Artifact 3: Project Specifications (Division 23)
- Approved manufacturers, performance requirements, codes, warranty

### Artifact 4: General Notes
- Noise, corrosion, wind, seismic, and special constraints

### Artifact 5: Addenda
- Must be versioned and applied with highest precedence

### Artifact 6: Historical Customer/Relationship Data
- Prior wins/losses, relationship context, historical margin bands

### Artifact 7: Manufacturer Catalog Data
- Cooling tower catalogs/cut sheets and technical bulletins

### Artifact 8: Internal Pricing Data (Sensitive)
- Cost and pricing rules (phase-gated; avoid raw cost in early qualification if possible)

## 6) Evidence and Explainability Requirements
Each final decision must persist a "Decision Packet" with:
- Decision result: Go / No Go / Needs Review
- AI recommendation + human final decision
- Confidence score
- Top reasons (ranked)
- Evidence snippets with source references
- Missing/conflicting evidence flags
- Timestamp, actor, and override rationale if human disagrees with AI

### Critical guardrails
- No hard Go / No Go recommendation when required artifacts are missing
- Addenda precedence enforced: latest addendum overrides earlier docs
- All recommendation claims must cite evidence source

## 7) Angular UX Design: Wizard Pattern
Use a wizard-style New Proposal page with optional AI copilot panel.

### Step flow
1. Opportunity Source
2. Document Intake
3. Scope Detection
4. Manufacturer Eligibility
5. Complexity and Effort
6. Revenue Snapshot
7. AI Recommendation Review
8. Human Decision and Justification

### UX principles
- Progressive disclosure to reduce cognitive load
- Optional "Quick Intake" for experienced reps
- AI assist is optional, not mandatory
- Human confirmation at decision gate is mandatory

## 8) AI Architecture and Data Placement
### Prompt Context (small, transient)
- Workflow state, current objective, user instructions

### Vector Store / RAG (large unstructured docs)
- Specs, schedules, general notes, addenda, historical proposal docs, catalogs

### Structured Database
- Projects, customers, relationships, scoring factors, decision packets, pricing bands

### Knowledge segmentation for MVP
1. Project Documents KB
2. Manufacturer Data KB
3. Internal Company Knowledge KB

## 9) Output Contract for Qualification Assistant
Minimum output fields:
- Project name
- Bid due date
- Scope detected (for MVP: cooling towers)
- Approved manufacturer list
- Estimated opportunity band
- Complexity score
- Win probability + confidence
- Recommended action (Go / No Go / Needs Review)
- Evidence list (source + snippet)
- Missing/conflict flags

## 10) MVP Acceptance Criteria
MVP is successful when:
1. Reps can complete intake through the wizard and record a decision packet
2. Assistant recommendations include explainable evidence citations
3. Missing/conflicting evidence correctly routes to `Needs Review`
4. Human override is captured with rationale
5. Pilot users report measurable time savings in qualification stage

## 11) Delivery Priority
Build first:
- Qualification Assistant + Wizard + Decision Packet audit trail

Build later:
- Automated model selection
- Full proposal generation
- Submittal automation

## 12) Post-MVP Backend Integration (Pinned)
The following work is intentionally deferred until after MVP acceptance criteria are met.

### Deferred architecture work
- API Gateway endpoint implementation for decision packet submissions
- Lambda validation and policy recomputation (server-side enforcement)
- Cognito/JWT authorizer integration for tenant-scoped access control
- DynamoDB persistence model for immutable decision packet audit records
- Event fan-out (optional) for review queues and downstream automation

### Deferred API contract hardening
- Request schema validation and versioning strategy
- Idempotency keys for safe retries
- Error contract standardization
- Structured observability: correlation IDs, metrics, alerting

### MVP boundary rule
- During MVP, submission flow uses mock-mode contract in Angular and local/development validation.
- Production-grade API infrastructure will start only after pilot validation confirms workflow, policy, and UX are stable.