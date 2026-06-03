import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RuntimeConfigService } from '../../../../core/config/runtime-config.service';
import {
  ProposalWizardApi,
  ProposalWorkflowQualificationRunRequest,
  ProposalWorkflowQualificationRunResponse,
  ProposalWorkflowSelectionCompareRequest,
  ProposalWorkflowSelectionCompareResponse,
  ProposalWorkflowSelectionDecisionRequest,
  ProposalWorkflowStageDecisionResponse,
  ProposalWizardRecentSubmissionsResponse,
  ProposalWizardSubmissionPayload,
  ProposalWizardSubmissionReceipt,
  ProposalWorkflowTriageRunRequest,
  ProposalWorkflowTriageRunResponse
} from '../api/proposal-wizard-api';

@Injectable({ providedIn: 'root' })
export class ProposalWizardHttpApiService implements ProposalWizardApi {
  private readonly baseUrl: string;
  private readonly workflowBaseUrl: string;

  constructor(
    private readonly http: HttpClient,
    runtimeConfig: RuntimeConfigService
  ) {
    const configuredBaseUrl = runtimeConfig.config.app.proposalWizardApiBaseUrl ?? '';
    this.baseUrl = `${configuredBaseUrl}/api/proposals/wizard`;
    this.workflowBaseUrl = `${configuredBaseUrl}/api/proposals/workflow`;
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

  runTriage(opportunityId: string, payload: ProposalWorkflowTriageRunRequest): Observable<ProposalWorkflowTriageRunResponse> {
    return this.withAuthHeaders((headers) =>
      this.http.post<ProposalWorkflowTriageRunResponse>(
        `${this.workflowBaseUrl}/opportunities/${encodeURIComponent(opportunityId)}/triage/run`,
        payload,
        { headers }
      )
    );
  }

  runQualification(
    opportunityId: string,
    payload: ProposalWorkflowQualificationRunRequest
  ): Observable<ProposalWorkflowQualificationRunResponse> {
    return this.withAuthHeaders((headers) =>
      this.http.post<ProposalWorkflowQualificationRunResponse>(
        `${this.workflowBaseUrl}/opportunities/${encodeURIComponent(opportunityId)}/qualification/run`,
        payload,
        { headers }
      )
    );
  }

  compareSelection(
    opportunityId: string,
    payload: ProposalWorkflowSelectionCompareRequest
  ): Observable<ProposalWorkflowSelectionCompareResponse> {
    return this.withAuthHeaders((headers) =>
      this.http.post<ProposalWorkflowSelectionCompareResponse>(
        `${this.workflowBaseUrl}/opportunities/${encodeURIComponent(opportunityId)}/selection/compare`,
        payload,
        { headers }
      )
    );
  }

  submitSelectionDecision(
    opportunityId: string,
    payload: ProposalWorkflowSelectionDecisionRequest
  ): Observable<ProposalWorkflowStageDecisionResponse> {
    return this.withAuthHeaders((headers) =>
      this.http.post<ProposalWorkflowStageDecisionResponse>(
        `${this.workflowBaseUrl}/opportunities/${encodeURIComponent(opportunityId)}/selection/decision`,
        payload,
        { headers }
      )
    );
  }

  private withAuthHeaders<T>(requestFactory: (headers: HttpHeaders | undefined) => Observable<T>): Observable<T> {
    return from(import('aws-amplify/auth').then(({ fetchAuthSession }) => fetchAuthSession())).pipe(
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
