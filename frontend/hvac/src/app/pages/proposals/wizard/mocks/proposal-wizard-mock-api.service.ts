import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  ProposalWizardApi,
  ProposalWorkflowPolicyCheck,
  ProposalWorkflowQualificationRunRequest,
  ProposalWorkflowQualificationRunResponse,
  ProposalWorkflowSelectionCompareRequest,
  ProposalWorkflowSelectionCompareResponse,
  ProposalWorkflowSelectionDecisionRequest,
  ProposalWorkflowStageDecisionResponse,
  ProposalWizardRecentSubmission,
  ProposalWizardRecentSubmissionsResponse,
  ProposalWizardSubmissionPayload,
  ProposalWizardSubmissionReceipt,
  ProposalWorkflowTriageRunRequest,
  ProposalWorkflowTriageRunResponse
} from '../api/proposal-wizard-api';

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

  runTriage(opportunityId: string, payload: ProposalWorkflowTriageRunRequest): Observable<ProposalWorkflowTriageRunResponse> {
    const approved = payload.approvedManufacturers.map((item) => item.toLowerCase());
    const represented = payload.representedManufacturer.toLowerCase();
    const fit: ProposalWorkflowTriageRunResponse['triage']['manufacturerFit'] = approved.includes(represented)
      ? 'fit'
      : (approved.some((item) => item.includes(represented) || represented.includes(item)) ? 'partial' : 'conflict');
    const recommendation: ProposalWorkflowTriageRunResponse['triage']['recommendation'] = fit === 'conflict' ? 'pass' : 'pursue';
    const dueDateRisk: ProposalWorkflowTriageRunResponse['triage']['dueDateRisk'] = 'medium';

    return of({
      opportunityId,
      triage: {
        recommendation,
        winProbability: recommendation === 'pursue' ? 0.78 : 0.41,
        bodFitScore: payload.bodFitScoreHint ?? (fit === 'fit' ? 0.82 : 0.56),
        dueDateRisk,
        manufacturerFit: fit,
        confidence: recommendation === 'pursue' ? 0.84 : 0.58,
        reasonCodes: recommendation === 'pursue' ? ['MANUFACTURER_FIT', 'TRIAGE_READY'] : ['MANUFACTURER_CONFLICT'],
        blockers: recommendation === 'pursue' ? [] : ['Represented manufacturer is not in approved list.'],
        generatedAtIso: new Date().toISOString(),
        generatedBy: 'mock-triage-engine'
      }
    }).pipe(delay(250));
  }

  runQualification(
    opportunityId: string,
    payload: ProposalWorkflowQualificationRunRequest
  ): Observable<ProposalWorkflowQualificationRunResponse> {
    const approved = payload.approvedManufacturers.map((item) => item.toLowerCase());
    const represented = payload.representedManufacturer.toLowerCase();
    const eligible = approved.includes(represented);
    const citations = payload.citations ?? [];
    const recommendation: ProposalWorkflowQualificationRunResponse['qualification']['recommendation'] = eligible ? 'go' : 'no_go';
    const overlapStatus: ProposalWorkflowQualificationRunResponse['qualification']['overlapStatus'] = eligible ? 'eligible' : 'conflict';
    const policyChecks: ProposalWorkflowPolicyCheck[] = [
      {
        code: 'MANUFACTURER_OVERLAP',
        status: eligible ? 'pass' : 'fail',
        message: eligible
          ? 'Represented manufacturer is present in approved manufacturer list.'
          : 'Represented manufacturer is not present in approved manufacturer list.'
      },
      {
        code: 'CITATION_COVERAGE',
        status: citations.length > 0 ? 'pass' : (payload.requiresCitations ? 'fail' : 'warning'),
        message: citations.length > 0
          ? 'Citations are present.'
          : (payload.requiresCitations ? 'Required citations are missing.' : 'No citations provided.')
      }
    ];

    return of({
      opportunityId,
      qualification: {
        recommendation,
        confidence: eligible ? 0.83 : 0.53,
        representedManufacturer: payload.representedManufacturer,
        detectedManufacturers: payload.approvedManufacturers,
        overlapStatus,
        policyChecks,
        citations,
        reasonCodes: eligible ? ['MANUFACTURER_MATCH'] : ['MANUFACTURER_CONFLICT'],
        blockers: eligible ? [] : ['Represented manufacturer missing from approved list.'],
        generatedAtIso: new Date().toISOString()
      }
    }).pipe(delay(250));
  }

  compareSelection(
    opportunityId: string,
    payload: ProposalWorkflowSelectionCompareRequest
  ): Observable<ProposalWorkflowSelectionCompareResponse> {
    const toolPathModel = (payload.toolPathModel ?? payload.recommendedToolPathModel ?? '').trim();
    const manufacturerPathModel = payload.manufacturerPathModel.trim();
    const aligned = toolPathModel.localeCompare(manufacturerPathModel, undefined, { sensitivity: 'accent' }) === 0;
    const overallStatus: ProposalWorkflowSelectionCompareResponse['selection']['overallStatus'] = aligned ? 'aligned' : 'needs_review';
    const deltas = aligned
      ? []
      : [
          {
            field: 'model',
            toolPathValue: toolPathModel,
            manufacturerValue: manufacturerPathModel,
            severity: 'critical' as const,
            rationale: 'Manufacturer path model differs from tool-path recommendation.',
            citations: []
          }
        ];

    return of({
      opportunityId,
      selection: {
        toolPathModel,
        manufacturerPathModel,
        overallStatus,
        confidence: aligned ? 0.87 : 0.57,
        deltas,
        reasonCodes: aligned ? ['MODEL_ALIGNED'] : ['MODEL_MISMATCH'],
        blockers: aligned ? [] : ['Critical model mismatch requires reviewer approval before final selection.'],
        generatedAtIso: new Date().toISOString()
      }
    }).pipe(delay(250));
  }

  submitSelectionDecision(
    opportunityId: string,
    payload: ProposalWorkflowSelectionDecisionRequest
  ): Observable<ProposalWorkflowStageDecisionResponse> {
    const stage: ProposalWorkflowStageDecisionResponse['stage'] = 'selection';

    return of({
      opportunityId,
      stage,
      decision: payload.decision,
      rationale: payload.rationale,
      decidedBy: 'local.estimator',
      decidedAtIso: new Date().toISOString()
    }).pipe(delay(200));
  }
}
