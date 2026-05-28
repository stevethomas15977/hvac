# HVAC Functional Implementation Plan (Frontend + Backend)

## 1. Goal and Recommendation

Based on the scope and transcript, the product focus should be:

- Agentic AI for Proposal/Bid/Submittal workflows
- MVP on Proposal stage first (highest volume, fastest ROI)
- Human-in-the-loop (HITL) at trust-critical points

This aligns with the two-axis model already defined:

- Workflow stages: Proposal, Submittal
- Functional layers: Qualification (A), Spec/Model Selection (B), Output Generation (C)

## 2. Product Scope by Phase

Reference narrative:

- See `documentation/bid-process-use-case.md` for a concise end-to-end story that aligns to the Phase 1 A/B/C flow and HITL approvals.

### Phase 1 (MVP, 90 days)

- Proposal stage only
- One equipment category for pilot customer
- Layer A: qualification from uploaded bid docs
- Layer B: dual-path selection support
  - Tool path from catalog data
  - Human-entered manufacturer selection software result
  - Side-by-side comparison
- Layer C: proposal document generation (baseline format)

### Phase 2 (Pilot expansion)

- Add Submittal stage
- Add CDE and scheduled-vs-submitted outputs
- Expand to 2-3 equipment categories
- Add deeper auditing and quality metrics

## 3. Data Strategy

## 3.1 Data Domains

1. Tenant data (must be isolated):
- Opportunities/projects
- Uploaded bid packages
- Extracted requirements
- Model recommendations
- Human decisions/approvals
- Proposal outputs and revisions
- Pricing/markup rules and templates

2. Shared reference data (platform-wide):
- Public code/standards metadata
- Weather reference APIs (if used)
- Common unit conversion tables

3. Partner/manufacturer data (tenant-scoped access policy):
- Catalog tables and cut sheets
- Internal/contract pricing files
- Access-controlled product rules

## 3.2 Canonical Data Model

Use a normalized intermediate schema between A, B, C:

- Opportunity
- DocumentBundle
- Requirement
- EquipmentCandidate
- SelectionComparison
- ProposalDraft
- ApprovalDecision
- AuditEvent

Each extracted requirement and generated claim stores source citation metadata:

- sourceDocumentId
- pageNumber
- textSpan
- extractionConfidence

## 3.3 Storage and Retrieval

- Postgres for canonical entities and transactional state
- Object storage for files (PDFs, DOCX, outputs)
- Vector index for retrieval over bid/spec documents
- Append-only audit log table/stream for explainability

## 3.4 Data Quality Controls

- Version detection signals on uploaded document bundles
- Unit normalization and deterministic validation rules
- Required-field completeness checks before each stage transition
- Drift checks between tool-path and human-path outcomes

## 4. Agentic Orchestration Workflow

Use a deterministic workflow orchestrator with agent tasks per layer.

## 4.1 Workflow DAG

1. Intake and classify
- Ingest bid package
- OCR/text extraction and sectioning
- Build searchable project context

2. Agent A: Qualification
- Identify relevant scope and approved manufacturers
- Score opportunity fit and confidence
- Produce qualification artifact

3. HITL Gate 1 (Go/No-Go)
- User confirms pursuit decision
- Capture rationale and audit record

4. Agent B1: Requirement extraction and normalization
- Pull duties/specs/notes into structured schema
- Map synonyms and normalize units

5. Agent B2: Tool-path model recommendation
- Deterministic rule engine over catalog data
- Produce recommended models + constraint checks

6. HITL Gate 2 (Manufacturer selection input)
- User enters manufacturer software output
- System compares tool path vs manufacturer path
- User approves final selected model

7. Agent C: Proposal composer
- Apply tenant template + pricing rules
- Generate proposal draft document
- Generate evidence panel with citations

8. HITL Gate 3 (Final approval)
- Reviewer approves or requests edits
- Publish final proposal package

## 4.2 Orchestration Principles

- Keep orchestration deterministic; use LLMs only for extraction/summarization/drafting
- Block stage progression without required HITL acknowledgments
- Persist all intermediate artifacts for replay and audit

## 5. Human-in-the-Loop Design

HITL is mandatory at three points:

1. Qualification decision
- Why: commercial prioritization and relationship context are human judgment

2. Final model selection after dual-path comparison
- Why: liability and proprietary manufacturer logic concerns

3. Final proposal release
- Why: customer-facing commercial/legal artifact

HITL UX requirements:

- Explicit approve/reject actions
- Required comment for override decisions
- Diff view between versions
- Side-by-side source citation panel

## 6. Frontend Implementation Plan

## 6.1 App Areas

1. Work Queue
- Opportunity list with status by A/B/C stage
- Priority filters (open bid, private bid, due date)

2. Document Workspace
- Upload and version bundle management
- OCR status and parsing diagnostics

3. Qualification Console (A)
- Suggested scope, competitors, confidence
- Go/No-Go decision with notes

4. Selection Console (B)
- Requirement matrix
- Tool-path recommendation
- Manual manufacturer result entry
- Comparison and approval action

5. Proposal Studio (C)
- Template-driven document preview
- Pricing lines and scope tables
- Final approval/publish controls

6. Audit and Explainability
- Timeline of decisions
- Claim-to-source trace links
- Exportable audit report

## 6.2 Frontend Technical Components

- Angular feature modules per stage (A/B/C)
- Route guards by role and stage readiness
- Reactive forms for approvals and structured edits
- Document viewer with source highlighting
- State management for workflow status and task progress

## 6.3 Roles in UI

- Estimator/Coordinator: operate A/B/C workflow
- Reviewer/Manager: approve gates
- Admin: templates, policies, tenant settings

## 7. Backend Implementation Plan

## 7.1 Services

1. API Gateway / BFF
- Auth, tenant context, role enforcement

2. Workflow Service
- State machine for A/B/C and HITL gates
- Retry and compensation logic

3. Document Processing Service
- OCR, parsing, chunking, citation mapping

4. Extraction Service (LLM-enabled)
- Requirements extraction into canonical schema

5. Rule/Selection Engine
- Deterministic model matching and validations

6. Proposal Composition Service
- Templating and document generation

7. Audit Service
- Immutable event capture and query APIs

## 7.2 Core APIs

- POST /opportunities
- POST /opportunities/{id}/documents
- POST /opportunities/{id}/qualification/run
- POST /opportunities/{id}/qualification/decision
- POST /opportunities/{id}/selection/run-tool-path
- POST /opportunities/{id}/selection/manufacturer-input
- POST /opportunities/{id}/selection/approve
- POST /opportunities/{id}/proposal/generate
- POST /opportunities/{id}/proposal/approve
- GET /opportunities/{id}/audit

## 7.3 Security and Compliance

- Tenant isolation via row-level security and scoped storage paths
- Encryption in transit and at rest
- Principle-of-least-privilege service roles
- Signed audit events with immutable retention policy

## 8. Delivery Plan and Milestones

## 8.1 Sprint 1-2 (Foundations)

- Canonical schema and workflow state model
- Document upload + parsing pipeline
- Basic work queue and opportunity detail UI

## 8.2 Sprint 3-4 (Layer A)

- Qualification agent and console
- HITL gate 1 with audit records

## 8.3 Sprint 5-6 (Layer B)

- Requirement extraction pipeline
- Tool-path rule engine
- Manufacturer result entry + comparison UI
- HITL gate 2

## 8.4 Sprint 7-8 (Layer C)

- Proposal template system
- Proposal generation and preview
- HITL gate 3 + final publish

## 8.5 Sprint 9-10 (Hardening)

- Performance tuning and failure handling
- Observability dashboards and quality metrics
- Pilot readiness checklist

## 9. Success Metrics

- Proposal throughput increase vs baseline
- Time-to-first-draft reduction
- Human override rate at gate 2
- Citation coverage and extraction precision
- Error rate attributable to system output

## 10. Immediate Next Actions

1. Pick pilot equipment category and pilot customer
2. Finalize canonical schema and workflow states
3. Define proposal template baseline for pilot tenant
4. Build Layer A first, then Layer B dual-path comparison
5. Schedule weekly calibration with SME for extraction quality
