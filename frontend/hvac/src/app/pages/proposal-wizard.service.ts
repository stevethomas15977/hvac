import { Inject, Injectable, Injector, computed, effect, inject, signal } from '@angular/core';
import { Observable, finalize, of, switchMap } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import {
  PROPOSAL_WIZARD_API,
  ProposalWizardApi,
  ProposalWorkflowCitation,
  ProposalWorkflowQualificationResult,
  ProposalWorkflowSelectionResult,
  ProposalWorkflowStageDecisionResponse,
  ProposalWizardRecentSubmission,
  ProposalWizardSubmissionReceipt,
  ProposalWorkflowTriageResult
} from './proposal-wizard-api';

export type ProposalSourceType = 'email' | 'procore' | 'constructconnect' | 'shared_drive' | 'dropbox' | 'direct_link' | 'other';
export type BidVisibility = 'open_bid' | 'closed_bid' | 'invited' | 'basis_of_design' | 'unknown';
export type DocumentType = 'invitation' | 'm_sheet' | 'specification' | 'general_note' | 'addendum' | 'other';

export interface ProposalDocumentDraft {
  id: string;
  name: string;
  sizeBytes: number;
  type: DocumentType;
}

export interface ProposalWizardState {
  source: {
    sourceType: ProposalSourceType;
    projectName: string;
    projectNumber: string;
    bidDueDate: string;
    contractorName: string;
    contactEmail: string;
    bidVisibility: BidVisibility;
  };
  documents: ProposalDocumentDraft[];
  scope: {
    coolingTowers: boolean;
    boilers: boolean;
    pumps: boolean;
    heatExchangers: boolean;
  };
  eligibility: {
    representedManufacturer: string;
    approvedManufacturersRaw: string;
  };
  selection: {
    toolPathModel: string;
    manufacturerPathModel: string;
    comparisonNotes: string;
  };
  finalDecision: {
    recommendation: ProposalRecommendationStatus | null;
    reviewNotes: string;
    submittedForReview: boolean;
    submittedAtIso: string | null;
  };
}

interface PersistedDraft {
  version: number;
  updatedAtEpochMs: number;
  currentStep: number;
  state: ProposalWizardState;
}

export interface QualificationPolicyAssessment {
  missingEvidence: string[];
  hasConflict: boolean;
  representedManufacturer: string;
  approvedManufacturers: string[];
  canProceedToDecision: boolean;
}

export interface WorkflowPanelState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export interface WizardStepValidation {
  isComplete: boolean;
  issues: string[];
}

export type ProposalRecommendationStatus = 'go' | 'no_go' | 'needs_review';

export interface ProposalDecisionPreview {
  status: ProposalRecommendationStatus;
  rationale: string;
  blockers: string[];
}

export interface ProposalDecisionPacket {
  evidenceSummary: {
    invitationCount: number;
    mSheetCount: number;
    specificationCount: number;
    addendumCount: number;
  };
  scopeSummary: string[];
  manufacturerEligibility: {
    representedManufacturer: string;
    approvedManufacturers: string[];
    isEligible: boolean;
  };
  workflowSummary: {
    triageConfidence: number | null;
    qualificationConfidence: number | null;
    selectionConfidence: number | null;
    triageRecommendation: string | null;
    qualificationRecommendation: string | null;
    selectionStatus: string | null;
  };
  selectionWorkbench: {
    toolPathModel: string;
    manufacturerPathModel: string;
    overallStatus: string | null;
    confidence: number | null;
    deltaCount: number;
    deltas: Array<{
      field: string;
      severity: 'info' | 'warning' | 'critical';
      rationale: string;
      toolPathValue: string;
      manufacturerValue: string;
    }>;
  };
  reasonCodes: string[];
  blockers: string[];
}

const DRAFT_VERSION = 2;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function defaultState(): ProposalWizardState {
  return {
    source: {
      sourceType: 'email',
      projectName: '',
      projectNumber: '',
      bidDueDate: '',
      contractorName: '',
      contactEmail: '',
      bidVisibility: 'unknown'
    },
    documents: [],
    scope: {
      coolingTowers: false,
      boilers: false,
      pumps: false,
      heatExchangers: false
    },
    eligibility: {
      representedManufacturer: 'Marley',
      approvedManufacturersRaw: ''
    },
    selection: {
      toolPathModel: '',
      manufacturerPathModel: '',
      comparisonNotes: ''
    },
    finalDecision: {
      recommendation: null,
      reviewNotes: '',
      submittedForReview: false,
      submittedAtIso: null
    }
  };
}

@Injectable({ providedIn: 'root' })
export class ProposalWizardService {
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  readonly state = signal<ProposalWizardState>(defaultState());
  readonly currentStep = signal(0);
  readonly restoredFromDraft = signal(false);
  readonly isSubmitting = signal(false);
  readonly submitErrorMessage = signal<string | null>(null);
  readonly lastSubmissionReceipt = signal<ProposalWizardSubmissionReceipt | null>(null);
  readonly lastSubmittedSnapshot = signal<string | null>(null);
  readonly recentSubmissions = signal<ProposalWizardRecentSubmission[]>([]);
  readonly triagePanel = signal<WorkflowPanelState<ProposalWorkflowTriageResult>>({
    loading: false,
    error: null,
    data: null
  });
  readonly qualificationPanel = signal<WorkflowPanelState<ProposalWorkflowQualificationResult>>({
    loading: false,
    error: null,
    data: null
  });
  readonly selectionPanel = signal<WorkflowPanelState<ProposalWorkflowSelectionResult>>({
    loading: false,
    error: null,
    data: null
  });
  readonly lastSelectionDecision = signal<ProposalWorkflowStageDecisionResponse | null>(null);

  readonly selectedScopeLabels = computed(() => {
    const scope = this.state().scope;
    const labels: string[] = [];
    if (scope.coolingTowers) {
      labels.push('Cooling Towers');
    }
    if (scope.boilers) {
      labels.push('Boilers');
    }
    if (scope.pumps) {
      labels.push('Pumps');
    }
    if (scope.heatExchangers) {
      labels.push('Heat Exchangers');
    }
    return labels;
  });

  readonly assessment = computed<QualificationPolicyAssessment>(() => this.computeAssessment());
  readonly workflowOpportunityId = computed(() => this.buildWorkflowOpportunityId());
  readonly approvedManufacturers = computed(() => this.parseApprovedManufacturers(this.state().eligibility.approvedManufacturersRaw));
  readonly triageRequestPayload = computed(() => this.buildTriageRequestPayload());
  readonly qualificationRequestPayload = computed(() => this.buildQualificationRequestPayload());
  readonly selectionRequestPayload = computed(() => this.buildSelectionComparePayload());

  readonly stepValidations = computed<Record<number, WizardStepValidation>>(() => ({
    0: this.validateStep0(),
    1: this.validateStep1(),
    2: this.validateStep2(),
    3: this.validateStep3()
  }));

  readonly decisionPreview = computed<ProposalDecisionPreview>(() => this.computeDecisionPreview());
  readonly decisionPacket = computed<ProposalDecisionPacket>(() => this.computeDecisionPacket());
  readonly hasDraftContent = computed(() => this.toSubmissionSnapshot(this.state()) !== this.toSubmissionSnapshot(defaultState()));
  readonly hasChangesSinceLastSubmission = computed(() => {
    const previous = this.lastSubmittedSnapshot();
    if (!previous) {
      return true;
    }

    return previous !== this.toSubmissionSnapshot(this.state());
  });
  readonly canSubmitForReview = computed(() => !this.isSubmitting() && (this.lastSubmissionReceipt() === null || this.hasChangesSinceLastSubmission()));
  readonly shouldWarnBeforeUnload = computed(() => {
    if (!this.hasDraftContent()) {
      return false;
    }

    if (this.lastSubmissionReceipt() === null) {
      return true;
    }

    return this.hasChangesSinceLastSubmission();
  });

  private hasInitialized = false;
  private triageRefreshHandle: number | null = null;
  private qualificationRefreshHandle: number | null = null;
  private selectionRefreshHandle: number | null = null;
  private triageRequestVersion = 0;
  private qualificationRequestVersion = 0;
  private selectionRequestVersion = 0;

  constructor(@Inject(PROPOSAL_WIZARD_API) private readonly api: ProposalWizardApi) {}

  initialize(): void {
    if (this.hasInitialized) {
      return;
    }

    this.hasInitialized = true;
    this.restoreDraftIfPresent();

    effect(() => {
      const username = this.auth.currentUsername();
      if (!username) {
        return;
      }

      const payload: PersistedDraft = {
        version: DRAFT_VERSION,
        updatedAtEpochMs: Date.now(),
        currentStep: this.currentStep(),
        state: this.state()
      };

      window.localStorage.setItem(this.storageKey(username), JSON.stringify(payload));
    }, { injector: this.injector });

    effect(() => {
      const opportunityId = this.workflowOpportunityId();
      const payload = this.triageRequestPayload();

      if (!opportunityId || !payload) {
        if (this.triageRefreshHandle !== null) {
          window.clearTimeout(this.triageRefreshHandle);
          this.triageRefreshHandle = null;
        }
        this.triagePanel.set({ loading: false, error: null, data: null });
        return;
      }

      if (this.triageRefreshHandle !== null) {
        window.clearTimeout(this.triageRefreshHandle);
      }

      this.triageRefreshHandle = window.setTimeout(() => {
        this.refreshTriage(opportunityId, payload);
      }, 350);
    }, { injector: this.injector });

    effect(() => {
      const opportunityId = this.workflowOpportunityId();
      const payload = this.qualificationRequestPayload();

      if (!opportunityId || !payload) {
        if (this.qualificationRefreshHandle !== null) {
          window.clearTimeout(this.qualificationRefreshHandle);
          this.qualificationRefreshHandle = null;
        }
        this.qualificationPanel.set({ loading: false, error: null, data: null });
        return;
      }

      if (this.qualificationRefreshHandle !== null) {
        window.clearTimeout(this.qualificationRefreshHandle);
      }

      this.qualificationRefreshHandle = window.setTimeout(() => {
        this.refreshQualification(opportunityId, payload);
      }, 350);
    }, { injector: this.injector });

    effect(() => {
      const opportunityId = this.workflowOpportunityId();
      const payload = this.selectionRequestPayload();

      if (!opportunityId || !payload) {
        if (this.selectionRefreshHandle !== null) {
          window.clearTimeout(this.selectionRefreshHandle);
          this.selectionRefreshHandle = null;
        }
        this.selectionPanel.set({ loading: false, error: null, data: null });
        return;
      }

      if (this.selectionRefreshHandle !== null) {
        window.clearTimeout(this.selectionRefreshHandle);
      }

      this.selectionRefreshHandle = window.setTimeout(() => {
        this.refreshSelection(opportunityId, payload);
      }, 350);
    }, { injector: this.injector });

    this.refreshRecentSubmissions();
  }

  setCurrentStep(stepIndex: number): void {
    this.currentStep.set(Math.max(0, Math.min(stepIndex, 3)));
  }

  updateSourceField<K extends keyof ProposalWizardState['source']>(key: K, value: ProposalWizardState['source'][K]): void {
    this.state.update((current) => ({
      ...current,
      source: {
        ...current.source,
        [key]: value
      }
    }));
  }

  updateScopeField<K extends keyof ProposalWizardState['scope']>(key: K, value: ProposalWizardState['scope'][K]): void {
    this.state.update((current) => ({
      ...current,
      scope: {
        ...current.scope,
        [key]: value
      }
    }));
  }

  updateEligibilityField<K extends keyof ProposalWizardState['eligibility']>(
    key: K,
    value: ProposalWizardState['eligibility'][K]
  ): void {
    this.state.update((current) => ({
      ...current,
      eligibility: {
        ...current.eligibility,
        [key]: value
      }
    }));
  }

  addDocuments(files: FileList | null): void {
    if (!files || files.length === 0) {
      return;
    }

    const incoming: ProposalDocumentDraft[] = [];
    for (const file of Array.from(files)) {
      incoming.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: file.name,
        sizeBytes: file.size,
        type: this.inferDocumentType(file.name)
      });
    }

    this.state.update((current) => ({
      ...current,
      documents: [...current.documents, ...incoming]
    }));
  }

  updateDocumentType(id: string, type: DocumentType): void {
    this.state.update((current) => ({
      ...current,
      documents: current.documents.map((item) => (item.id === id ? { ...item, type } : item))
    }));
  }

  removeDocument(id: string): void {
    this.state.update((current) => ({
      ...current,
      documents: current.documents.filter((item) => item.id !== id)
    }));
  }

  clearDraft(): void {
    const username = this.auth.currentUsername();
    if (username) {
      window.localStorage.removeItem(this.storageKey(username));
    }

    this.currentStep.set(0);
    this.state.set(defaultState());
    this.restoredFromDraft.set(false);
    this.submitErrorMessage.set(null);
    this.lastSubmissionReceipt.set(null);
    this.lastSubmittedSnapshot.set(null);
    this.triagePanel.set({ loading: false, error: null, data: null });
    this.qualificationPanel.set({ loading: false, error: null, data: null });
    this.selectionPanel.set({ loading: false, error: null, data: null });
    this.lastSelectionDecision.set(null);
  }

  canSelectRecommendation(status: ProposalRecommendationStatus): boolean {
    if (status === 'needs_review') {
      return true;
    }

    if (status === 'go') {
      return this.decisionPreview().status === 'go';
    }

    return this.hasWorkflowRecommendationInputs();
  }

  setFinalRecommendation(status: ProposalRecommendationStatus): boolean {
    if (!this.canSelectRecommendation(status)) {
      this.state.update((current) => ({
        ...current,
        finalDecision: {
          ...current.finalDecision,
          recommendation: 'needs_review'
        }
      }));
      return false;
    }

    this.state.update((current) => ({
      ...current,
      finalDecision: {
        ...current.finalDecision,
        recommendation: status
      }
    }));

    return true;
  }

  updateReviewNotes(notes: string): void {
    this.state.update((current) => ({
      ...current,
      finalDecision: {
        ...current.finalDecision,
        reviewNotes: notes
      }
    }));
  }

  updateSelectionField(field: keyof ProposalWizardState['selection'], value: string): void {
    this.state.update((current) => ({
      ...current,
      selection: {
        ...current.selection,
        [field]: value
      }
    }));
  }

  submitForReview(): void {
    if (!this.canSubmitForReview()) {
      return;
    }

    const recommendation = this.state().finalDecision.recommendation;
    const normalizedRecommendation = recommendation ?? 'needs_review';

    if (!this.canSelectRecommendation(normalizedRecommendation)) {
      this.setFinalRecommendation('needs_review');
    }

    if (this.state().finalDecision.recommendation === null) {
      this.setFinalRecommendation('needs_review');
    }

    const submissionTimestamp = new Date().toISOString();
    this.isSubmitting.set(true);
    this.submitErrorMessage.set(null);

    this.submitSelectionDecisionIfNeeded()
      .pipe(
        switchMap(() => this.api.submitDecisionPacket({
          state: this.state(),
          decisionPacket: this.decisionPacket(),
          decisionPreview: this.decisionPreview(),
          submittedBy: this.auth.currentUsername(),
          submittedAtIso: submissionTimestamp
        })),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: (receipt) => {
          this.lastSubmissionReceipt.set(receipt);
          this.lastSubmittedSnapshot.set(this.toSubmissionSnapshot(this.state()));
          this.state.update((current) => ({
            ...current,
            finalDecision: {
              ...current.finalDecision,
              recommendation: current.finalDecision.recommendation ?? 'needs_review',
              submittedForReview: true,
              submittedAtIso: receipt.submittedAtIso
            }
          }));
          this.refreshRecentSubmissions();
        },
        error: (error: unknown) => {
          this.submitErrorMessage.set(this.toErrorMessage(error));
        }
      });
  }

  refreshRecentSubmissions(limit = 10): void {
    this.api.getRecentSubmissions(limit).subscribe({
      next: (response) => {
        this.recentSubmissions.set(response.submissions);
      },
      error: () => {
        this.recentSubmissions.set([]);
      }
    });
  }

  retrySubmission(): void {
    this.submitForReview();
  }

  refreshWorkflowInsights(): void {
    const opportunityId = this.workflowOpportunityId();
    const triagePayload = this.triageRequestPayload();
    const qualificationPayload = this.qualificationRequestPayload();

    if (opportunityId && triagePayload) {
      this.refreshTriage(opportunityId, triagePayload);
    }

    if (opportunityId && qualificationPayload) {
      this.refreshQualification(opportunityId, qualificationPayload);
    }

    const selectionPayload = this.selectionRequestPayload();
    if (opportunityId && selectionPayload) {
      this.refreshSelection(opportunityId, selectionPayload);
    }
  }

  canAdvanceFromCurrentStep(): boolean {
    const step = this.currentStep();
    return this.isStepComplete(step);
  }

  isStepComplete(step: number): boolean {
    return this.getStepValidation(step).isComplete;
  }

  getStepIssues(step: number): string[] {
    return this.getStepValidation(step).issues;
  }

  hasStepIssueContaining(step: number, fragment: string): boolean {
    const needle = fragment.trim().toLowerCase();
    if (!needle) {
      return false;
    }

    return this.getStepIssues(step).some((item) => item.toLowerCase().includes(needle));
  }

  private restoreDraftIfPresent(): void {
    const username = this.auth.currentUsername();
    if (!username) {
      return;
    }

    const raw = window.localStorage.getItem(this.storageKey(username));
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedDraft;
      const isExpired = Date.now() - parsed.updatedAtEpochMs > DRAFT_TTL_MS;
      if (isExpired || parsed.version !== DRAFT_VERSION) {
        window.localStorage.removeItem(this.storageKey(username));
        return;
      }

      this.currentStep.set(Math.max(0, Math.min(parsed.currentStep ?? 0, 3)));
      this.state.set(parsed.state);
      this.restoredFromDraft.set(true);
    } catch {
      window.localStorage.removeItem(this.storageKey(username));
    }
  }

  private storageKey(username: string): string {
    return `hvac-proposal-wizard-${username}`;
  }

  private getStepValidation(step: number): WizardStepValidation {
    const all = this.stepValidations();
    return all[step] ?? { isComplete: false, issues: ['Unknown step.'] };
  }

  private validateStep0(): WizardStepValidation {
    const source = this.state().source;
    const issues: string[] = [];

    if (!source.projectName.trim()) {
      issues.push('Project name is required.');
    }
    if (!source.contractorName.trim()) {
      issues.push('Contractor is required.');
    }
    if (!source.bidDueDate.trim()) {
      issues.push('Bid due date is required.');
    }

    return {
      isComplete: issues.length === 0,
      issues
    };
  }

  private validateStep1(): WizardStepValidation {
    const documents = this.state().documents;
    const issues: string[] = [];

    if (documents.length === 0) {
      issues.push('Upload at least one document.');
    }

    return {
      isComplete: issues.length === 0,
      issues
    };
  }

  private validateStep2(): WizardStepValidation {
    const scope = this.state().scope;
    const selectedCount = [scope.coolingTowers, scope.boilers, scope.pumps, scope.heatExchangers].filter(Boolean).length;
    const issues: string[] = [];

    if (selectedCount === 0) {
      issues.push('Select at least one scope area.');
    }

    return {
      isComplete: issues.length === 0,
      issues
    };
  }

  private validateStep3(): WizardStepValidation {
    const eligibility = this.state().eligibility;
    const assessment = this.computeAssessment();
    const issues: string[] = [];

    if (!eligibility.representedManufacturer.trim()) {
      issues.push('Represented manufacturer is required.');
    }
    if (!eligibility.approvedManufacturersRaw.trim()) {
      issues.push('Approved manufacturer list is required.');
    }
    if (assessment.hasConflict) {
      issues.push('Resolve manufacturer conflict before final decision.');
    }

    return {
      isComplete: issues.length === 0,
      issues
    };
  }

  private inferDocumentType(fileName: string): DocumentType {
    const lower = fileName.toLowerCase();
    if (lower.includes('addendum')) {
      return 'addendum';
    }
    if (lower.includes('spec')) {
      return 'specification';
    }
    if (lower.includes('m') && /m\d{3}/.test(lower)) {
      return 'm_sheet';
    }
    if (lower.includes('invite') || lower.includes('bid')) {
      return 'invitation';
    }
    if (lower.includes('note')) {
      return 'general_note';
    }
    return 'other';
  }

  private computeAssessment(): QualificationPolicyAssessment {
    const current = this.state();
    const missingEvidence: string[] = [];
    const docs = current.documents;

    if (!docs.some((item) => item.type === 'invitation')) {
      missingEvidence.push('Bid invitation is missing.');
    }
    if (!docs.some((item) => item.type === 'm_sheet')) {
      missingEvidence.push('Mechanical schedules (M-sheets) are missing.');
    }
    if (!docs.some((item) => item.type === 'specification')) {
      missingEvidence.push('Division 23 specifications are missing.');
    }
    if (!docs.some((item) => item.type === 'addendum')) {
      missingEvidence.push('No addenda uploaded. Validate whether addenda were issued.');
    }

    const representedManufacturer = current.eligibility.representedManufacturer.trim();
    const approvedManufacturers = this.parseApprovedManufacturers(current.eligibility.approvedManufacturersRaw);

    const hasConflict = representedManufacturer.length > 0
      && approvedManufacturers.length > 0
      && !approvedManufacturers.some((item) => item.toLowerCase() === representedManufacturer.toLowerCase());

    const qualification = this.qualificationPanel().data;
    const qualificationReady = qualification !== null;
    const qualificationAllowsDecision = qualificationReady && qualification.recommendation !== 'needs_review' && qualification.blockers.length === 0;

    return {
      missingEvidence,
      hasConflict,
      representedManufacturer,
      approvedManufacturers,
      canProceedToDecision: missingEvidence.length === 0 && !hasConflict && qualificationAllowsDecision
    };
  }

  private computeDecisionPreview(): ProposalDecisionPreview {
    const assessment = this.computeAssessment();
    const triage = this.triagePanel().data;
    const qualification = this.qualificationPanel().data;
    const selection = this.selectionPanel().data;
    const blockers: string[] = [];

    for (const step of [0, 1, 2, 3]) {
      blockers.push(...this.getStepValidation(step).issues);
    }

    blockers.push(...assessment.missingEvidence);
    if (assessment.hasConflict) {
      blockers.push('Represented manufacturer conflicts with approved manufacturers.');
    }

    if (!triage) {
      blockers.push('Triage scorecard is not ready yet.');
    }

    if (!qualification) {
      blockers.push('BOD qualification panel is not ready yet.');
    }

    if (!selection) {
      blockers.push('Selection workbench is not ready yet.');
    }

    if (this.triagePanel().error) {
      blockers.push(this.triagePanel().error!);
    }

    if (this.qualificationPanel().error) {
      blockers.push(this.qualificationPanel().error!);
    }

    if (this.selectionPanel().error) {
      blockers.push(this.selectionPanel().error!);
    }

    if (triage) {
      blockers.push(...triage.blockers);
    }

    if (qualification) {
      blockers.push(...qualification.blockers);
    }

    if (selection) {
      blockers.push(...selection.blockers);
    }

    const uniqueBlockers = Array.from(new Set(blockers));

    if (triage?.recommendation === 'pass' || qualification?.recommendation === 'no_go') {
      return {
        status: 'no_go',
        rationale: 'Workflow evidence indicates the opportunity should not proceed without escalation.',
        blockers: uniqueBlockers
      };
    }

    if (
      uniqueBlockers.length > 0
      || triage?.recommendation === 'needs_review'
      || qualification?.recommendation === 'needs_review'
      || selection?.overallStatus !== 'aligned'
    ) {
      return {
        status: 'needs_review',
        rationale: 'Workflow signals require reviewer attention before a final recommendation can be approved.',
        blockers: uniqueBlockers
      };
    }

    return {
      status: 'go',
      rationale: 'Triage and BOD qualification both support moving forward on this opportunity.',
      blockers: []
    };
  }

  private computeDecisionPacket(): ProposalDecisionPacket {
    const current = this.state();
    const assessment = this.computeAssessment();
    const scopeSummary = this.selectedScopeLabels();
    const blockers: string[] = [];

    for (const step of [0, 1, 2, 3]) {
      blockers.push(...this.getStepValidation(step).issues);
    }

    blockers.push(...assessment.missingEvidence);
    if (assessment.hasConflict) {
      blockers.push('Represented manufacturer conflicts with approved manufacturers.');
    }
    if (this.selectionPanel().error) {
      blockers.push(this.selectionPanel().error!);
    }
    blockers.push(...(this.selectionPanel().data?.blockers ?? []));

    const docs = current.documents;
    const evidenceSummary = {
      invitationCount: docs.filter((item) => item.type === 'invitation').length,
      mSheetCount: docs.filter((item) => item.type === 'm_sheet').length,
      specificationCount: docs.filter((item) => item.type === 'specification').length,
      addendumCount: docs.filter((item) => item.type === 'addendum').length
    };

    const reasonCodes = this.toReasonCodes(blockers, scopeSummary);

    return {
      evidenceSummary,
      scopeSummary,
      manufacturerEligibility: {
        representedManufacturer: assessment.representedManufacturer,
        approvedManufacturers: assessment.approvedManufacturers,
        isEligible: !assessment.hasConflict && assessment.approvedManufacturers.length > 0
      },
      workflowSummary: {
        triageConfidence: this.triagePanel().data?.confidence ?? null,
        qualificationConfidence: this.qualificationPanel().data?.confidence ?? null,
        selectionConfidence: this.selectionPanel().data?.confidence ?? null,
        triageRecommendation: this.triagePanel().data?.recommendation ?? null,
        qualificationRecommendation: this.qualificationPanel().data?.recommendation ?? null
        ,selectionStatus: this.selectionPanel().data?.overallStatus ?? null
      },
      selectionWorkbench: {
        toolPathModel: current.selection.toolPathModel.trim(),
        manufacturerPathModel: current.selection.manufacturerPathModel.trim(),
        overallStatus: this.selectionPanel().data?.overallStatus ?? null,
        confidence: this.selectionPanel().data?.confidence ?? null,
        deltaCount: this.selectionPanel().data?.deltas.length ?? 0,
        deltas: (this.selectionPanel().data?.deltas ?? []).map((item) => ({
          field: item.field,
          severity: item.severity,
          rationale: item.rationale,
          toolPathValue: item.toolPathValue,
          manufacturerValue: item.manufacturerValue
        }))
      },
      reasonCodes,
      blockers: Array.from(new Set(blockers))
    };
  }

  private toReasonCodes(blockers: string[], scopeSummary: string[]): string[] {
    const codes = new Set<string>();

    if (blockers.some((item) => item.toLowerCase().includes('project name') || item.toLowerCase().includes('contractor') || item.toLowerCase().includes('bid due date'))) {
      codes.add('SRC_METADATA_MISSING');
    }
    if (blockers.some((item) => item.toLowerCase().includes('document'))) {
      codes.add('DOC_UPLOAD_MISSING');
    }
    if (blockers.some((item) => item.toLowerCase().includes('invitation'))) {
      codes.add('EVID_BID_INVITE_MISSING');
    }
    if (blockers.some((item) => item.toLowerCase().includes('m-sheet') || item.toLowerCase().includes('mechanical schedules'))) {
      codes.add('EVID_MSHEET_MISSING');
    }
    if (blockers.some((item) => item.toLowerCase().includes('specification'))) {
      codes.add('EVID_SPEC_MISSING');
    }
    if (blockers.some((item) => item.toLowerCase().includes('addenda'))) {
      codes.add('EVID_ADDENDA_UNVERIFIED');
    }
    if (blockers.some((item) => item.toLowerCase().includes('conflict'))) {
      codes.add('MFG_CONFLICT');
    }
    if (scopeSummary.length === 0) {
      codes.add('SCOPE_UNSELECTED');
    }
    if (scopeSummary.length > 0 && scopeSummary.every((item) => item === 'Heat Exchangers')) {
      codes.add('SCOPE_MVP_OUTSIDE');
    }

    const triage = this.triagePanel().data;
    const qualification = this.qualificationPanel().data;
    const selection = this.selectionPanel().data;

    triage?.reasonCodes.forEach((code) => codes.add(code));
    qualification?.reasonCodes.forEach((code) => codes.add(code));
    selection?.reasonCodes.forEach((code) => codes.add(code));

    if (codes.size === 0) {
      codes.add('READY_FOR_DECISION');
    }

    return Array.from(codes.values());
  }

  private toSubmissionSnapshot(state: ProposalWizardState): string {
    const snapshot = {
      source: state.source,
      documents: state.documents,
      scope: state.scope,
      eligibility: state.eligibility,
      selection: state.selection,
      finalDecision: {
        recommendation: state.finalDecision.recommendation,
        reviewNotes: state.finalDecision.reviewNotes
      }
    };

    return JSON.stringify(snapshot);
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unable to submit decision packet.';
  }

  private parseApprovedManufacturers(rawValue: string): string[] {
    return rawValue
      .split(/\n|,|;/)
      .map((item) => item.trim())
      .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index);
  }

  private buildWorkflowOpportunityId(): string | null {
    const { projectName, projectNumber } = this.state().source;
    const base = projectNumber.trim() || projectName.trim();
    if (!base) {
      return null;
    }

    return base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || null;
  }

  private buildWorkflowCitations(): ProposalWorkflowCitation[] {
    return this.state().documents
      .filter((item) => item.type === 'specification' || item.type === 'addendum')
      .slice(0, 2)
      .map((item, index) => ({
        claimId: `doc-${index + 1}`,
        sourceDocumentId: item.id,
        pageNumber: 1,
        snippet: `${item.name} uploaded for workflow evidence review.`,
        confidence: 0.75
      }));
  }

  private buildTriageRequestPayload() {
    const state = this.state();
    const docs = state.documents;
    const approvedManufacturers = this.approvedManufacturers();

    if (!state.source.projectName.trim() || !state.source.bidDueDate.trim() || docs.length === 0 || !state.eligibility.representedManufacturer.trim()) {
      return null;
    }

    return {
      documentBundleId: docs.map((item) => item.id).join(',').slice(0, 200),
      representedManufacturer: state.eligibility.representedManufacturer.trim(),
      approvedManufacturers,
      bidDueDateIso: state.source.bidDueDate ? `${state.source.bidDueDate}T00:00:00Z` : undefined,
      bodFitScoreHint: state.scope.coolingTowers ? 0.82 : 0.68,
      isIncumbentProject: state.source.bidVisibility === 'basis_of_design',
      isStrategicCustomer: state.source.bidVisibility === 'invited'
    };
  }

  private buildQualificationRequestPayload() {
    const state = this.state();
    const docs = state.documents;
    const approvedManufacturers = this.approvedManufacturers();

    if (!this.buildTriageRequestPayload() || approvedManufacturers.length === 0) {
      return null;
    }

    const citations = this.buildWorkflowCitations();

    return {
      documentBundleId: docs.map((item) => item.id).join(',').slice(0, 200),
      representedManufacturer: state.eligibility.representedManufacturer.trim(),
      approvedManufacturers,
      requiresCitations: citations.length > 0,
      citations
    };
  }

  private buildSelectionComparePayload() {
    const selection = this.state().selection;
    const qualification = this.qualificationPanel().data;

    if (!qualification || !selection.toolPathModel.trim() || !selection.manufacturerPathModel.trim()) {
      return null;
    }

    return {
      toolPathModel: selection.toolPathModel.trim(),
      recommendedToolPathModel: selection.toolPathModel.trim(),
      manufacturerPathModel: selection.manufacturerPathModel.trim(),
      notes: selection.comparisonNotes.trim() || undefined
    };
  }

  private refreshTriage(opportunityId: string, payload: NonNullable<ReturnType<ProposalWizardService['buildTriageRequestPayload']>>): void {
    const version = ++this.triageRequestVersion;
    this.triagePanel.update((current) => ({ ...current, loading: true, error: null }));

    this.api.runTriage(opportunityId, payload).subscribe({
      next: (response) => {
        if (version !== this.triageRequestVersion) {
          return;
        }

        this.triagePanel.set({
          loading: false,
          error: null,
          data: response.triage
        });
      },
      error: () => {
        if (version !== this.triageRequestVersion) {
          return;
        }

        this.triagePanel.set({
          loading: false,
          error: 'Unable to load triage scorecard.',
          data: null
        });
      }
    });
  }

  private refreshQualification(
    opportunityId: string,
    payload: NonNullable<ReturnType<ProposalWizardService['buildQualificationRequestPayload']>>
  ): void {
    const version = ++this.qualificationRequestVersion;
    this.qualificationPanel.update((current) => ({ ...current, loading: true, error: null }));

    this.api.runQualification(opportunityId, payload).subscribe({
      next: (response) => {
        if (version !== this.qualificationRequestVersion) {
          return;
        }

        this.qualificationPanel.set({
          loading: false,
          error: null,
          data: response.qualification
        });
      },
      error: () => {
        if (version !== this.qualificationRequestVersion) {
          return;
        }

        this.qualificationPanel.set({
          loading: false,
          error: 'Unable to load BOD qualification panel.',
          data: null
        });
      }
    });
  }

  private refreshSelection(
    opportunityId: string,
    payload: NonNullable<ReturnType<ProposalWizardService['buildSelectionComparePayload']>>
  ): void {
    const version = ++this.selectionRequestVersion;
    this.selectionPanel.update((current) => ({ ...current, loading: true, error: null }));

    this.api.compareSelection(opportunityId, payload).subscribe({
      next: (response) => {
        if (version !== this.selectionRequestVersion) {
          return;
        }

        this.selectionPanel.set({
          loading: false,
          error: null,
          data: response.selection
        });
      },
      error: () => {
        if (version !== this.selectionRequestVersion) {
          return;
        }

        this.selectionPanel.set({
          loading: false,
          error: 'Unable to load selection workbench.',
          data: null
        });
      }
    });
  }

  private submitSelectionDecisionIfNeeded(): Observable<ProposalWorkflowStageDecisionResponse | null> {
    const opportunityId = this.workflowOpportunityId();
    const selection = this.selectionPanel().data;

    if (!opportunityId || !selection) {
      return of(null);
    }

    const recommendation = this.state().finalDecision.recommendation ?? 'needs_review';
    const rationale = this.state().finalDecision.reviewNotes.trim() || this.decisionPreview().rationale;

    return this.api.submitSelectionDecision(opportunityId, {
      decision: this.mapFinalRecommendationToSelectionDecision(recommendation),
      rationale
    }).pipe(
      switchMap((response) => {
        this.lastSelectionDecision.set(response);
        return of(response);
      })
    );
  }

  private hasWorkflowRecommendationInputs(): boolean {
    return this.triagePanel().data !== null || this.qualificationPanel().data !== null || this.selectionPanel().data !== null;
  }

  private mapFinalRecommendationToSelectionDecision(status: ProposalRecommendationStatus): 'approve' | 'reject' | 'needs_review' {
    if (status === 'go') {
      return 'approve';
    }
    if (status === 'no_go') {
      return 'reject';
    }
    return 'needs_review';
  }
}
