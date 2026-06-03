import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { ProposalIntakeApi, QualificationDecisionPayload, SelectionDecisionPayload } from '../api/proposal-intake-api';
import { BidOpportunity, IntakeEvent } from '../models/proposals-page.models';
import { MOCK_OPPORTUNITIES } from './proposals-page.mock';

@Injectable({ providedIn: 'root' })
export class ProposalsIntakeMockApiService implements ProposalIntakeApi {
  private readonly opportunities: BidOpportunity[] = structuredClone(MOCK_OPPORTUNITIES);

  getOpportunities(): Observable<BidOpportunity[]> {
    return of(structuredClone(this.opportunities)).pipe(delay(250));
  }

  loadMockPackage(opportunityId: string): Observable<BidOpportunity> {
    const target = this.find(opportunityId);
    if (!target) {
      return throwError(() => new Error('Opportunity not found.'));
    }

    const now = new Date();
    target.docs = [
      {
        id: `mock-${now.getTime()}-1`,
        name: 'Mock_M_Sheets_Intake.pdf',
        kind: 'drawings',
        pages: 42,
        uploadedBy: 'Jordan Lee',
        uploadedAt: now.toISOString()
      },
      {
        id: `mock-${now.getTime()}-2`,
        name: 'Mock_Project_Manual_Div23.pdf',
        kind: 'specs',
        pages: 96,
        uploadedBy: 'Jordan Lee',
        uploadedAt: now.toISOString()
      },
      {
        id: `mock-${now.getTime()}-3`,
        name: 'Mock_Equipment_Schedule.pdf',
        kind: 'schedule',
        pages: 11,
        uploadedBy: 'Jordan Lee',
        uploadedAt: now.toISOString()
      }
    ];
    target.missingItems = [];
    target.intakeStatus = 'ready';
    target.qualificationStatus = 'idle';
    target.qualificationDecision = undefined;
    target.selectionStatus = 'idle';
    target.selectionDecision = undefined;
    if (target.selectionResult) {
      target.selectionResult.manufacturerModel = undefined;
      target.selectionResult.recommendation = 'review';
      target.selectionResult.comparisonChecks = target.selectionResult.comparisonChecks.map((item) => ({
        ...item,
        manufacturerValue: 'Pending'
      }));
    }
    target.events = [
      this.event('Mock package loaded. Intake marked as complete.', 'info', now),
      ...target.events
    ];

    return of(structuredClone(target)).pipe(delay(400));
  }

  resetIntake(opportunityId: string): Observable<BidOpportunity> {
    const target = this.find(opportunityId);
    if (!target) {
      return throwError(() => new Error('Opportunity not found.'));
    }

    const now = new Date();
    target.intakeStatus = 'not_started';
    target.docs = [];
    target.missingItems = ['Bid package not uploaded'];
    target.qualificationStatus = 'idle';
    target.qualificationDecision = undefined;
    target.selectionStatus = 'idle';
    target.selectionDecision = undefined;
    target.events = [
      this.event('Intake reset by user.', 'warning', now),
      ...target.events
    ];

    return of(structuredClone(target)).pipe(delay(300));
  }

  runQualification(opportunityId: string): Observable<BidOpportunity> {
    const target = this.find(opportunityId);
    if (!target) {
      return throwError(() => new Error('Opportunity not found.'));
    }

    if (target.intakeStatus !== 'ready') {
      return throwError(() => new Error('Complete intake before running qualification.'));
    }

    const now = new Date();
    if (!target.qualificationResult) {
      target.qualificationResult = {
        confidenceScore: 0.69,
        recommendation: 'go',
        summary: 'Qualification assistant found relevant scope with moderate confidence.',
        approvedManufacturers: target.approvedManufacturers,
        scopeCandidates: [
          {
            equipmentType: 'Cooling Tower',
            confidence: 0.7,
            notes: 'Scope inferred from uploaded schedule and notes.',
            citations: target.docs.length > 0 ? [`${target.docs[0].name} p.1`] : ['No citation available']
          }
        ],
        reasons: [
          'Equipment category appears in uploaded bid package',
          'Approved manufacturer alignment detected'
        ]
      };
    }

    target.qualificationStatus = 'ready';
    target.events = [
      this.event('Qualification workflow started from intake workspace.', 'info', now),
      this.event('Qualification assistant produced recommendation and evidence set.', 'info', now),
      ...target.events
    ];

    return of(structuredClone(target)).pipe(delay(250));
  }

  approveQualification(opportunityId: string, payload: QualificationDecisionPayload): Observable<BidOpportunity> {
    const target = this.find(opportunityId);
    if (!target) {
      return throwError(() => new Error('Opportunity not found.'));
    }

    const rationale = payload.rationale.trim();
    if (!rationale) {
      return throwError(() => new Error('Decision rationale is required.'));
    }

    const now = new Date();
    target.qualificationDecision = {
      decision: payload.decision,
      rationale,
      decidedBy: 'Taylor Brooks',
      decidedAt: now.toISOString()
    };
    target.qualificationStatus = payload.decision === 'go' ? 'approved' : 'rejected';
    target.events = [
      this.event(`Qualification decision recorded: ${payload.decision === 'go' ? 'GO' : 'NO GO'}.`, 'info', now),
      ...target.events
    ];

    return of(structuredClone(target)).pipe(delay(220));
  }

  runSelection(opportunityId: string): Observable<BidOpportunity> {
    const target = this.find(opportunityId);
    if (!target) {
      return throwError(() => new Error('Opportunity not found.'));
    }

    if (target.qualificationStatus !== 'approved') {
      return throwError(() => new Error('Selection requires an approved GO decision from qualification.'));
    }

    const now = new Date();
    target.selectionStatus = 'ready';
    if (!target.selectionResult) {
      target.selectionResult = {
        toolPathModel: 'Marley NC-8408',
        toolPathSummary: 'Default tool-path output generated for review.',
        comparisonChecks: [
          {
            field: 'Cooling Capacity',
            toolPathValue: '980 tons',
            manufacturerValue: 'Pending',
            severity: 'medium'
          }
        ],
        recommendation: 'review'
      };
    }

    target.events = [
      this.event('Selection assistant generated tool-path model recommendation.', 'info', now),
      ...target.events
    ];

    return of(structuredClone(target)).pipe(delay(280));
  }

  approveSelection(opportunityId: string, payload: SelectionDecisionPayload): Observable<BidOpportunity> {
    const target = this.find(opportunityId);
    if (!target) {
      return throwError(() => new Error('Opportunity not found.'));
    }

    const manufacturerModel = payload.manufacturerModel.trim();
    const rationale = payload.rationale.trim();
    if (!manufacturerModel) {
      return throwError(() => new Error('Manufacturer-path model is required.'));
    }

    if (!rationale) {
      return throwError(() => new Error('Selection decision rationale is required.'));
    }

    const now = new Date();
    const manufacturerCapacity = payload.decision === 'approve' ? '1,250 tons' : '1,180 tons';
    const manufacturerApproach = payload.decision === 'approve' ? '7.0 F' : '8.5 F';

    if (!target.selectionResult) {
      return throwError(() => new Error('Selection result is not available. Run selection first.'));
    }

    target.selectionResult.manufacturerModel = manufacturerModel;
    target.selectionResult.comparisonChecks = target.selectionResult.comparisonChecks.map((check) => {
      if (check.field === 'Cooling Capacity') {
        return {
          ...check,
          manufacturerValue: manufacturerCapacity,
          severity: payload.decision === 'approve' ? 'low' : 'high'
        };
      }

      if (check.field === 'Approach Temperature') {
        return {
          ...check,
          manufacturerValue: manufacturerApproach,
          severity: payload.decision === 'approve' ? 'low' : 'high'
        };
      }

      return check;
    });
    target.selectionResult.recommendation = payload.decision === 'approve' ? 'approve' : 'review';
    target.selectionDecision = {
      decision: payload.decision,
      rationale,
      decidedBy: 'Taylor Brooks',
      decidedAt: now.toISOString()
    };
    target.selectionStatus = payload.decision === 'approve' ? 'approved' : 'rejected';
    target.events = [
      this.event(`Selection decision recorded: ${payload.decision === 'approve' ? 'APPROVE' : 'REJECT'}.`, 'info', now),
      ...target.events
    ];

    return of(structuredClone(target)).pipe(delay(260));
  }

  private find(opportunityId: string): BidOpportunity | undefined {
    return this.opportunities.find((item) => item.id === opportunityId);
  }

  private event(message: string, severity: IntakeEvent['severity'], now: Date): IntakeEvent {
    return {
      id: `evt-${now.getTime()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now.toISOString(),
      message,
      severity
    };
  }
}
