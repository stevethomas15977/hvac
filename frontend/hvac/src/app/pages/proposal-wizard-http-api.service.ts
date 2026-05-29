import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProposalWizardApi,
  ProposalWizardSubmissionPayload,
  ProposalWizardSubmissionReceipt
} from './proposal-wizard-api';

@Injectable({ providedIn: 'root' })
export class ProposalWizardHttpApiService implements ProposalWizardApi {
  private readonly baseUrl = '/api/proposals/wizard';

  constructor(private readonly http: HttpClient) {}

  submitDecisionPacket(payload: ProposalWizardSubmissionPayload): Observable<ProposalWizardSubmissionReceipt> {
    return this.http.post<ProposalWizardSubmissionReceipt>(`${this.baseUrl}/submissions`, payload);
  }
}
