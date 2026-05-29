import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { fetchAuthSession } from 'aws-amplify/auth';
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
    return from(fetchAuthSession()).pipe(
      switchMap((session) => {
        const idToken = session.tokens?.idToken?.toString();
        const headers = idToken
          ? new HttpHeaders({
              Authorization: `Bearer ${idToken}`
            })
          : undefined;

        return this.http.post<ProposalWizardSubmissionReceipt>(`${this.baseUrl}/submissions`, payload, {
          headers
        });
      })
    );
  }
}
