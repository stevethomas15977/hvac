import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { fetchAuthSession } from 'aws-amplify/auth';
import { RuntimeConfigService } from '../core/config/runtime-config.service';
import {
  ProposalWizardApi,
  ProposalWizardRecentSubmissionsResponse,
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
    return this.withAuthHeaders((headers) =>
      this.http.post<ProposalWizardSubmissionReceipt>(`${this.baseUrl}/submissions`, payload, {
        headers
      })
    );
  }

  getRecentSubmissions(limit = 10): Observable<ProposalWizardRecentSubmissionsResponse> {
    const normalizedLimit = Math.max(1, Math.min(limit, 25));
    return this.withAuthHeaders((headers) =>
      this.http.get<ProposalWizardRecentSubmissionsResponse>(`${this.baseUrl}/submissions/recent?limit=${normalizedLimit}`, {
        headers
      })
    );
  }

  private withAuthHeaders<T>(requestFactory: (headers: HttpHeaders | undefined) => Observable<T>): Observable<T> {
    return from(fetchAuthSession()).pipe(
      switchMap((session) => {
        const idToken = session.tokens?.idToken?.toString();
        const headers = idToken
          ? new HttpHeaders({
              Authorization: `Bearer ${idToken}`
            })
          : undefined;

        return requestFactory(headers);
      })
    );
  }
}
