import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  ProposalWizardApi,
  ProposalWizardRecentSubmission,
  ProposalWizardRecentSubmissionsResponse,
  ProposalWizardSubmissionPayload,
  ProposalWizardSubmissionReceipt
} from './proposal-wizard-api';

@Injectable({ providedIn: 'root' })
export class ProposalWizardMockApiService implements ProposalWizardApi {
  private recentSubmissions: ProposalWizardRecentSubmission[] = [];

  submitDecisionPacket(payload: ProposalWizardSubmissionPayload): Observable<ProposalWizardSubmissionReceipt> {
    const recommendation = payload.state.finalDecision.recommendation ?? payload.decisionPreview.status;
    const submissionId = `mock-sub-${Date.now()}`;
    const receipt: ProposalWizardSubmissionReceipt = {
      submissionId,
      status: 'submitted',
      reviewQueue: 'tenant-review',
      recommendation,
      submittedAtIso: payload.submittedAtIso
    };

    const recent: ProposalWizardRecentSubmission = {
      submissionId,
      tenantId: 'development',
      submittedBy: payload.submittedBy ?? 'local.estimator',
      recommendation,
      status: recommendation === 'needs_review' ? 'needs_review' : 'submitted',
      submittedAtIso: payload.submittedAtIso,
      projectName: payload.state.source.projectName,
      projectNumber: payload.state.source.projectNumber
    };

    this.recentSubmissions = [recent, ...this.recentSubmissions].slice(0, 25);

    return of(receipt).pipe(delay(400));
  }

  getRecentSubmissions(limit = 10): Observable<ProposalWizardRecentSubmissionsResponse> {
    const normalizedLimit = Math.max(1, Math.min(limit, 25));
    return of({
      tenantId: 'development',
      count: Math.min(this.recentSubmissions.length, normalizedLimit),
      submissions: this.recentSubmissions.slice(0, normalizedLimit)
    }).pipe(delay(200));
  }
}
