# BuildVision-Aligned Backend MVP Implementation Plan

## Purpose

Define a backend-first implementation plan that supports the MVP-scoped UI strategy in:

- documentation/buildvision-competitiveness-ui-plan.md

This plan is intentionally proposal-phase first and focused on highest value impact.

## Scope Alignment (MVP)

Implement now (backend support required):

1. Bid Triage Scorecard
2. BOD Qualification Panel
3. Selection Workbench Delta View

Defer post-MVP:

1. Engineer Memory Sidebar
2. Proposal Readiness Meter
3. Advanced KPI dashboarding

## Environment Safety Policy (Current Phase)

Until explicit approval is given to promote, all implementation work in this plan is restricted to development only.

1. Allowed AWS profile: development
2. Allowed Terraform backend config: terraform/environments/development/backend.hcl
3. Prohibited during this phase:
- terraform apply against production backend
- GitHub Actions terraform workflow with environment=production
- Manual CLI writes in production account

## Current Backend Baseline

Current deployed backend includes:

- API Gateway HTTP API for proposal wizard submission endpoints
  - POST /api/proposals/wizard/submissions
  - GET /api/proposals/wizard/submissions/recent
- Single Lambda handler in terraform/lambda/proposal_submission/index.mjs
- DynamoDB table hvac-proposal-submissions with:
  - PK: tenant_key
  - SK: submission_key
  - GSIs: review_queue, submitted_by

Gap vs needed capabilities:

- No first-class triage endpoint/model
- No first-class qualification/BOD endpoint/model
- No first-class selection comparison endpoint/model
- No unified evidence/citation schema shared across stages
- No workflow state entity for opportunity-level progression

## Target Backend Architecture (MVP)

Use one bounded context for proposal workflow with stage-oriented APIs:

- Triage service behavior
- Qualification/BOD behavior
- Selection comparison behavior
- Audit and decision logging behavior

MVP deployment model:

- Keep single API Gateway
- Keep Lambda-first architecture (can stay single function initially)
- Extend DynamoDB table with new entity patterns and GSIs
- Keep tenant isolation from JWT claims

## Canonical Data Contracts (MVP)

### 1) Triage API

Endpoint:

- POST /api/proposals/workflow/opportunities/{opportunityId}/triage/run

Response shape:

- opportunityId: string
- triage:
  - recommendation: pursue | pass | needs_review
  - winProbability: number (0-1)
  - bodFitScore: number (0-1)
  - dueDateRisk: low | medium | high
  - manufacturerFit: fit | partial | conflict | unknown
  - confidence: number (0-1)
  - reasonCodes: string[]
  - blockers: string[]
  - generatedAtIso: string
  - generatedBy: system

Decision endpoint:

- POST /api/proposals/workflow/opportunities/{opportunityId}/triage/decision

Decision payload:

- decision: pursue | pass | needs_review
- rationale: string (required)

### 2) Qualification/BOD API

Endpoint:

- POST /api/proposals/workflow/opportunities/{opportunityId}/qualification/run

Response shape:

- opportunityId: string
- qualification:
  - recommendation: go | no_go | needs_review
  - confidence: number (0-1)
  - representedManufacturer: string
  - detectedManufacturers: string[]
  - overlapStatus: eligible | conflict | unknown
  - policyChecks:
    - code: string
    - status: pass | fail | warning
    - message: string
  - citations:
    - claimId: string
    - sourceDocumentId: string
    - pageNumber: number
    - snippet: string
    - confidence: number
  - reasonCodes: string[]
  - blockers: string[]
  - generatedAtIso: string

Decision endpoint:

- POST /api/proposals/workflow/opportunities/{opportunityId}/qualification/decision

Decision payload:

- decision: go | no_go | needs_review
- rationale: string (required)

### 3) Selection Comparison API

Endpoint:

- POST /api/proposals/workflow/opportunities/{opportunityId}/selection/compare

Request payload:

- manufacturerPathModel: string
- notes: string (optional)

Response shape:

- opportunityId: string
- selection:
  - toolPathModel: string
  - manufacturerPathModel: string
  - overallStatus: aligned | mismatch | needs_review
  - confidence: number (0-1)
  - deltas:
    - field: string
    - toolPathValue: string
    - manufacturerValue: string
    - severity: info | warning | critical
    - rationale: string
    - citations: citation[]
  - reasonCodes: string[]
  - blockers: string[]
  - generatedAtIso: string

Decision endpoint:

- POST /api/proposals/workflow/opportunities/{opportunityId}/selection/decision

Decision payload:

- decision: approve | reject | needs_review
- rationale: string (required)

## DynamoDB Data Model Changes (MVP)

Continue table-per-service for MVP (reuse hvac-proposal-submissions table) with single-table entity patterns.

### New entity keys

1. Opportunity workflow summary
- PK: TENANT#{tenantId}
- SK: OPPORTUNITY#{opportunityId}

2. Stage outputs
- PK: TENANT#{tenantId}
- SK: OPPORTUNITY#{opportunityId}#STAGE#{triage|qualification|selection}#TS#{iso}

3. Stage decisions (human gate)
- PK: TENANT#{tenantId}
- SK: OPPORTUNITY#{opportunityId}#DECISION#{triage|qualification|selection}#TS#{iso}

4. Citation records (optional denormalized)
- PK: TENANT#{tenantId}
- SK: OPPORTUNITY#{opportunityId}#CITATION#{claimId}#TS#{iso}

### New indexes

1. GSI: opportunity_stage_latest
- Partition: opportunity_key
- Sort: stage_updated_at
- Purpose: fast latest stage retrieval for UI cards

2. GSI: triage_priority_queue
- Partition: triage_queue_key
- Sort: triage_priority_sort
- Purpose: queue ordering for high-value opportunities

3. GSI: reviewer_work_queue (optional MVP+)
- Partition: review_queue_key
- Sort: review_due_sort

## API Gateway and Lambda Changes

Terraform touchpoints:

- terraform/apigateway.tf
  - Add routes for triage/qualification/selection run + decision endpoints
  - Reuse JWT authorizer and integration where possible

- terraform/lambda.tf
  - Keep one function initially OR split by bounded context
  - Add env vars for contract version and feature flags

- terraform/iam.tf
  - Ensure least-privilege DynamoDB actions for new query patterns

- terraform/dynamodb.tf
  - Add required attributes/indexes for new access patterns
  - Plan migration strategy for index creation and rollout

Lambda code touchpoint:

- terraform/lambda/proposal_submission/index.mjs
  - Refactor into route dispatch by path/method
  - Extract stage handlers into modules (recommended)

## Security and Tenant Isolation

Required checks for every endpoint:

1. Resolve tenantId from JWT claim only (do not trust request body tenantId).
2. Enforce tenant-key partitioning for all read/write operations.
3. Log principal username and tenantId for all decision writes.
4. Reject unauthenticated access to all workflow endpoints.

## Observability and Audit Requirements

Structured log fields for every stage run/decision:

- event
- tenantId
- opportunityId
- stage
- recommendation or decision
- confidence
- blockerCount
- username
- requestId
- latencyMs

Metrics to emit (CloudWatch EMF or equivalent):

- triage_run_count
- triage_decision_count
- qualification_run_count
- qualification_decision_count
- selection_compare_count
- selection_decision_count
- stage_failure_count
- p95_stage_latency_ms

## Delivery Plan (Step-by-Step)

### Step 0: Contract Freeze (1-2 days)

Deliverables:

- Final request/response schemas for triage, qualification, selection
- Error model and validation rules
- Field-level ownership and confidence semantics

Exit criteria:

- Frontend and backend both approve schema document

### Step 1: Data Model and Terraform Foundations

Deliverables:

- DynamoDB index additions and key design updates
- API routes added in Terraform
- IAM permissions updated for new access patterns

Exit criteria:

- terraform validate and plan succeed for dev
- no destructive migration risk for existing submission data

### Step 2: Triage Backend

Deliverables:

- Triage run endpoint
- Triage decision endpoint with rationale
- Persistence of triage outputs and decisions

Exit criteria:

- API tests pass for success and validation failures
- queue retrieval supports scorecard display fields

### Step 3: Qualification/BOD Backend

Deliverables:

- Qualification run endpoint
- BOD overlap/conflict checks
- Citation payload support
- Qualification decision endpoint

Exit criteria:

- conflict and citation scenarios pass contract tests
- audit records contain decision rationale and actor

### Step 4: Selection Comparison Backend

Deliverables:

- Selection compare endpoint
- Delta severity computation
- Selection decision endpoint

Exit criteria:

- comparison payload renders all required UI fields
- override rationale required and persisted

### Step 5: Stabilization and Integration Hand-off

Deliverables:

- OpenAPI or JSON schema artifacts checked in
- Postman or contract tests for all endpoints
- Backend readiness checklist for frontend sprint

Exit criteria:

- frontend can integrate without mock-only blockers

## Frontend Start Gate (Do Not Skip)

Begin frontend implementation only when:

1. Step 0 contract freeze is approved.
2. At least Step 2 triage endpoints are live in development.
3. Error responses and validation behavior are stable.

## Risks and Mitigations

1. Risk: Scope creep into submittal-level depth
- Mitigation: Keep stage contracts proposal-phase only.

2. Risk: Single Lambda complexity grows quickly
- Mitigation: modularize route handlers early, then split functions if needed.

3. Risk: Index additions impact deploy timing
- Mitigation: deploy indexes first, then route traffic.

4. Risk: Frontend waits on backend
- Mitigation: contract-first freeze and staged endpoint readiness.

## Recommended Execution Cadence

1. Backend sprint starts now with Step 0 and Step 1.
2. Frontend begins parallel wireframes/mock adapters after contract freeze.
3. Integrate feature-by-feature in this order:
- Triage
- Qualification/BOD
- Selection comparison

This keeps delivery aligned to MVP value impact while preserving architectural discipline.
