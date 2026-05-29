import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import {
  PROPOSAL_WIZARD_API,
  ProposalWizardApi,
  ProposalWizardSubmissionPayload,
  ProposalWizardSubmissionReceipt
} from './proposal-wizard-api';
import { ProposalDocumentDraft, ProposalWizardService } from './proposal-wizard.service';

class ProposalWizardApiMock implements ProposalWizardApi {
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
}

describe('ProposalWizardService', () => {
  let service: ProposalWizardService;

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
    service.updateEligibilityField('representedManufacturer', 'Marley');
    service.updateEligibilityField('approvedManufacturersRaw', 'Marley, BAC');

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
});
