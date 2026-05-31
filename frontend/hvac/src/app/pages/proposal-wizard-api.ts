import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ProposalDecisionPacket,
  ProposalDecisionPreview,
  ProposalRecommendationStatus,
  ProposalWizardState
} from './proposal-wizard.service';

export interface ProposalWizardSubmissionPayload {
  state: ProposalWizardState;
  decisionPacket: ProposalDecisionPacket;
  decisionPreview: ProposalDecisionPreview;
  submittedBy: string | null;
  submittedAtIso: string;
}

export interface ProposalWizardSubmissionReceipt {
  submissionId: string;
  status: 'submitted';
  reviewQueue: 'tenant-review';
  recommendation: ProposalRecommendationStatus;
  submittedAtIso: string;
}

export interface ProposalWizardRecentSubmission {
  submissionId: string;
  tenantId: string;
  submittedBy: string;
  recommendation: ProposalRecommendationStatus;
  status: 'submitted' | 'needs_review';
  submittedAtIso: string;
  projectName: string;
  projectNumber: string;
}

export interface ProposalWizardRecentSubmissionsResponse {
  tenantId: string;
  count: number;
  submissions: ProposalWizardRecentSubmission[];
}

export interface ProposalWorkflowCitation {
  claimId: string;
  sourceDocumentId: string;
  pageNumber: number;
  snippet: string;
  confidence: number;
}

export interface ProposalWorkflowPolicyCheck {
  code: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

export interface ProposalWorkflowTriageRunRequest {
  documentBundleId: string;
  representedManufacturer: string;
  approvedManufacturers: string[];
  bidDueDateIso?: string;
  bodFitScoreHint?: number;
  isIncumbentProject?: boolean;
  isStrategicCustomer?: boolean;
}

export interface ProposalWorkflowTriageResult {
  recommendation: 'pursue' | 'pass' | 'needs_review';
  winProbability: number;
  bodFitScore: number;
  dueDateRisk: 'low' | 'medium' | 'high' | 'unknown';
  manufacturerFit: 'fit' | 'partial' | 'conflict' | 'unknown';
  confidence: number;
  reasonCodes: string[];
  blockers: string[];
  generatedAtIso: string;
  generatedBy?: string;
}

export interface ProposalWorkflowTriageRunResponse {
  opportunityId: string;
  triage: ProposalWorkflowTriageResult;
}

export interface ProposalWorkflowQualificationRunRequest {
  documentBundleId: string;
  representedManufacturer: string;
  approvedManufacturers: string[];
  requiresCitations?: boolean;
  citations?: ProposalWorkflowCitation[];
}

export interface ProposalWorkflowQualificationResult {
  recommendation: 'go' | 'no_go' | 'needs_review';
  confidence: number;
  representedManufacturer: string;
  detectedManufacturers: string[];
  overlapStatus: 'eligible' | 'conflict' | 'unknown';
  policyChecks: ProposalWorkflowPolicyCheck[];
  citations: ProposalWorkflowCitation[];
  reasonCodes: string[];
  blockers: string[];
  generatedAtIso: string;
}

export interface ProposalWorkflowQualificationRunResponse {
  opportunityId: string;
  qualification: ProposalWorkflowQualificationResult;
}

export interface ProposalWorkflowSelectionDelta {
  field: string;
  toolPathValue: string;
  manufacturerValue: string;
  severity: 'info' | 'warning' | 'critical';
  rationale: string;
  citations: ProposalWorkflowCitation[];
}

export interface ProposalWorkflowSelectionCompareRequest {
  toolPathModel?: string;
  recommendedToolPathModel?: string;
  manufacturerPathModel: string;
  notes?: string;
  deltas?: ProposalWorkflowSelectionDelta[];
}

export interface ProposalWorkflowSelectionResult {
  toolPathModel: string;
  manufacturerPathModel: string;
  overallStatus: 'aligned' | 'mismatch' | 'needs_review';
  confidence: number;
  deltas: ProposalWorkflowSelectionDelta[];
  reasonCodes: string[];
  blockers: string[];
  generatedAtIso: string;
}

export interface ProposalWorkflowSelectionCompareResponse {
  opportunityId: string;
  selection: ProposalWorkflowSelectionResult;
}

export interface ProposalWorkflowStageDecisionResponse {
  opportunityId: string;
  stage: 'triage' | 'qualification' | 'selection';
  decision: string;
  rationale: string;
  decidedBy: string;
  decidedAtIso: string;
}

export interface ProposalWorkflowSelectionDecisionRequest {
  decision: 'approve' | 'reject' | 'needs_review';
  rationale: string;
}

export interface ProposalWizardApi {
  submitDecisionPacket(payload: ProposalWizardSubmissionPayload): Observable<ProposalWizardSubmissionReceipt>;
  getRecentSubmissions(limit?: number): Observable<ProposalWizardRecentSubmissionsResponse>;
  runTriage(opportunityId: string, payload: ProposalWorkflowTriageRunRequest): Observable<ProposalWorkflowTriageRunResponse>;
  runQualification(opportunityId: string, payload: ProposalWorkflowQualificationRunRequest): Observable<ProposalWorkflowQualificationRunResponse>;
  compareSelection(opportunityId: string, payload: ProposalWorkflowSelectionCompareRequest): Observable<ProposalWorkflowSelectionCompareResponse>;
  submitSelectionDecision(opportunityId: string, payload: ProposalWorkflowSelectionDecisionRequest): Observable<ProposalWorkflowStageDecisionResponse>;
}

export const PROPOSAL_WIZARD_API = new InjectionToken<ProposalWizardApi>('PROPOSAL_WIZARD_API');
