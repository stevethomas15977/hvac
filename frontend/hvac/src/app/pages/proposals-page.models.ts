export type IntakeStatus = 'not_started' | 'uploading' | 'processing' | 'ready' | 'error';
export type QualificationStatus = 'idle' | 'running' | 'ready' | 'approved' | 'rejected' | 'needs_review';
export type SelectionStatus = 'idle' | 'running' | 'ready' | 'approved' | 'rejected' | 'needs_review';

export type BidSource = 'Open Bid' | 'Private Invite';

export interface BidDocument {
  id: string;
  name: string;
  kind: 'drawings' | 'specs' | 'addenda' | 'schedule';
  pages: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface IntakeEvent {
  id: string;
  timestamp: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface QualificationScopeCandidate {
  equipmentType: string;
  confidence: number;
  notes: string;
  citations: string[];
}

export interface QualificationResult {
  confidenceScore: number;
  recommendation: 'go' | 'no_go';
  summary: string;
  approvedManufacturers: string[];
  scopeCandidates: QualificationScopeCandidate[];
  reasons: string[];
}

export interface QualificationDecision {
  decision: 'go' | 'no_go';
  rationale: string;
  decidedBy: string;
  decidedAt: string;
}

export interface SelectionCheck {
  field: string;
  toolPathValue: string;
  manufacturerValue: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SelectionResult {
  toolPathModel: string;
  toolPathSummary: string;
  manufacturerModel?: string;
  comparisonChecks: SelectionCheck[];
  recommendation: 'approve' | 'review';
}

export interface SelectionDecision {
  decision: 'approve' | 'reject';
  rationale: string;
  decidedBy: string;
  decidedAt: string;
}

export interface BidOpportunity {
  id: string;
  projectName: string;
  projectType: string;
  location: string;
  source: BidSource;
  dueDate: string;
  manufacturer: string;
  estimatedValueUsd: number;
  intakeStatus: IntakeStatus;
  score: number;
  approvedManufacturers: string[];
  docs: BidDocument[];
  missingItems: string[];
  events: IntakeEvent[];
  qualificationStatus?: QualificationStatus;
  qualificationResult?: QualificationResult;
  qualificationDecision?: QualificationDecision;
  selectionStatus?: SelectionStatus;
  selectionResult?: SelectionResult;
  selectionDecision?: SelectionDecision;
}

export interface ProposalAppConfig {
  proposalApiMode?: 'mock' | 'http';
  authMode?: 'local' | 'cognito';
}
