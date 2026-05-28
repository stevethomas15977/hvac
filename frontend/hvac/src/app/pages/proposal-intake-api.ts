import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { BidOpportunity } from './proposals-page.models';

export interface QualificationDecisionPayload {
  decision: 'go' | 'no_go';
  rationale: string;
}

export interface SelectionDecisionPayload {
  manufacturerModel: string;
  decision: 'approve' | 'reject';
  rationale: string;
}

export interface ProposalIntakeApi {
  getOpportunities(): Observable<BidOpportunity[]>;
  loadMockPackage(opportunityId: string): Observable<BidOpportunity>;
  resetIntake(opportunityId: string): Observable<BidOpportunity>;
  runQualification(opportunityId: string): Observable<BidOpportunity>;
  approveQualification(opportunityId: string, payload: QualificationDecisionPayload): Observable<BidOpportunity>;
  runSelection(opportunityId: string): Observable<BidOpportunity>;
  approveSelection(opportunityId: string, payload: SelectionDecisionPayload): Observable<BidOpportunity>;
}

export const PROPOSAL_INTAKE_API = new InjectionToken<ProposalIntakeApi>('PROPOSAL_INTAKE_API');
