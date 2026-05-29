import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  ProposalWizardApi,
  ProposalWizardSubmissionPayload,
  ProposalWizardSubmissionReceipt
} from './proposal-wizard-api';

@Injectable({ providedIn: 'root' })
export class ProposalWizardMockApiService implements ProposalWizardApi {
  submitDecisionPacket(payload: ProposalWizardSubmissionPayload): Observable<ProposalWizardSubmissionReceipt> {
    const recommendation = payload.state.finalDecision.recommendation ?? payload.decisionPreview.status;
    const receipt: ProposalWizardSubmissionReceipt = {
      submissionId: `mock-sub-${Date.now()}`,
      status: 'submitted',
      reviewQueue: 'tenant-review',
      recommendation,
      submittedAtIso: payload.submittedAtIso
    };

    return of(receipt).pipe(delay(400));
  }
}
