# BuildVision Backend Contract Freeze v1 (Development Only)

## Status

- Version: v1
- Phase: Step 0 Contract Freeze
- Environment: Development only
- Promotion: Not authorized for production in this phase

## Environment Guardrails

1. Use only AWS profile development.
2. Use only Terraform backend at terraform/environments/development/backend.hcl.
3. Do not run production applies, workflow runs, or direct CLI writes.
4. Validate contracts and handlers in development before any promotion decision.

## Contract Objectives

1. Stabilize frontend/backend integration for MVP features.
2. Prevent rework by freezing payload shapes before implementation.
3. Preserve human approval gates and explainability requirements.

MVP feature coverage:

1. Bid Triage Scorecard
2. BOD Qualification Panel
3. Selection Workbench Delta View

## API Conventions

- Base path: /api/proposals/workflow
- Content type: application/json
- Auth: JWT required on all endpoints
- Tenant resolution: JWT claims only (custom:tenant_id or custom:tenant_code)
- Time format: ISO 8601 UTC strings
- Confidence: number in range [0, 1]

## Error Model (Shared)

Error response shape:

- error:
  - code: string
  - message: string
  - details: object (optional)
  - requestId: string (optional)

Standard codes:

- bad_request
- unauthorized
- forbidden
- not_found
- conflict
- validation_failed
- internal_error

## Shared Types

### Citation

- claimId: string
- sourceDocumentId: string
- pageNumber: number
- snippet: string
- confidence: number

### PolicyCheck

- code: string
- status: pass | fail | warning
- message: string

## Endpoint Contracts

### 1) Run Triage

POST /api/proposals/workflow/opportunities/{opportunityId}/triage/run

Request body:

- documentBundleId: string
- representedManufacturer: string
- bidDueDate: string (optional ISO)

Response body:

- opportunityId: string
- triage:
  - recommendation: pursue | pass | needs_review
  - winProbability: number
  - bodFitScore: number
  - dueDateRisk: low | medium | high
  - manufacturerFit: fit | partial | conflict | unknown
  - confidence: number
  - reasonCodes: string[]
  - blockers: string[]
  - generatedAtIso: string
  - generatedBy: system

### 2) Submit Triage Decision

POST /api/proposals/workflow/opportunities/{opportunityId}/triage/decision

Request body:

- decision: pursue | pass | needs_review
- rationale: string

Response body:

- opportunityId: string
- stage: triage
- decision: pursue | pass | needs_review
- rationale: string
- decidedBy: string
- decidedAtIso: string

### 3) Run Qualification/BOD

POST /api/proposals/workflow/opportunities/{opportunityId}/qualification/run

Request body:

- documentBundleId: string
- representedManufacturer: string
- approvedManufacturers: string[]

Response body:

- opportunityId: string
- qualification:
  - recommendation: go | no_go | needs_review
  - confidence: number
  - representedManufacturer: string
  - detectedManufacturers: string[]
  - overlapStatus: eligible | conflict | unknown
  - policyChecks: PolicyCheck[]
  - citations: Citation[]
  - reasonCodes: string[]
  - blockers: string[]
  - generatedAtIso: string

### 4) Submit Qualification Decision

POST /api/proposals/workflow/opportunities/{opportunityId}/qualification/decision

Request body:

- decision: go | no_go | needs_review
- rationale: string

Response body:

- opportunityId: string
- stage: qualification
- decision: go | no_go | needs_review
- rationale: string
- decidedBy: string
- decidedAtIso: string

### 5) Compare Selection

POST /api/proposals/workflow/opportunities/{opportunityId}/selection/compare

Request body:

- toolPathModel: string
- manufacturerPathModel: string
- notes: string (optional)

Response body:

- opportunityId: string
- selection:
  - toolPathModel: string
  - manufacturerPathModel: string
  - overallStatus: aligned | mismatch | needs_review
  - confidence: number
  - deltas:
    - field: string
    - toolPathValue: string
    - manufacturerValue: string
    - severity: info | warning | critical
    - rationale: string
    - citations: Citation[]
  - reasonCodes: string[]
  - blockers: string[]
  - generatedAtIso: string

### 6) Submit Selection Decision

POST /api/proposals/workflow/opportunities/{opportunityId}/selection/decision

Request body:

- decision: approve | reject | needs_review
- rationale: string

Response body:

- opportunityId: string
- stage: selection
- decision: approve | reject | needs_review
- rationale: string
- decidedBy: string
- decidedAtIso: string

## Validation Rules (MVP)

1. opportunityId is required in all endpoint paths.
2. rationale is required and non-empty for all decision endpoints.
3. confidence, winProbability, bodFitScore must be between 0 and 1.
4. severity must be one of info, warning, critical.
5. citations may be empty but must be an array when provided.

## Persistence Requirements (Contract-Level)

For each stage run:

- Persist recommendation payload
- Persist reasonCodes and blockers
- Persist confidence and generatedAtIso

For each stage decision:

- Persist decision, rationale, actor, timestamp
- Preserve immutable audit history (append-only records)

## Acceptance Criteria for Step 0 Completion

1. Frontend and backend both approve this contract file.
2. Contract fields are mapped to existing or planned UI components.
3. Error codes and validation rules are agreed.
4. Development-only environment policy is acknowledged.

## Step 1 Handoff Checklist

1. Add API Gateway routes for all six endpoints in development Terraform plan.
2. Add Lambda route dispatch stubs that return contract-compliant shapes.
3. Add DynamoDB key/index updates required for stage outputs and decisions.
4. Add contract tests for success and validation-failure paths.
