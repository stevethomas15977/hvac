import { DecimalPipe, NgClass, NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProposalWizardService } from './proposal-wizard.service';

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
}

type HelpTopic = 'source' | 'documents' | 'scope' | 'eligibility';

@Component({
  selector: 'app-proposals-new-wizard',
  imports: [NgIf, NgFor, NgClass, NgSwitch, NgSwitchCase, FormsModule, DecimalPipe],
  template: `
    <section class="wizard-shell">
      <header class="wizard-header panel">
        <div>
          <h1>New Proposal Wizard</h1>
          <p>Slice A: Opportunity Source, Document Intake, Scope Detection, and Manufacturer Eligibility.</p>
          <p class="inline-message" *ngIf="service.restoredFromDraft()">Draft restored from browser autosave.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="ghost" (click)="openHelpDrawer()">Quick Help</button>
          <button type="button" class="ghost" (click)="confirmResetDraft()">Reset Draft</button>
        </div>
      </header>

      <section class="panel status-panel" aria-live="polite" *ngIf="hasStatusMessages()">
        <p class="status-line success" *ngIf="lastSubmissionReceipt()">Submission recorded in review queue.</p>
        <p class="status-line warning" *ngIf="shouldWarnBeforeUnload()">Unsaved changes are present.</p>
        <p class="status-line error" *ngIf="submitErrorMessage()">Submission failed. You can retry safely.</p>
      </section>

      <section class="panel stepper-panel">
        <article
          class="step-chip"
          *ngFor="let step of steps"
          role="button"
          tabindex="0"
          [attr.aria-current]="currentStep() === step.id ? 'step' : null"
          [ngClass]="{ active: currentStep() === step.id, complete: isStepComplete(step.id), incomplete: !isStepComplete(step.id) }"
          (click)="service.setCurrentStep(step.id)"
          (keydown.enter)="service.setCurrentStep(step.id)"
          (keydown.space)="onStepSpace($event, step.id)">
          <div class="step-index">{{ step.id + 1 }}</div>
          <div>
            <strong>{{ step.title }}</strong>
            <p>{{ step.subtitle }}</p>
            <span class="step-chip-status" [ngClass]="{ complete: isStepComplete(step.id), incomplete: !isStepComplete(step.id) }">
              {{ isStepComplete(step.id) ? 'Complete' : 'Needs input' }}
            </span>
          </div>
        </article>
      </section>

      <section class="panel form-panel" [ngSwitch]="currentStep()">
        <ng-container *ngSwitchCase="0">
          <h2>Opportunity Source</h2>
          <p class="step-note">Capture source metadata that influences win probability and qualification priority.</p>
          <div class="form-grid">
            <label>
              Source Type
              <select [ngModel]="state().source.sourceType" (ngModelChange)="service.updateSourceField('sourceType', $event)">
                <option value="email">Email</option>
                <option value="procore">Procore</option>
                <option value="constructconnect">ConstructConnect</option>
                <option value="shared_drive">Shared Drive</option>
                <option value="dropbox">Dropbox</option>
                <option value="direct_link">Direct Customer Link</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Project Name
              <input [ngModel]="state().source.projectName" (ngModelChange)="service.updateSourceField('projectName', $event)" />
              <small class="field-error" *ngIf="showFieldError(0, 'project name')">Project name is required.</small>
            </label>
            <label>
              Project Number
              <input [ngModel]="state().source.projectNumber" (ngModelChange)="service.updateSourceField('projectNumber', $event)" />
            </label>
            <label>
              Bid Due Date
              <input type="date" [ngModel]="state().source.bidDueDate" (ngModelChange)="service.updateSourceField('bidDueDate', $event)" />
            </label>
            <label>
              Contractor
              <input [ngModel]="state().source.contractorName" (ngModelChange)="service.updateSourceField('contractorName', $event)" />
              <small class="field-error" *ngIf="showFieldError(0, 'contractor')">Contractor is required.</small>
            </label>
            <label>
              Contact Email
              <input type="email" [ngModel]="state().source.contactEmail" (ngModelChange)="service.updateSourceField('contactEmail', $event)" />
            </label>
            <label>
              Bid Visibility
              <small class="field-error" *ngIf="showFieldError(0, 'bid due date')">Bid due date is required.</small>
              <select [ngModel]="state().source.bidVisibility" (ngModelChange)="service.updateSourceField('bidVisibility', $event)">
                <option value="unknown">Unknown</option>
                <option value="open_bid">Open Bid</option>
                <option value="closed_bid">Closed Bid</option>
                <option value="invited">Invited Bidder</option>
                <option value="basis_of_design">Basis of Design</option>
              </select>
            </label>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="1">
          <h2>Document Intake</h2>
          <p class="step-note">Upload available bid artifacts and classify each document for downstream extraction and evidence checks.</p>
          <input type="file" multiple (change)="onFilesSelected($event)" />
          <div class="doc-list" *ngIf="state().documents.length > 0; else emptyDocs">
            <article class="doc-row" *ngFor="let doc of state().documents">
              <div>
                <strong>{{ doc.name }}</strong>
                <p>{{ doc.sizeBytes / 1024 | number: '1.0-0' }} KB</p>
              </div>
              <label>
                Type
                <select [ngModel]="doc.type" (ngModelChange)="service.updateDocumentType(doc.id, $event)">
                  <option value="invitation">Bid Invitation</option>
                  <option value="m_sheet">Mechanical Schedule (M-sheet)</option>
                  <option value="specification">Specification</option>
                  <option value="general_note">General Note</option>
                  <option value="addendum">Addendum</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <button type="button" class="ghost" (click)="service.removeDocument(doc.id)">Remove</button>
            </article>
          </div>
          <ng-template #emptyDocs>
            <p class="empty-state">No documents uploaded yet.</p>
          </ng-template>
        </ng-container>

        <ng-container *ngSwitchCase="2">
          <h2>Scope Detection</h2>
          <p class="step-note">Confirm applicable product scope. Heat exchangers can be marked, but are out-of-scope for MVP automation.</p>
          <div class="scope-grid">
            <label><input type="checkbox" [ngModel]="state().scope.coolingTowers" (ngModelChange)="service.updateScopeField('coolingTowers', $event)" /> Cooling Towers</label>
            <label><input type="checkbox" [ngModel]="state().scope.boilers" (ngModelChange)="service.updateScopeField('boilers', $event)" /> Boilers</label>
            <label><input type="checkbox" [ngModel]="state().scope.pumps" (ngModelChange)="service.updateScopeField('pumps', $event)" /> Pumps</label>
            <label><input type="checkbox" [ngModel]="state().scope.heatExchangers" (ngModelChange)="service.updateScopeField('heatExchangers', $event)" /> Heat Exchangers (out-of-scope)</label>
          </div>
          <p class="inline-message">Selected scope: {{ selectedScopeSummary() }}</p>
        </ng-container>

        <ng-container *ngSwitchCase="3">
          <h2>Manufacturer Eligibility</h2>
          <p class="step-note">Capture represented manufacturer and approved manufacturer list from specifications/addenda.</p>
          <div class="form-grid">
            <label>
              Represented Manufacturer
              <input [ngModel]="state().eligibility.representedManufacturer" (ngModelChange)="service.updateEligibilityField('representedManufacturer', $event)" />
              <small class="field-error" *ngIf="showFieldError(3, 'represented manufacturer')">Represented manufacturer is required.</small>
            </label>
            <label class="full-row">
              Approved Manufacturers (comma or newline separated)
              <textarea
                [ngModel]="state().eligibility.approvedManufacturersRaw"
                (ngModelChange)="service.updateEligibilityField('approvedManufacturersRaw', $event)"
                placeholder="Marley, BAC, Evapco"></textarea>
              <small class="field-error" *ngIf="showFieldError(3, 'approved manufacturer list')">Approved manufacturer list is required.</small>
            </label>
          </div>

          <section class="policy-box" [ngClass]="{ blocked: !assessment().canProceedToDecision }">
            <h3>Decision Policy Status (Slice A Preview)</h3>
            <p *ngIf="assessment().canProceedToDecision">Evidence and eligibility checks currently pass. Final Go/No Go remains in Slice B.</p>
            <ul *ngIf="assessment().missingEvidence.length > 0">
              <li *ngFor="let issue of assessment().missingEvidence">{{ issue }}</li>
            </ul>
            <p class="error" *ngIf="assessment().hasConflict">
              Conflict: {{ assessment().representedManufacturer }} is not present in approved manufacturer list.
            </p>
            <p class="muted">Hard rule: Missing/conflicting evidence forces Needs Review and blocks final Go/No Go.</p>
          </section>
        </ng-container>
      </section>

      <section class="panel ai-panel">
        <div class="ai-head">
          <h2>Proposal AI Assistant (Suggest-Only)</h2>
          <button type="button" (click)="askAiSuggestion()">Ask for suggestion</button>
        </div>
        <p class="muted">AI suggestions never auto-write final decision fields.</p>
        <p class="suggestion" *ngIf="aiSuggestion(); else noSuggestion">{{ aiSuggestion() }}</p>
        <ng-template #noSuggestion>
          <p class="empty-state">No suggestion generated yet for this step.</p>
        </ng-template>
      </section>

      <section class="panel decision-panel">
        <div class="decision-head">
          <h2>Decision Preview</h2>
          <span class="decision-badge" [ngClass]="decisionPreview().status">
            {{ decisionStatusLabel() }}
          </span>
        </div>
        <p class="muted">{{ decisionPreview().rationale }}</p>
        <ul *ngIf="decisionPreview().blockers.length > 0">
          <li *ngFor="let blocker of decisionPreview().blockers">{{ blocker }}</li>
        </ul>
      </section>

      <section class="panel packet-panel">
        <h2>Decision Packet (Slice B)</h2>
        <p class="muted">Explainable evidence summary and reason codes for final recommendation.</p>

        <div class="packet-grid">
          <article class="packet-card">
            <h3>Evidence Summary</h3>
            <ul>
              <li>Bid Invitations: {{ decisionPacket().evidenceSummary.invitationCount }}</li>
              <li>M-Sheets: {{ decisionPacket().evidenceSummary.mSheetCount }}</li>
              <li>Specifications: {{ decisionPacket().evidenceSummary.specificationCount }}</li>
              <li>Addenda: {{ decisionPacket().evidenceSummary.addendumCount }}</li>
            </ul>
          </article>

          <article class="packet-card">
            <h3>Scope Summary</h3>
            <ul *ngIf="decisionPacket().scopeSummary.length > 0; else noScopeSummary">
              <li *ngFor="let item of decisionPacket().scopeSummary">{{ item }}</li>
            </ul>
            <ng-template #noScopeSummary>
              <p class="muted">No scope selected.</p>
            </ng-template>
          </article>

          <article class="packet-card">
            <h3>Manufacturer Eligibility</h3>
            <p>Represented: {{ decisionPacket().manufacturerEligibility.representedManufacturer || 'Not set' }}</p>
            <p>Approved count: {{ decisionPacket().manufacturerEligibility.approvedManufacturers.length }}</p>
            <p [ngClass]="{ eligible: decisionPacket().manufacturerEligibility.isEligible, ineligible: !decisionPacket().manufacturerEligibility.isEligible }">
              {{ decisionPacket().manufacturerEligibility.isEligible ? 'Eligible' : 'Needs review' }}
            </p>
          </article>
        </div>

        <article class="packet-card">
          <h3>Reason Codes</h3>
          <div class="code-row">
            <span class="reason-code" *ngFor="let code of decisionPacket().reasonCodes">{{ code }}</span>
          </div>
        </article>

        <article class="packet-card">
          <h3>Final Recommendation</h3>
          <div class="recommendation-grid">
            <label>
              <input
                type="radio"
                name="finalRecommendation"
                [checked]="state().finalDecision.recommendation === 'go'"
                [disabled]="!canSelectRecommendation('go')"
                (change)="setFinalRecommendation('go')" />
              Go
            </label>
            <label>
              <input
                type="radio"
                name="finalRecommendation"
                [checked]="state().finalDecision.recommendation === 'no_go'"
                [disabled]="!canSelectRecommendation('no_go')"
                (change)="setFinalRecommendation('no_go')" />
              No Go
            </label>
            <label>
              <input
                type="radio"
                name="finalRecommendation"
                [checked]="state().finalDecision.recommendation === 'needs_review'"
                (change)="setFinalRecommendation('needs_review')" />
              Needs Review
            </label>
          </div>

          <p class="muted" *ngIf="!canSelectRecommendation('go')">
            Go/No Go are disabled until missing/conflicting evidence is resolved.
          </p>

          <label class="review-notes">
            Review Notes
            <textarea
              [ngModel]="state().finalDecision.reviewNotes"
              (ngModelChange)="updateReviewNotes($event)"
              placeholder="Add context for reviewer or downstream estimator."></textarea>
          </label>

          <div class="packet-actions">
            <button type="button" (click)="submitForReview()" [disabled]="!canSubmitForReview()">
              {{ isSubmitting() ? 'Submitting...' : 'Submit for Review' }}
            </button>
            <p class="inline-message" *ngIf="state().finalDecision.submittedForReview">
              Submitted for review at {{ formatSubmittedAt(state().finalDecision.submittedAtIso) }}.
            </p>
            <p class="inline-message" *ngIf="lastSubmissionReceipt() && !hasChangesSinceLastSubmission()">
              No changes since last submission.
            </p>
            <p class="step-warning" *ngIf="submitErrorMessage()">{{ submitErrorMessage() }}</p>
            <button type="button" class="ghost" *ngIf="submitErrorMessage() && !isSubmitting()" (click)="retrySubmission()">
              Retry Submit
            </button>
          </div>
        </article>
      </section>

      <section class="panel submission-details-panel" *ngIf="lastSubmissionReceipt()">
        <div class="details-header">
          <h2>Submission Details</h2>
          <button type="button" class="ghost" (click)="refreshRecentSubmissions()">Refresh Recent</button>
        </div>

        <div class="details-grid">
          <article class="detail-card">
            <h3>Latest Receipt</h3>
            <p><strong>Submission ID:</strong> {{ lastSubmissionReceipt()?.submissionId }}</p>
            <p><strong>Queue:</strong> {{ lastSubmissionReceipt()?.reviewQueue }}</p>
            <p><strong>Recommendation:</strong> {{ lastSubmissionReceipt()?.recommendation }}</p>
            <p><strong>Submitted At:</strong> {{ formatSubmittedAt(lastSubmissionReceipt()?.submittedAtIso ?? null) }}</p>
          </article>

          <article class="detail-card">
            <h3>Recent Submissions</h3>
            <ul *ngIf="recentSubmissions().length > 0; else noRecentSubmissions">
              <li *ngFor="let item of recentSubmissions()">
                <div><strong>{{ item.submissionId }}</strong></div>
                <div>{{ item.projectName || 'Unnamed project' }} ({{ item.projectNumber || 'N/A' }})</div>
                <div>{{ item.recommendation }} • {{ item.status }} • {{ formatSubmittedAt(item.submittedAtIso) }}</div>
              </li>
            </ul>
            <ng-template #noRecentSubmissions>
              <p class="muted">No recent submissions returned.</p>
            </ng-template>
          </article>
        </div>
      </section>

      <footer class="panel nav-panel">
        <button type="button" class="ghost" (click)="goPrevious()" [disabled]="currentStep() === 0">Back</button>
        <div class="step-status">
          <div>Step {{ currentStep() + 1 }} of {{ steps.length }} (Slice A)</div>
          <div class="step-warning" *ngIf="currentStepIssues().length > 0">{{ currentStepIssues()[0] }}</div>
        </div>
        <button type="button" (click)="goNext()" [disabled]="currentStep() === steps.length - 1 || !canAdvanceFromCurrentStep()">Next</button>
      </footer>

      <div class="help-backdrop" *ngIf="helpDrawerOpen()" (click)="closeHelpDrawer()"></div>
      <aside class="help-drawer" [ngClass]="{ open: helpDrawerOpen() }" aria-live="polite" aria-label="Proposal wizard help drawer">
        <header class="help-header">
          <div>
            <h2>Quick Help</h2>
            <p>Guidance aligned to the current wizard step.</p>
          </div>
          <button type="button" class="ghost" (click)="closeHelpDrawer()">Close</button>
        </header>

        <section class="help-content" [ngSwitch]="activeHelpTopic()">
          <div *ngSwitchCase="'source'" class="help-topic">
            <h3>Opportunity Source</h3>
            <ul>
              <li>Capture bid origin and visibility early for win-probability context.</li>
              <li>Record project number and due date before document upload.</li>
              <li>Missing source metadata lowers recommendation confidence.</li>
            </ul>
          </div>
          <div *ngSwitchCase="'documents'" class="help-topic">
            <h3>Document Intake</h3>
            <ul>
              <li>Classify each file correctly. Addenda must be explicitly labeled.</li>
              <li>M-sheets and specifications are required for reliable qualification.</li>
              <li>Bad classification can produce false Needs Review outcomes.</li>
            </ul>
          </div>
          <div *ngSwitchCase="'scope'" class="help-topic">
            <h3>Scope Detection</h3>
            <ul>
              <li>Cooling towers are the primary MVP scope.</li>
              <li>Boilers and pumps are phase expansion paths.</li>
              <li>Heat exchangers can be tracked but are out-of-scope for MVP automation.</li>
            </ul>
          </div>
          <div *ngSwitchCase="'eligibility'" class="help-topic">
            <h3>Manufacturer Eligibility</h3>
            <ul>
              <li>Ensure represented manufacturer appears in approved list.</li>
              <li>Conflicts force Needs Review and block final Go/No Go.</li>
              <li>Addenda can override manufacturer requirements.</li>
            </ul>
          </div>
        </section>

        <footer class="help-footer">
          <a class="guide-link" href="/docs/sales-rep-user-guide.md" target="_blank" rel="noopener noreferrer">Open full guide</a>
        </footer>
      </aside>
    </section>
  `,
  styles: `
    .wizard-shell {
      display: grid;
      gap: 1rem;
      position: relative;
    }

    .panel {
      background: #ffffff;
      border: 1px solid #d8e2ef;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 10px 20px rgba(34, 56, 84, 0.08);
    }

    .wizard-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    h1 {
      margin: 0;
      color: #1f3b58;
      font-size: 1.3rem;
    }

    h2 {
      margin: 0 0 0.55rem;
      color: #1f3b58;
      font-size: 1.05rem;
    }

    h3 {
      margin: 0 0 0.45rem;
      color: #1f3b58;
      font-size: 0.95rem;
    }

    p {
      margin: 0;
      color: #4a647f;
      font-size: 0.9rem;
    }

    .inline-message {
      margin-top: 0.35rem;
      font-size: 0.82rem;
      color: #245d8a;
    }

    .step-note {
      margin-bottom: 0.75rem;
      color: #506a84;
      font-size: 0.84rem;
    }

    .status-panel {
      display: grid;
      gap: 0.35rem;
      border-color: #d2e1ef;
      background: #f8fbff;
      padding-block: 0.75rem;
    }

    .status-line {
      font-size: 0.82rem;
      font-weight: 600;
    }

    .status-line.success {
      color: #1f6e44;
    }

    .status-line.warning {
      color: #7a4d07;
    }

    .status-line.error {
      color: #8d4332;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .stepper-panel {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.55rem;
    }

    .step-chip {
      border: 1px solid #d8e2ef;
      border-radius: 10px;
      padding: 0.6rem;
      display: grid;
      gap: 0.35rem;
      cursor: pointer;
      grid-template-columns: auto 1fr;
      align-items: start;
      background: #f9fbfe;
    }

    .step-chip.active {
      border-color: #1a73b8;
      box-shadow: 0 0 0 2px rgba(26, 115, 184, 0.14);
      background: #eef7ff;
    }

    .step-chip.complete {
      border-color: #7cc39b;
      background: #f2fbf6;
    }

    .step-chip.incomplete {
      border-color: #e3c3bd;
      background: #fff8f6;
    }

    .step-index {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #dbe8f4;
      color: #1f3b58;
      font-size: 0.76rem;
      display: grid;
      place-items: center;
      font-weight: 700;
      margin-top: 0.1rem;
    }

    .step-chip strong {
      font-size: 0.85rem;
      color: #1f3b58;
    }

    .step-chip p {
      font-size: 0.76rem;
      color: #5d768f;
    }

    .step-chip-status {
      margin-top: 0.2rem;
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      border: 1px solid transparent;
    }

    .step-chip-status.complete {
      color: #1f6e44;
      background: #ddf3e7;
      border-color: #b3ddc8;
    }

    .step-chip-status.incomplete {
      color: #8d4332;
      background: #fbe4df;
      border-color: #f0bfb4;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
    }

    .form-grid label,
    .doc-row label {
      display: grid;
      gap: 0.35rem;
      font-size: 0.82rem;
      color: #3d5a75;
    }

    .field-error {
      color: #8d4332;
      font-size: 0.76rem;
      line-height: 1.2;
    }

    .form-grid .full-row {
      grid-column: 1 / -1;
    }

    input,
    textarea,
    select {
      border: 1px solid #cfddec;
      border-radius: 8px;
      padding: 0.5rem;
      font-family: inherit;
      font-size: 0.85rem;
      box-sizing: border-box;
    }

    textarea {
      min-height: 90px;
      resize: vertical;
    }

    .doc-list {
      display: grid;
      gap: 0.55rem;
      margin-top: 0.65rem;
    }

    .doc-row {
      border: 1px solid #d9e6f1;
      border-radius: 10px;
      padding: 0.65rem;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(220px, auto) auto;
      gap: 0.7rem;
      align-items: center;
    }

    .doc-row p {
      font-size: 0.78rem;
      color: #607b97;
      margin-top: 0.15rem;
    }

    .scope-grid {
      display: grid;
      gap: 0.45rem;
      font-size: 0.86rem;
      color: #38546f;
    }

    .scope-grid label {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .policy-box {
      margin-top: 0.65rem;
      border: 1px solid #bde7cb;
      background: #edf9f2;
      border-radius: 10px;
      padding: 0.65rem;
      display: grid;
      gap: 0.45rem;
    }

    .policy-box.blocked {
      border-color: #f3c3bb;
      background: #fff2f0;
    }

    .policy-box ul {
      margin: 0;
      padding-left: 1rem;
      color: #7b4233;
      font-size: 0.83rem;
    }

    .policy-box .error {
      color: #a44331;
      font-size: 0.83rem;
    }

    .muted {
      color: #617b96;
      font-size: 0.8rem;
    }

    .ai-panel {
      display: grid;
      gap: 0.55rem;
    }

    .decision-panel {
      display: grid;
      gap: 0.45rem;
      border-color: #d5e2ee;
    }

    .submission-details-panel {
      border-color: #cde1f3;
      background: #f7fbff;
      display: grid;
      gap: 0.75rem;
    }

    .details-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
    }

    .detail-card {
      border: 1px solid #d5e4f2;
      border-radius: 10px;
      background: #ffffff;
      padding: 0.75rem;
      display: grid;
      gap: 0.35rem;
    }

    .detail-card ul {
      margin: 0;
      padding-left: 1rem;
      display: grid;
      gap: 0.4rem;
      color: #4f6174;
      font-size: 0.8rem;
      line-height: 1.4;
    }

    .packet-panel {
      display: grid;
      gap: 0.6rem;
      border-color: #d5e2ee;
    }

    .packet-grid {
      display: grid;
      gap: 0.55rem;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .packet-card {
      border: 1px solid #dbe6f0;
      border-radius: 10px;
      padding: 0.65rem;
      display: grid;
      gap: 0.4rem;
      background: #fbfdff;
    }

    .packet-card ul {
      margin: 0;
      padding-left: 1rem;
      color: #4f6174;
      font-size: 0.82rem;
      line-height: 1.35;
    }

    .code-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .reason-code {
      border: 1px solid #cddff0;
      border-radius: 999px;
      padding: 0.12rem 0.45rem;
      background: #eef6ff;
      color: #2c5073;
      font-size: 0.74rem;
      font-weight: 600;
    }

    .recommendation-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      font-size: 0.84rem;
      color: #35506c;
    }

    .recommendation-grid label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .review-notes {
      display: grid;
      gap: 0.35rem;
      font-size: 0.82rem;
      color: #3d5a75;
    }

    .packet-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      align-items: center;
    }

    .eligible {
      color: #1f6e44;
      font-weight: 600;
    }

    .ineligible {
      color: #8a2f1f;
      font-weight: 600;
    }

    .decision-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.55rem;
      flex-wrap: wrap;
    }

    .decision-badge {
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid transparent;
    }

    .decision-badge.go {
      color: #1f6e44;
      background: #ddf3e7;
      border-color: #b3ddc8;
    }

    .decision-badge.no_go {
      color: #8a2f1f;
      background: #f9dfd8;
      border-color: #ecb5a8;
    }

    .decision-badge.needs_review {
      color: #7b4a00;
      background: #fcefd4;
      border-color: #f3d499;
    }

    .decision-panel ul {
      margin: 0;
      padding-left: 1rem;
      color: #4f6174;
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .ai-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .suggestion {
      border: 1px solid #d8e2ef;
      border-radius: 10px;
      padding: 0.65rem;
      background: #f8fbff;
      color: #36536f;
      line-height: 1.42;
      font-size: 0.85rem;
      white-space: pre-line;
    }

    .nav-panel {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .step-status {
      color: #4f6882;
      font-size: 0.83rem;
      font-weight: 600;
      display: grid;
      gap: 0.2rem;
    }

    .step-warning {
      color: #8d4332;
      font-size: 0.78rem;
      font-weight: 500;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 0.45rem 0.8rem;
      background: #1a73b8;
      color: #ffffff;
      cursor: pointer;
    }

    button.ghost {
      background: #edf3f9;
      color: #294462;
    }

    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .empty-state {
      color: #607b97;
      font-size: 0.84rem;
    }

    .help-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(20, 34, 52, 0.4);
      z-index: 40;
    }

    .help-drawer {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: min(400px, 94vw);
      background: #f8fbff;
      border-left: 1px solid #cfe0ef;
      box-shadow: -18px 0 36px rgba(19, 38, 58, 0.22);
      transform: translateX(102%);
      transition: transform 220ms ease;
      z-index: 50;
      padding: 1rem;
      display: grid;
      gap: 0.8rem;
      overflow-y: auto;
    }

    .help-drawer.open {
      transform: translateX(0);
    }

    .help-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      border-bottom: 1px solid #d6e4f2;
      padding-bottom: 0.7rem;
    }

    .help-content {
      display: grid;
      gap: 0.7rem;
    }

    .help-topic ul {
      margin: 0.4rem 0 0;
      padding-left: 1rem;
      color: #35536f;
      font-size: 0.84rem;
      line-height: 1.45;
    }

    .help-footer {
      margin-top: 0.35rem;
      padding-top: 0.75rem;
      border-top: 1px solid #d6e4f2;
    }

    .guide-link {
      color: #155d93;
      font-size: 0.84rem;
      font-weight: 600;
      text-decoration: none;
    }

    .guide-link:hover,
    .guide-link:focus-visible {
      text-decoration: underline;
    }

    @media (max-width: 1000px) {
      .stepper-panel {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .packet-grid {
        grid-template-columns: 1fr;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .doc-row {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class ProposalsNewWizardComponent {
  readonly service = inject(ProposalWizardService);

  readonly steps: WizardStep[] = [
    { id: 0, title: 'Opportunity Source', subtitle: 'Capture source and bid metadata' },
    { id: 1, title: 'Document Intake', subtitle: 'Upload and classify artifacts' },
    { id: 2, title: 'Scope Detection', subtitle: 'Confirm in-scope equipment' },
    { id: 3, title: 'Manufacturer Eligibility', subtitle: 'Validate approved manufacturer fit' }
  ];

  readonly helpDrawerOpen = signal(false);
  readonly aiSuggestion = signal('');

  readonly state = computed(() => this.service.state());
  readonly currentStep = computed(() => this.service.currentStep());
  readonly assessment = computed(() => this.service.assessment());
  readonly decisionPreview = computed(() => this.service.decisionPreview());
  readonly decisionPacket = computed(() => this.service.decisionPacket());
  readonly isSubmitting = computed(() => this.service.isSubmitting());
  readonly canSubmitForReview = computed(() => this.service.canSubmitForReview());
  readonly hasChangesSinceLastSubmission = computed(() => this.service.hasChangesSinceLastSubmission());
  readonly submitErrorMessage = computed(() => this.service.submitErrorMessage());
  readonly lastSubmissionReceipt = computed(() => this.service.lastSubmissionReceipt());
  readonly recentSubmissions = computed(() => this.service.recentSubmissions());
  readonly shouldWarnBeforeUnload = computed(() => this.service.shouldWarnBeforeUnload());
  readonly hasStatusMessages = computed(() => {
    return Boolean(this.lastSubmissionReceipt() || this.shouldWarnBeforeUnload() || this.submitErrorMessage());
  });
  readonly currentStepIssues = computed(() => this.service.getStepIssues(this.currentStep()));
  readonly selectedScopeSummary = computed(() => {
    const labels = this.service.selectedScopeLabels();
    return labels.length > 0 ? labels.join(', ') : 'None selected';
  });

  constructor() {
    this.service.initialize();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.service.addDocuments(input.files);
    input.value = '';
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.shouldWarnBeforeUnload()) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

  onStepSpace(event: Event, stepId: number): void {
    event.preventDefault();
    this.service.setCurrentStep(stepId);
  }

  confirmResetDraft(): void {
    if (this.shouldWarnBeforeUnload()) {
      const confirmed = window.confirm('Discard current draft changes?');
      if (!confirmed) {
        return;
      }
    }

    this.service.clearDraft();
  }

  goPrevious(): void {
    this.service.setCurrentStep(this.currentStep() - 1);
  }

  goNext(): void {
    if (!this.canAdvanceFromCurrentStep()) {
      return;
    }

    this.service.setCurrentStep(this.currentStep() + 1);
  }

  isStepComplete(stepId: number): boolean {
    return this.service.isStepComplete(stepId);
  }

  canAdvanceFromCurrentStep(): boolean {
    return this.service.canAdvanceFromCurrentStep();
  }

  canSelectRecommendation(status: 'go' | 'no_go' | 'needs_review'): boolean {
    return this.service.canSelectRecommendation(status);
  }

  setFinalRecommendation(status: 'go' | 'no_go' | 'needs_review'): void {
    this.service.setFinalRecommendation(status);
  }

  updateReviewNotes(notes: string): void {
    this.service.updateReviewNotes(notes);
  }

  submitForReview(): void {
    this.service.submitForReview();
  }

  retrySubmission(): void {
    this.service.retrySubmission();
  }

  refreshRecentSubmissions(): void {
    this.service.refreshRecentSubmissions();
  }

  showFieldError(stepId: number, fieldFragment: string): boolean {
    return this.currentStep() === stepId && this.service.hasStepIssueContaining(stepId, fieldFragment);
  }

  formatSubmittedAt(value: string | null): string {
    if (!value) {
      return 'just now';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'just now';
    }

    return parsed.toLocaleString();
  }

  decisionStatusLabel(): string {
    const status = this.decisionPreview().status;
    if (status === 'go') {
      return 'Go';
    }
    if (status === 'no_go') {
      return 'No Go';
    }
    return 'Needs Review';
  }

  askAiSuggestion(): void {
    const step = this.currentStep();
    const state = this.state();
    const assessment = this.assessment();

    if (step === 0) {
      this.aiSuggestion.set(
        `Suggestion: Treat this as ${state.source.bidVisibility.replace('_', ' ')} and prioritize metadata completeness before qualification scoring.\n` +
        'Next action: Ensure project name, bid due date, and contractor contact are populated.'
      );
      return;
    }

    if (step === 1) {
      this.aiSuggestion.set(
        `Suggestion: ${state.documents.length} document(s) uploaded.\n` +
        'Classify at least one Invitation, one M-sheet, one Specification, and all Addenda to avoid forced Needs Review.'
      );
      return;
    }

    if (step === 2) {
      this.aiSuggestion.set(
        `Suggestion: Current scope is ${this.selectedScopeSummary()}.\n` +
        'For MVP, keep cooling towers selected and treat heat exchangers as out-of-scope detection only.'
      );
      return;
    }

    this.aiSuggestion.set(
      `Suggestion: Represented manufacturer is ${assessment.representedManufacturer || 'not set'}.\n` +
      `Approved list entries: ${assessment.approvedManufacturers.length}.\n` +
      (assessment.hasConflict
        ? 'Conflict detected. Recommendation: Needs Review until eligibility conflict is resolved.'
        : 'No direct eligibility conflict detected from entered values.')
    );
  }

  openHelpDrawer(): void {
    this.helpDrawerOpen.set(true);
  }

  closeHelpDrawer(): void {
    this.helpDrawerOpen.set(false);
  }

  activeHelpTopic(): HelpTopic {
    const step = this.currentStep();
    if (step === 0) {
      return 'source';
    }
    if (step === 1) {
      return 'documents';
    }
    if (step === 2) {
      return 'scope';
    }
    return 'eligibility';
  }
}
