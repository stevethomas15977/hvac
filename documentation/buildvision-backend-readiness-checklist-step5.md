# BuildVision Backend Readiness Checklist (Step 5)

## Purpose

Provide a release-gate checklist confirming backend readiness for frontend integration on triage, qualification, and selection workflow endpoints.

## Environment Scope

- AWS profile: development only
- Terraform backend: terraform/environments/development/backend.hcl
- Production promotion remains out of scope until explicit approval

## Contract Artifacts

1. OpenAPI contract checked in:
- documentation/buildvision-backend-openapi-v1.yaml

2. Contract freeze reference:
- documentation/buildvision-backend-contract-freeze-v1.md

3. Runtime implementation reference:
- terraform/lambda/proposal_submission/index.mjs

## Automated Contract Test Runner

Script location:
- terraform/lambda/proposal_submission/contract-tests/run-workflow-contract-tests.mjs

Preconditions:

1. AWS CLI configured with profile development
2. Terraform state initialized in terraform/
3. Lambda deployed to development with latest code

Run command:

AWS_PROFILE=development AWS_REGION=us-east-1 node terraform/lambda/proposal_submission/contract-tests/run-workflow-contract-tests.mjs

## Functional Readiness Gates

1. All six endpoints return contract-compliant HTTP 200 success payloads:
- POST /api/proposals/workflow/opportunities/{opportunityId}/triage/run
- POST /api/proposals/workflow/opportunities/{opportunityId}/triage/decision
- POST /api/proposals/workflow/opportunities/{opportunityId}/qualification/run
- POST /api/proposals/workflow/opportunities/{opportunityId}/qualification/decision
- POST /api/proposals/workflow/opportunities/{opportunityId}/selection/compare
- POST /api/proposals/workflow/opportunities/{opportunityId}/selection/decision

2. Validation failure paths return structured 400 errors with code validation_failed:
- Decision request missing rationale
- Compare request missing required model input

3. Persistence checks pass:
- workflow_summary updated per stage transition
- workflow_stage_output records written for triage, qualification, selection
- workflow_stage_decision records written for triage, qualification, selection

4. Authentication/tenant behavior confirmed:
- Endpoints require valid JWT
- Tenant derived from JWT claims/default behavior in development

## Frontend Integration Readiness

1. Frontend can consume stable contract fields without mock-only dependencies.
2. Selection compare now supports explicit delta/citation payloads for UI rendering.
3. Qualification responses include citation and policyChecks suitable for BOD panel display.
4. Triage/qualification/selection decision endpoints persist rationale and actor metadata for audit views.

## Sign-off

Mark each item complete before frontend sprint integration branch cut:

- [ ] Contract artifact reviewed by frontend
- [ ] Contract test runner passed in development
- [ ] Persistence verification completed in development
- [ ] Known issues documented (if any)
- [ ] Backend integration handoff approved
