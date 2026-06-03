# New Proposal AI Assistant Integration Plan

## 1. Objective

Refactor the New Proposal workflow so each step has a dedicated AI Assistant that validates whether the step goal is complete and trustworthy.

Target workflow steps:

1. Opportunity Source
2. Document Intake
3. Scope Detection
4. Manufacturer Eligibility

This plan aligns with the existing Angular wizard route at /app/proposals/new and the current AWS serverless backend pattern.

## 2. Implementation Principles

1. Deterministic before generative: use rules first, LLM only where extraction/reasoning is needed.
2. Human-in-the-loop at each step: users approve or override assistant conclusions.
3. Evidence-first outputs: every assistant result includes source citations and confidence.
4. Multi-tenant isolation: tenant-scoped document storage, retrieval, and decisions.
5. Workflow state machine: no step can be marked complete without passing validation checks.

## 3. Target Architecture (Angular + AWS)

## 3.1 Frontend

1. Keep one New Proposal wizard shell page.
2. Split each step into its own feature component with a step-level assistant panel.
3. Add a shared "assistant decision card" component that displays:
- recommendation
- confidence
- validation status
- citations
- approve/override controls
4. Add a shared "evidence drawer" that shows source snippets and document references.

## 3.2 Backend

1. API Gateway HTTP API remains the single frontend entry point.
2. Add a workflow-orchestration Lambda for step runs and validation transitions.
3. Create one Lambda handler per assistant step (or one Lambda with step-specific modules).
4. Store raw documents in S3 with tenant/opportunity prefixes.
5. Store extracted entities, step outputs, and approvals in DynamoDB.
6. Add a vector retrieval layer for technical and glossary context.

## 3.3 Retrieval and Knowledge Layer

1. Knowledge base content:
- use-case artifacts under documentation/use-cases/houston-medical-center-expansion
- glossary and taxonomy terms from hvac-sales-key-definitions.md
- artifact catalog concepts from hvac-sales-cycle-mock-artifacts.md
2. Ingestion pipeline:
- parse PDF/XLSX/MD
- chunk by semantic section
- attach metadata: category, document type, page/sheet, version, tenant scope
- write vectors and metadata index
3. Runtime retrieval interface:
- query by step-specific intent and filters
- return top-k chunks with citations
- combine with deterministic structured fields before prompt construction

## 4. Assistant Design by Workflow Step

## 4.1 Step 1: Opportunity Source Assistant

Step goal:
Validate that the opportunity source is legitimate, sufficiently complete, and worth progressing.

Required data:
1. Bid invitation metadata
2. Bid board metadata
3. CRM customer profile
4. Relationship and historical win-rate facts

Knowledge presentation to assistant:
1. Structured API payload for source metadata and CRM fields.
2. Lightweight retrieval over intake artifacts for ambiguous fields.
3. Glossary grounding terms: bid, open bid, closed bid, qualification, win rate.

Assistant responsibilities:
1. Classify source type and trust level.
2. Detect required missing fields.
3. Estimate pursue/no-pursue readiness score.
4. Return recommendation with rationale and confidence.

Validation rules:
1. Required fields present: project name, due date, contractor, scope hint.
2. No stale date issues.
3. Source trace available.

Suggested APIs:
1. POST /api/proposals/workflow/opportunities/{id}/source/run
2. POST /api/proposals/workflow/opportunities/{id}/source/decision

Expected output contract:
1. sourceClassification
2. completenessScore
3. pursueRecommendation
4. confidence
5. missingFields
6. citations[]
7. validationStatus

## 4.2 Step 2: Document Intake Assistant

Step goal:
Validate that uploaded documents are complete, parseable, correctly categorized, and version-consistent.

Required data:
1. Uploaded document manifests
2. OCR/parse diagnostics
3. Category labels from artifact taxonomy
4. Addendum version history

Knowledge presentation to assistant:
1. Structured manifest payload from upload service.
2. Retrieval over parsed text chunks for category verification.
3. Taxonomy mapping from hvac-sales-cycle-mock-artifacts categories.

Assistant responsibilities:
1. Classify each document into artifact category.
2. Detect missing critical artifacts.
3. Detect duplicate or superseded versions.
4. Flag parse quality issues and reprocess needs.

Validation rules:
1. Mandatory set present for MVP:
- schedule
- spec
- addendum (if issued)
- manufacturer knowledge input
2. Parse confidence above threshold.
3. Addendum linkage to base docs is valid.

Suggested APIs:
1. POST /api/proposals/workflow/opportunities/{id}/intake/run
2. POST /api/proposals/workflow/opportunities/{id}/intake/decision

Expected output contract:
1. documentInventory[]
2. categoryCoverage
3. missingRequiredArtifacts[]
4. parseQualitySummary
5. versionConflicts[]
6. citations[]
7. validationStatus

## 4.3 Step 3: Scope Detection Assistant

Step goal:
Extract and validate cooling-tower scope requirements from schedule/spec/addenda into canonical fields.

Required data:
1. Mechanical schedule values
2. Division 23 cooling tower spec requirements
3. Addendum deltas
4. Unit normalization rules

Knowledge presentation to assistant:
1. Retrieval-Augmented Generation against technical documents with page citations.
2. Deterministic parser outputs for candidate structured values.
3. Glossary grounding for duty, equipment schedule, addenda, specification.

Assistant responsibilities:
1. Extract canonical scope fields.
2. Reconcile conflicts across schedule/spec/addenda.
3. Normalize units and detect outliers.
4. Produce a scope completeness and consistency verdict.

Validation rules:
1. Required canonical fields captured:
- quantity
- cooling capacity
- flow
- EWT
- LWT
- design wet bulb
- sound constraints
- required accessories
2. Conflicts are resolved or explicitly flagged.
3. Addendum modifications are applied.

Suggested APIs:
1. POST /api/proposals/workflow/opportunities/{id}/scope/run
2. POST /api/proposals/workflow/opportunities/{id}/scope/decision

Expected output contract:
1. canonicalScope
2. conflicts[]
3. unresolvedFields[]
4. consistencyScore
5. confidence
6. citations[]
7. validationStatus

## 4.4 Step 4: Manufacturer Eligibility Assistant

Step goal:
Validate whether represented manufacturers are eligible and whether selected model path is compliant.

Required data:
1. Approved manufacturer list from specs/addenda
2. Tenant line card
3. Basis-of-design signal
4. Manufacturer model matrix and selection outputs

Knowledge presentation to assistant:
1. Structured inputs for line card and represented brands.
2. Retrieval over spec/addendum text for approved list and basis-of-design language.
3. Optional retrieval over strategic knowledge for competitor context.

Assistant responsibilities:
1. Determine eligible manufacturer match.
2. Score opportunity qualification risk.
3. Explain basis-of-design advantage/disadvantage.
4. Validate selected model family eligibility.

Validation rules:
1. At least one represented manufacturer is approved.
2. Model family is within approved manufacturer set.
3. Any exception path requires explicit human override reason.

Suggested APIs:
1. POST /api/proposals/workflow/opportunities/{id}/eligibility/run
2. POST /api/proposals/workflow/opportunities/{id}/eligibility/decision

Expected output contract:
1. approvedManufacturers[]
2. representedManufacturers[]
3. eligibilityResult
4. riskFlags[]
5. confidence
6. citations[]
7. validationStatus

## 5. Angular Refactor Plan (Step-by-Step)

## Phase 1: Workflow Contract and State

1. Create a typed workflow-step contract shared across all four steps.
2. Add status model: not_started, in_progress, needs_review, validated, overridden.
3. Add per-step assistant result model with citations and confidence.

## Phase 2: Wizard UI Decomposition

1. Refactor New Proposal wizard into four standalone step components.
2. Add a shared assistant panel component.
3. Add per-step validation banners and override dialogs.

## Phase 3: Data Access Layer

1. Add HTTP services for each new step run/decision endpoint.
2. Centralize polling and error handling for assistant runs.
3. Add optimistic UI updates plus final server reconciliation.

## Phase 4: Explainability UX

1. Add citations table linked to source documents/pages.
2. Add conflict badges and unresolved-field chips.
3. Add decision history pane for approvals and overrides.

## Phase 5: Hardening

1. Add route guards based on workflow readiness.
2. Add unit tests for each step state transition.
3. Add end-to-end test for full wizard progression through validated states.

## 6. AWS Backend Refactor Plan (Step-by-Step)

## Phase 1: API and Schema

1. Extend OpenAPI with source/intake/scope/eligibility run and decision endpoints.
2. Define canonical response schemas for all assistant outputs.
3. Add request id and opportunity id correlation in every response.

## Phase 2: Workflow Orchestrator

1. Implement a workflow Lambda to enforce step transition rules.
2. Persist step outputs and decisions in DynamoDB with versioning.
3. Block forward transitions until validation status is validated or overridden.

## Phase 3: Assistant Execution Services

1. Implement step-specific Lambda handlers.
2. Integrate retrieval service for step-scoped RAG queries.
3. Add deterministic validators to post-process LLM output.

## Phase 4: Knowledge Ingestion

1. Build ingestion Lambda jobs for PDF/XLSX/MD processing.
2. Generate chunks and embeddings with metadata.
3. Store retrieval index and citation pointers.

## Phase 5: Observability and Audit

1. Add structured logging with opportunityId, stepKey, tenantId, requestId.
2. Emit audit events for run, decision, override, and transition.
3. Add operational metrics for confidence drift, override rate, and parse failures.

## 7. Validation and Acceptance Criteria

1. Each step must end in validated or overridden before the next step unlocks.
2. Every assistant recommendation must include at least one citation.
3. Scope Detection must capture all required canonical fields or explicitly flag missing values.
4. Manufacturer Eligibility must fail closed when no represented approved manufacturer exists.
5. UI must display rationale, confidence, and traceability for every step result.

## 8. Suggested Delivery Timeline

1. Sprint 1: Contracts, API stubs, Angular step decomposition.
2. Sprint 2: Source and Intake assistants with validation and citations.
3. Sprint 3: Scope Detection assistant with conflict reconciliation.
4. Sprint 4: Manufacturer Eligibility assistant and full end-to-end gating.
5. Sprint 5: Observability, audit exports, performance and UX hardening.

## 9. Immediate Next Actions

1. Freeze canonical JSON contracts for four assistant outputs.
2. Add endpoint stubs in backend with mocked assistant responses.
3. Refactor the Angular wizard to consume the new contracts.
4. Enable retrieval ingestion for Houston Medical Center Expansion artifacts.
5. Run a full dry-run of one opportunity from source to eligibility with HITL approvals.
