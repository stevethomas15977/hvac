import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from '../core/config/runtime-config.service';
import {
  ProposalWizardApi,
  ProposalWizardSubmissionPayload,
  ProposalWizardSubmissionReceipt
} from './proposal-wizard-api';

@Injectable({ providedIn: 'root' })
export class ProposalWizardHttpApiService implements ProposalWizardApi {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpClient,
    runtimeConfig: RuntimeConfigService
  ) {
    const configuredBaseUrl = runtimeConfig.config.app.proposalWizardApiBaseUrl ?? '';
    this.baseUrl = `${configuredBaseUrl}/api/proposals/wizard`;
  }

  submitDecisionPacket(payload: ProposalWizardSubmissionPayload): Observable<ProposalWizardSubmissionReceipt> {
    return this.http.post<ProposalWizardSubmissionReceipt>(`${this.baseUrl}/submissions`, payload);
  }
}
