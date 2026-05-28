import { computed, Inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { PROPOSAL_INTAKE_API, ProposalIntakeApi, QualificationDecisionPayload, SelectionDecisionPayload } from './proposal-intake-api';
import { BidOpportunity } from './proposals-page.models';

@Injectable({ providedIn: 'root' })
export class ProposalsIntakeService {
  readonly opportunities = signal<BidOpportunity[]>([]);
  readonly selectedOpportunityId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly selectedOpportunity = computed<BidOpportunity | null>(() => {
    const selectedId = this.selectedOpportunityId();
    if (!selectedId) {
      return null;
    }

    return this.opportunities().find((item) => item.id === selectedId) ?? null;
  });

  constructor(@Inject(PROPOSAL_INTAKE_API) private readonly api: ProposalIntakeApi) {}

  initialize(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api
      .getOpportunities()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (items) => {
          this.opportunities.set(items);
          if (items.length > 0 && !this.selectedOpportunityId()) {
            this.selectedOpportunityId.set(items[0].id);
          }
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.toErrorMessage(error));
        }
      });
  }

  selectOpportunity(id: string): void {
    this.selectedOpportunityId.set(id);
    this.errorMessage.set(null);
  }

  loadMockPackage(): void {
    this.updateSelected((opportunityId) => this.api.loadMockPackage(opportunityId));
  }

  resetIntake(): void {
    this.updateSelected((opportunityId) => this.api.resetIntake(opportunityId));
  }

  runQualification(): void {
    const selectedId = this.selectedOpportunityId();
    if (selectedId) {
      const nextItems = this.opportunities().map((item) => {
        if (item.id !== selectedId) {
          return item;
        }

        return {
          ...item,
          qualificationStatus: 'running' as const
        };
      });
      this.opportunities.set(nextItems);
    }

    this.updateSelected((opportunityId) => this.api.runQualification(opportunityId));
  }

  approveQualification(payload: QualificationDecisionPayload): void {
    this.updateSelected((opportunityId) => this.api.approveQualification(opportunityId, payload));
  }

  runSelection(): void {
    const selectedId = this.selectedOpportunityId();
    if (selectedId) {
      const nextItems = this.opportunities().map((item) => {
        if (item.id !== selectedId) {
          return item;
        }

        return {
          ...item,
          selectionStatus: 'running' as const
        };
      });
      this.opportunities.set(nextItems);
    }

    this.updateSelected((opportunityId) => this.api.runSelection(opportunityId));
  }

  approveSelection(payload: SelectionDecisionPayload): void {
    this.updateSelected((opportunityId) => this.api.approveSelection(opportunityId, payload));
  }

  setErrorMessage(message: string): void {
    this.errorMessage.set(message);
  }

  private updateSelected(action: (opportunityId: string) => ReturnType<ProposalIntakeApi['runQualification']>): void {
    const selectedId = this.selectedOpportunityId();
    if (!selectedId) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    action(selectedId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (updated) => {
          const nextItems = this.opportunities().map((item) => (item.id === updated.id ? updated : item));
          this.opportunities.set(nextItems);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.toErrorMessage(error));
        }
      });
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unable to process proposal intake action.';
  }
}
