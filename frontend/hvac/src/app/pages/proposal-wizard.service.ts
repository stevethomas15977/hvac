import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth/auth.service';

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
    }
  };
}

@Injectable({ providedIn: 'root' })
export class ProposalWizardService {
  private readonly auth = inject(AuthService);

  readonly state = signal<ProposalWizardState>(defaultState());
  readonly currentStep = signal(0);
  readonly restoredFromDraft = signal(false);

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

  private hasInitialized = false;

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
    });
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
}
