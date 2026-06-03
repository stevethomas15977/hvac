import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  PROPOSAL_WIZARD_API,
  ProposalWizardApi,
  ProposalWorkflowQualificationRunResponse,
  ProposalWorkflowSelectionCompareResponse,
  ProposalWorkflowStageDecisionResponse,
  ProposalWizardRecentSubmissionsResponse,
  ProposalWizardSubmissionPayload,
  ProposalWizardSubmissionReceipt,
  ProposalWorkflowTriageRunResponse
} from '../api/proposal-wizard-api';
import { ProposalDocumentDraft, ProposalWizardService } from './proposal-wizard.service';

class ProposalWizardApiMock implements ProposalWizardApi {
  selectionDecisionCount = 0;

  submitDecisionPacket(payload: ProposalWizardSubmissionPayload) {
    const response: ProposalWizardSubmissionReceipt = {
      submissionId: 'test-sub-1',
      status: 'submitted',
      reviewQueue: 'tenant-review',
      recommendation: payload.state.finalDecision.recommendation ?? 'needs_review',
      submittedAtIso: payload.submittedAtIso
    };

    return of(response);
  }

  getRecentSubmissions() {
    const response: ProposalWizardRecentSubmissionsResponse = {
      tenantId: 'development',
      count: 0,
      submissions: []
    };

    return of(response);
  }

  runTriage(): ReturnType<ProposalWizardApi['runTriage']> {
    const response: ProposalWorkflowTriageRunResponse = {
      opportunityId: 'alpha-project',
      triage: {
        recommendation: 'pursue',
        winProbability: 0.81,
        bodFitScore: 0.84,
        dueDateRisk: 'low',
        manufacturerFit: 'fit',
        confidence: 0.86,
        reasonCodes: ['MANUFACTURER_FIT', 'TRIAGE_READY'],
        blockers: [],
        generatedAtIso: new Date().toISOString(),
        generatedBy: 'spec-mock'
      }
    };

    return of(response);
  }

  runQualification(): ReturnType<ProposalWizardApi['runQualification']> {
    const response: ProposalWorkflowQualificationRunResponse = {
      opportunityId: 'alpha-project',
      qualification: {
        recommendation: 'go',
        confidence: 0.88,
        representedManufacturer: 'Marley',
        detectedManufacturers: ['Marley', 'BAC'],
        overlapStatus: 'eligible',
        policyChecks: [
          {
            code: 'MANUFACTURER_OVERLAP',
            status: 'pass',
            message: 'Represented manufacturer is present in approved manufacturer list.'
          }
        ],
        citations: [
          {
            claimId: 'doc-1',
            sourceDocumentId: '3',
            pageNumber: 1,
            snippet: 'spec.pdf uploaded for workflow evidence review.',
            confidence: 0.75
          }
        ],
        reasonCodes: ['MANUFACTURER_MATCH'],
        blockers: [],
        generatedAtIso: new Date().toISOString()
      }
    };

    return of(response);
  }

  compareSelection(): ReturnType<ProposalWizardApi['compareSelection']> {
    const response: ProposalWorkflowSelectionCompareResponse = {
      opportunityId: 'alpha-project',
      selection: {
        toolPathModel: 'NC840S',
        manufacturerPathModel: 'NC840S',
        overallStatus: 'aligned',
        confidence: 0.89,
        deltas: [],
        reasonCodes: ['MODEL_ALIGNED'],
        blockers: [],
        generatedAtIso: new Date().toISOString()
      }
    };

    return of(response);
  }

  submitSelectionDecision(): ReturnType<ProposalWizardApi['submitSelectionDecision']> {
    this.selectionDecisionCount += 1;

    const response: ProposalWorkflowStageDecisionResponse = {
      opportunityId: 'alpha-project',
      stage: 'selection',
      decision: 'approve',
      rationale: 'Selection aligned.',
      decidedBy: 'test.user',
      decidedAtIso: new Date().toISOString()
    };

    return of(response);
  }
}

describe('ProposalWizardService', () => {
  let service: ProposalWizardService;
  let apiMock: ProposalWizardApiMock;

  beforeEach(() => {
    localStorage.removeItem('hvac-proposal-wizard-test.user');

    TestBed.configureTestingModule({
      providers: [
        ProposalWizardService,
        {
          provide: AuthService,
          useValue: {
            currentUsername: signal<string | null>('test.user')
          }
        },
        {
          provide: PROPOSAL_WIZARD_API,
          useClass: ProposalWizardApiMock
        }
      ]
    });

    service = TestBed.inject(ProposalWizardService);
    apiMock = TestBed.inject(PROPOSAL_WIZARD_API) as unknown as ProposalWizardApiMock;
    service.initialize();
  });

  afterEach(() => {
    localStorage.removeItem('hvac-proposal-wizard-test.user');
  });

  it('forces needs_review when go is selected with missing evidence', () => {
    expect(service.canSelectRecommendation('go')).toBeFalse();

    const accepted = service.setFinalRecommendation('go');

    expect(accepted).toBeFalse();
    expect(service.state().finalDecision.recommendation).toBe('needs_review');
  });

  it('allows go when all required evidence is present and eligibility is aligned', () => {
    const docs: ProposalDocumentDraft[] = [
      { id: '1', name: 'invite.pdf', sizeBytes: 1000, type: 'invitation' },
      { id: '2', name: 'm401.pdf', sizeBytes: 1000, type: 'm_sheet' },
      { id: '3', name: 'spec.pdf', sizeBytes: 1000, type: 'specification' },
      { id: '4', name: 'addendum-01.pdf', sizeBytes: 1000, type: 'addendum' }
    ];

    service.updateSourceField('projectName', 'Alpha Project');
    service.updateSourceField('contractorName', 'ACME Mechanical');
    service.updateSourceField('bidDueDate', '2026-06-15');
    service.state.update((current) => ({ ...current, documents: docs }));
    service.updateScopeField('coolingTowers', true);
    service.updateEligibilityField('representedManufacturer', 'Marley');
    service.updateEligibilityField('approvedManufacturersRaw', 'Marley, BAC');
    service.updateSelectionField('toolPathModel', 'NC840S');
    service.updateSelectionField('manufacturerPathModel', 'NC840S');
    service.refreshWorkflowInsights();
    service.refreshWorkflowInsights();

    expect(service.canSelectRecommendation('go')).toBeTrue();
    expect(service.decisionPreview().status).toBe('go');
  });

  it('prevents duplicate submit unless changes occur after a successful submit', () => {
    service.submitForReview();

    expect(service.lastSubmissionReceipt()).not.toBeNull();
    expect(service.canSubmitForReview()).toBeFalse();

    service.updateReviewNotes('Changed after submit');

    expect(service.hasChangesSinceLastSubmission()).toBeTrue();
    expect(service.canSubmitForReview()).toBeTrue();
  });

  it('clears unload warning after submit and re-enables warning on later edits', () => {
    service.updateSourceField('projectName', 'Dirty Draft');
    expect(service.shouldWarnBeforeUnload()).toBeTrue();

    service.submitForReview();
    expect(service.shouldWarnBeforeUnload()).toBeFalse();

    service.updateReviewNotes('post-submit change');
    expect(service.shouldWarnBeforeUnload()).toBeTrue();
  });

  it('stores a selection decision before the review submission when selection data is available', () => {
    const docs: ProposalDocumentDraft[] = [
      { id: '1', name: 'invite.pdf', sizeBytes: 1000, type: 'invitation' },
      { id: '2', name: 'm401.pdf', sizeBytes: 1000, type: 'm_sheet' },
      { id: '3', name: 'spec.pdf', sizeBytes: 1000, type: 'specification' },
      { id: '4', name: 'addendum-01.pdf', sizeBytes: 1000, type: 'addendum' }
    ];

    service.updateSourceField('projectName', 'Alpha Project');
    service.updateSourceField('contractorName', 'ACME Mechanical');
    service.updateSourceField('bidDueDate', '2026-06-15');
    service.state.update((current) => ({ ...current, documents: docs }));
    service.updateScopeField('coolingTowers', true);
    service.updateEligibilityField('representedManufacturer', 'Marley');
    service.updateEligibilityField('approvedManufacturersRaw', 'Marley, BAC');
    service.updateSelectionField('toolPathModel', 'NC840S');
    service.updateSelectionField('manufacturerPathModel', 'NC840S');
    service.refreshWorkflowInsights();
    service.refreshWorkflowInsights();
    service.setFinalRecommendation('go');
    service.updateReviewNotes('Selection aligned with manufacturer path.');

    service.submitForReview();

    expect(apiMock.selectionDecisionCount).toBe(1);
    expect(service.lastSelectionDecision()).not.toBeNull();
  });
});
