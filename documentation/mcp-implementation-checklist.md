# MCP Implementation Checklist (Sprint Planning)

## 1. Purpose

This checklist maps the first MCP tool set to concrete API contracts, owner teams, dependencies, and acceptance criteria for proposal-stage MVP delivery.

## 2. Team Ownership Model

- Platform Team: API Gateway, auth, tenancy, orchestration, audit
- AI/Agent Team: Strands agent logic, prompt packs, extraction quality
- Document Intelligence Team: parsing/OCR pipelines, citation indexing
- Rules Engine Team: deterministic selection and validation logic
- Proposal App Team: template rendering and draft generation
- Frontend Team: consoles, HITL interactions, explainability views
- QA/Compliance Team: test datasets, regression metrics, audit readiness

## 3. MCP Tool Catalog to API Contract Mapping

## 3.1 qualification_tool

Purpose:
- Identify relevant scope, approved manufacturers, and bid fit signals.

MCP Input Contract:
- opportunityId: string (required)
- documentBundleId: string (required)
- tenantId: string (required, injected from auth context)

MCP Output Contract:
- scopeCandidates: array of { equipmentType, confidence, citations[] }
- approvedManufacturers: array of { name, sourceCitation }
- qualificationSignals: { privateBidFlag, dueDateRisk, complexityScore }
- runMetadata: { modelId, promptVersion, latencyMs }

Internal API Dependencies:
- POST /opportunities/{id}/qualification/run
- GET /opportunities/{id}/documents/{bundleId}

Primary Owner:
- AI/Agent Team

Supporting Owners:
- Document Intelligence Team
- Frontend Team (Qualification Console)

Definition of Done:
- Returns structured scope and confidence for all required pilot opportunities
- Captures page-level citations for all extracted key fields
- Emits audit event with prompt/version and tool execution metadata

## 3.2 requirements_extraction_tool

Purpose:
- Extract and normalize duties/spec notes into canonical Requirement records.

MCP Input Contract:
- opportunityId: string
- documentBundleId: string
- extractionProfile: string (example: proposal_mvp_v1)

MCP Output Contract:
- requirements: array of {
  requirementId,
  type,
  normalizedValue,
  unit,
  confidence,
  citations[]
}
- missingCriticalFields: array of string
- runMetadata: { extractionEngine, modelId, promptVersion }

Internal API Dependencies:
- POST /opportunities/{id}/documents/extract
- POST /opportunities/{id}/requirements/bulk

Primary Owner:
- Document Intelligence Team

Supporting Owners:
- AI/Agent Team
- Platform Team

Definition of Done:
- Required pilot field set extracted with agreed precision/recall threshold
- Missing critical fields are explicitly flagged
- All requirement records persist with citation traceability

## 3.3 deterministic_selection_tool

Purpose:
- Apply deterministic matching rules to normalized requirements and catalog data.

MCP Input Contract:
- opportunityId: string
- requirementSetVersion: string
- catalogReferenceIds: array<string>

MCP Output Contract:
- recommendedModels: array of {
  modelId,
  score,
  passFailChecks: array<{ ruleId, status, details }>
}
- blockingIssues: array<{ code, description }>
- runMetadata: { rulesetVersion, engineVersion, durationMs }

Internal API Dependencies:
- POST /opportunities/{id}/selection/run-tool-path
- GET /catalogs/{catalogRefId}

Primary Owner:
- Rules Engine Team

Supporting Owners:
- Platform Team
- QA/Compliance Team

Definition of Done:
- Deterministic output reproducible for identical inputs
- Rule pass/fail details are complete and human-readable
- Engine version and ruleset version stored in audit trail

## 3.4 selection_comparison_tool

Purpose:
- Compare tool-path results with human-entered manufacturer software output.

MCP Input Contract:
- opportunityId: string
- toolPathSelectionId: string
- manufacturerSelectionInput: {
  modelId: string,
  notes?: string,
  sourceFileId?: string
}

MCP Output Contract:
- comparisonSummary: {
  matchStatus,
  deltas: array<{ field, toolValue, manufacturerValue, severity }>
}
- approvalRecommendation: { status, rationale }
- runMetadata: { comparatorVersion }

Internal API Dependencies:
- POST /opportunities/{id}/selection/manufacturer-input
- POST /opportunities/{id}/selection/compare
- POST /opportunities/{id}/selection/approve

Primary Owner:
- Rules Engine Team

Supporting Owners:
- Frontend Team (Selection Console)
- QA/Compliance Team

Definition of Done:
- Delta report produced for every comparison run
- Approval action requires explicit user acknowledgment
- Overrides require mandatory rationale and are auditable

## 3.5 proposal_composer_tool

Purpose:
- Build proposal draft artifacts using approved selection and tenant templates.

MCP Input Contract:
- opportunityId: string
- approvedSelectionId: string
- templateId: string
- pricingProfileId: string

MCP Output Contract:
- draftArtifact: {
  proposalDraftId,
  docxFileId,
  pdfFileId,
  version
}
- generationSummary: { sectionsIncluded, warnings[] }
- runMetadata: { rendererVersion }

Internal API Dependencies:
- POST /opportunities/{id}/proposal/generate
- GET /templates/{templateId}
- GET /pricing/profiles/{pricingProfileId}

Primary Owner:
- Proposal App Team

Supporting Owners:
- Platform Team
- Frontend Team (Proposal Studio)

Definition of Done:
- DOCX and PDF outputs generated and stored successfully
- All required baseline sections present for pilot template
- Draft versioning and regeneration history are visible in UI

## 3.6 citation_lookup_tool

Purpose:
- Provide claim-to-source evidence for explainability and reviewer confidence.

MCP Input Contract:
- opportunityId: string
- claimId: string

MCP Output Contract:
- evidence: array of {
  sourceDocumentId,
  pageNumber,
  textSpan,
  snippet,
  confidence
}

Internal API Dependencies:
- GET /opportunities/{id}/audit/citations/{claimId}

Primary Owner:
- Document Intelligence Team

Supporting Owners:
- Frontend Team (Audit/Explainability panel)

Definition of Done:
- Every surfaced claim in A/B/C can resolve to at least one source citation
- Citation lookups render in under agreed latency threshold

## 4. Cross-Cutting Non-Functional Checklist

Security:
- Tenant scoping enforced for all MCP tool invocations
- Tool authorization policy per agent role is active
- No MCP tool can publish final artifact without HITL approval endpoint

Auditability:
- Store agent session ID, tool name, prompt version, input/output hashes
- Persist user decisions and rationale at every HITL gate

Reliability:
- Retries with bounded backoff for transient failures
- DLQ configured for async tool failures
- Idempotency keys for all create/update actions

Performance:
- P95 response goals defined per tool
- Batch processing strategy for large document bundles

Cost:
- Per-tenant metering tags across runtime, extraction, and storage operations
- Weekly cost report by tool and opportunity volume

## 5. Sprint Sequencing (Suggested)

Sprint 1:
- qualification_tool
- requirements_extraction_tool (minimal field set)
- Qualification Console HITL Gate 1

Sprint 2:
- deterministic_selection_tool
- selection_comparison_tool
- Selection Console HITL Gate 2

Sprint 3:
- proposal_composer_tool
- citation_lookup_tool
- Proposal Studio HITL Gate 3

## 6. Kickoff Decision Log Template

For each tool, capture in sprint planning:

- Owner team:
- API contract approved date:
- Prompt family/version (if applicable):
- Test dataset baseline:
- Acceptance metrics:
- Go-live flag:
