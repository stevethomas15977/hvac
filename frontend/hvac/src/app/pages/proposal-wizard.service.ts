import { Inject, Injectable, Injector, computed, effect, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { PROPOSAL_WIZARD_API, ProposalWizardApi, ProposalWizardSubmissionReceipt } from './proposal-wizard-api';

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
  reasonCodes: string[];
  blockers: string[];
}

const DRAFT_VERSION = 1;
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
      coolingTowers: true,
      boilers: false,
      pumps: false,
      heatExchangers: false
    },
    eligibility: {
      representedManufacturer: 'Marley',
      approvedManufacturersRaw: ''
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

  readonly stepValidations = computed<Record<number, WizardStepValidation>>(() => ({
    0: this.validateStep0(),
    1: this.validateStep1(),
    2: this.validateStep2(),
    3: this.validateStep3()
  }));

  readonly decisionPreview = computed<ProposalDecisionPreview>(() => this.computeDecisionPreview());
  readonly decisionPacket = computed<ProposalDecisionPacket>(() => this.computeDecisionPacket());
  readonly hasChangesSinceLastSubmission = computed(() => {
    const previous = this.lastSubmittedSnapshot();
    if (!previous) {
      return true;
    }

    return previous !== this.toSubmissionSnapshot(this.state());
  });
  readonly canSubmitForReview = computed(() => !this.isSubmitting() && (this.lastSubmissionReceipt() === null || this.hasChangesSinceLastSubmission()));

  private hasInitialized = false;

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
  }

  canSelectRecommendation(status: ProposalRecommendationStatus): boolean {
    if (status === 'needs_review') {
      return true;
    }

    return this.assessment().canProceedToDecision;
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

    this.api
      .submitDecisionPacket({
        state: this.state(),
        decisionPacket: this.decisionPacket(),
        decisionPreview: this.decisionPreview(),
        submittedBy: this.auth.currentUsername(),
        submittedAtIso: submissionTimestamp
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
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
        },
        error: (error: unknown) => {
          this.submitErrorMessage.set(this.toErrorMessage(error));
        }
      });
  }

  retrySubmission(): void {
    this.submitForReview();
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
    const approvedManufacturers = current.eligibility.approvedManufacturersRaw
      .split(/\n|,|;/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const hasConflict = representedManufacturer.length > 0
      && approvedManufacturers.length > 0
      && !approvedManufacturers.some((item) => item.toLowerCase() === representedManufacturer.toLowerCase());

    return {
      missingEvidence,
      hasConflict,
      representedManufacturer,
      approvedManufacturers,
      canProceedToDecision: missingEvidence.length === 0 && !hasConflict
    };
  }

  private computeDecisionPreview(): ProposalDecisionPreview {
    const state = this.state();
    const assessment = this.computeAssessment();
    const blockers: string[] = [];

    for (const step of [0, 1, 2, 3]) {
      blockers.push(...this.getStepValidation(step).issues);
    }

    blockers.push(...assessment.missingEvidence);
    if (assessment.hasConflict) {
      blockers.push('Represented manufacturer conflicts with approved manufacturers.');
    }

    const hasMvpScope = state.scope.coolingTowers || state.scope.boilers || state.scope.pumps;
    const onlyOutOfScopeSelection = !hasMvpScope && state.scope.heatExchangers;
    if (onlyOutOfScopeSelection) {
      return {
        status: 'no_go',
        rationale: 'Only out-of-scope equipment was selected for the MVP.',
        blockers: ['Heat exchangers are tracked but not eligible for MVP automation decisions.']
      };
    }

    if (blockers.length > 0) {
      return {
        status: 'needs_review',
        rationale: 'Required evidence is incomplete or conflicting; final recommendation is blocked.',
        blockers
      };
    }

    return {
      status: 'go',
      rationale: 'Current draft has required MVP scope and no evidence conflicts.',
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
      reasonCodes,
      blockers
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
}
