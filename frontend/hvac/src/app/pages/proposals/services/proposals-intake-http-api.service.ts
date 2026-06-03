import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProposalIntakeApi, QualificationDecisionPayload, SelectionDecisionPayload } from '../api/proposal-intake-api';
import { BidOpportunity } from '../models/proposals-page.models';

@Injectable({ providedIn: 'root' })
export class ProposalsIntakeHttpApiService implements ProposalIntakeApi {
  private readonly baseUrl = '/api/proposals/intake';

  constructor(private readonly http: HttpClient) {}

  getOpportunities(): Observable<BidOpportunity[]> {
    return this.http.get<BidOpportunity[]>(`${this.baseUrl}/opportunities`);
  }

  loadMockPackage(opportunityId: string): Observable<BidOpportunity> {
    return this.http.post<BidOpportunity>(`${this.baseUrl}/opportunities/${opportunityId}/load-mock-package`, {});
  }

  resetIntake(opportunityId: string): Observable<BidOpportunity> {
    return this.http.post<BidOpportunity>(`${this.baseUrl}/opportunities/${opportunityId}/reset`, {});
  }

  runQualification(opportunityId: string): Observable<BidOpportunity> {
    return this.http.post<BidOpportunity>(`${this.baseUrl}/opportunities/${opportunityId}/run-qualification`, {});
  }

  approveQualification(opportunityId: string, payload: QualificationDecisionPayload): Observable<BidOpportunity> {
    return this.http.post<BidOpportunity>(`${this.baseUrl}/opportunities/${opportunityId}/qualification/decision`, payload);
  }

  runSelection(opportunityId: string): Observable<BidOpportunity> {
    return this.http.post<BidOpportunity>(`${this.baseUrl}/opportunities/${opportunityId}/selection/run`, {});
  }

  approveSelection(opportunityId: string, payload: SelectionDecisionPayload): Observable<BidOpportunity> {
    return this.http.post<BidOpportunity>(`${this.baseUrl}/opportunities/${opportunityId}/selection/decision`, payload);
  }
}
