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

export interface ProposalWizardApi {
  submitDecisionPacket(payload: ProposalWizardSubmissionPayload): Observable<ProposalWizardSubmissionReceipt>;
}

export const PROPOSAL_WIZARD_API = new InjectionToken<ProposalWizardApi>('PROPOSAL_WIZARD_API');
