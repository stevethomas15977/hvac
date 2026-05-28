import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BidOpportunity, IntakeStatus, QualificationStatus, SelectionStatus } from './proposals-page.models';
import { ProposalsIntakeService } from './proposals-intake.service';

type HelpTopic = 'intake' | 'qualification' | 'selection';

@Component({
  selector: 'app-proposals-page',
  imports: [NgIf, NgFor, NgClass, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe, DecimalPipe, TitleCasePipe, UpperCasePipe, FormsModule],
  template: `
    <section class="proposal-shell">
      <header class="workspace-header">
        <div>
          <h1>Proposal Intake Workspace</h1>
          <p>Step 1 of orchestration flow: Intake bid package</p>
          <p class="inline-message" *ngIf="isLoading">Syncing intake data...</p>
          <p class="inline-message error" *ngIf="errorMessage">{{ errorMessage }}</p>
        </div>
        <div class="header-actions">
          <span class="status-chip" [ngClass]="selected.intakeStatus">{{ intakeStatusLabel[selected.intakeStatus] }}</span>
          <button type="button" class="ghost" (click)="openHelpDrawer()">Help</button>
          <button type="button" class="ghost" (click)="resetIntake()">Reset intake</button>
          <button type="button" [disabled]="selected.intakeStatus !== 'ready' || isLoading" (click)="runQualification()">Run qualification</button>
        </div>
      </header>

      <div class="layout-grid">
        <aside class="queue-panel panel">
          <h2>Intake Queue</h2>
          <div class="queue-filters">
            <span>Open bids</span>
            <span>Private invites</span>
            <span>Due soon</span>
          </div>

          <button
            *ngFor="let opp of opportunities"
            type="button"
            class="queue-item"
            [ngClass]="{ active: opp.id === selected.id }"
            (click)="selectOpportunity(opp.id)">
            <div class="row top">
              <strong>{{ opp.projectName }}</strong>
              <span class="source">{{ opp.source }}</span>
            </div>
            <div class="row meta">
              <span>{{ opp.location }}</span>
              <span>Due {{ opp.dueDate | date: 'MMM d' }}</span>
            </div>
            <div class="row bottom">
              <span class="chip" [ngClass]="opp.intakeStatus">{{ intakeStatusLabel[opp.intakeStatus] }}</span>
              <span>Score {{ opp.score }}</span>
            </div>
          </button>
        </aside>

        <section class="center-panel panel">
          <div class="project-summary">
            <h2>{{ selected.projectName }}</h2>
            <div class="project-meta">
              <span>{{ selected.projectType }}</span>
              <span>{{ selected.location }}</span>
              <span>Manufacturer: {{ selected.manufacturer }}</span>
              <span>Value: {{ selected.estimatedValueUsd | number: '1.0-0' }} USD</span>
            </div>
          </div>

          <section *ngIf="hasQualificationView" class="qualification-card">
            <header class="qualification-header">
              <div>
                <h3>Qualification Assistant</h3>
                <p>Step 2: Qualify whether to pursue</p>
              </div>
              <span class="status-chip" [ngClass]="selected.qualificationStatus ?? 'idle'">
                {{ qualificationStatusLabel[selected.qualificationStatus ?? 'idle'] }}
              </span>
            </header>

            <div *ngIf="selected.qualificationResult as result" class="qualification-body">
              <p class="qual-summary">{{ result.summary }}</p>

              <div class="qual-metrics">
                <span>Confidence: {{ result.confidenceScore * 100 | number: '1.0-0' }}%</span>
                <span>Recommendation: {{ result.recommendation === 'go' ? 'GO' : 'NO GO' }}</span>
              </div>

              <section class="mini-section">
                <h4>Scope candidates</h4>
                <article class="scope-row" *ngFor="let scope of result.scopeCandidates">
                  <div>
                    <strong>{{ scope.equipmentType }}</strong>
                    <p>{{ scope.notes }}</p>
                    <small *ngFor="let citation of scope.citations">{{ citation }}</small>
                  </div>
                  <span>{{ scope.confidence * 100 | number: '1.0-0' }}%</span>
                </article>
              </section>

              <section class="mini-section">
                <h4>Reasoning</h4>
                <ul>
                  <li *ngFor="let reason of result.reasons">{{ reason }}</li>
                </ul>
              </section>

              <section class="decision-panel" *ngIf="selected.qualificationStatus === 'ready' || selected.qualificationStatus === 'needs_review'">
                <h4>Human decision (required)</h4>
                <textarea
                  [(ngModel)]="qualificationDecisionNotes"
                  placeholder="Enter rationale for GO / NO GO decision."></textarea>
                <div class="decision-actions">
                  <button type="button" class="ghost" (click)="approveQualification('no_go')" [disabled]="isLoading">Mark NO GO</button>
                  <button type="button" (click)="approveQualification('go')" [disabled]="isLoading">Mark GO</button>
                </div>
              </section>

              <section class="decision-result" *ngIf="selected.qualificationDecision as decision">
                <h4>Decision recorded</h4>
                <p>
                  {{ decision.decision === 'go' ? 'GO' : 'NO GO' }} by {{ decision.decidedBy }}
                  on {{ decision.decidedAt | date: 'MMM d, h:mm a' }}
                </p>
                <small>{{ decision.rationale }}</small>
              </section>

              <button
                type="button"
                class="next-step"
                *ngIf="selected.qualificationStatus === 'approved'"
                (click)="proceedToSelection()">
                Proceed to Selection Assistant
              </button>
            </div>
          </section>

          <section *ngIf="hasSelectionView" class="selection-card">
            <header class="qualification-header">
              <div>
                <h3>Selection Assistant</h3>
                <p>Step 3: Compare tool-path vs manufacturer-path selection</p>
              </div>
              <span class="status-chip" [ngClass]="selected.selectionStatus ?? 'idle'">
                {{ selectionStatusLabel[selected.selectionStatus ?? 'idle'] }}
              </span>
            </header>

            <div *ngIf="selected.selectionResult as selection" class="qualification-body">
              <p class="qual-summary"><strong>Tool-path:</strong> {{ selection.toolPathModel }}</p>
              <p class="qual-summary">{{ selection.toolPathSummary }}</p>

              <div class="selection-grid">
                <section class="mini-section">
                  <h4>Comparison checks</h4>
                  <article class="scope-row" *ngFor="let check of selection.comparisonChecks">
                    <div>
                      <strong>{{ check.field }}</strong>
                      <p>Tool path: {{ check.toolPathValue }}</p>
                      <small>Manufacturer path: {{ check.manufacturerValue }}</small>
                    </div>
                    <span class="severity" [ngClass]="check.severity">{{ check.severity | uppercase }}</span>
                  </article>
                </section>

                <section class="decision-panel" *ngIf="selected.selectionStatus === 'ready' || selected.selectionStatus === 'needs_review'">
                  <h4>Human decision (required)</h4>
                  <label>
                    Manufacturer-path model
                    <input [(ngModel)]="manufacturerPathModel" placeholder="Example: Marley NC-8414" />
                  </label>
                  <textarea
                    [(ngModel)]="selectionDecisionNotes"
                    placeholder="Enter rationale for approve/reject decision."></textarea>
                  <div class="decision-actions">
                    <button type="button" class="ghost" (click)="approveSelection('reject')" [disabled]="isLoading">Reject</button>
                    <button type="button" (click)="approveSelection('approve')" [disabled]="isLoading">Approve Selection</button>
                  </div>
                </section>

                <section class="decision-result" *ngIf="selected.selectionDecision as decision">
                  <h4>Selection decision recorded</h4>
                  <p>
                    {{ decision.decision === 'approve' ? 'APPROVED' : 'REJECTED' }} by {{ decision.decidedBy }}
                    on {{ decision.decidedAt | date: 'MMM d, h:mm a' }}
                  </p>
                  <small>{{ decision.rationale }}</small>
                </section>
              </div>
            </div>
          </section>

          <ng-container [ngSwitch]="selected.intakeStatus">
            <div *ngSwitchCase="'not_started'" class="state-card empty">
              <h3>Upload bid package</h3>
              <p>Drop PDFs or click below to load a mock package for this opportunity.</p>
              <button type="button" (click)="loadMockPackage()">Load mock package</button>
            </div>

            <div *ngSwitchCase="'processing'" class="state-card processing">
              <h3>Processing uploaded documents</h3>
              <p>Parser is extracting notes, schedules, and spec references.</p>
              <div class="progress-wrap">
                <div class="progress-bar"></div>
              </div>
              <p class="muted">Detected {{ selected.docs.length }} files so far.</p>
            </div>

            <div *ngSwitchCase="'uploading'" class="state-card processing">
              <h3>Uploading files</h3>
              <p>Bid package upload is in progress.</p>
              <div class="progress-wrap">
                <div class="progress-bar uploading"></div>
              </div>
            </div>

            <div *ngSwitchCase="'error'" class="state-card error">
              <h3>Intake failed</h3>
              <p>One or more files could not be parsed. Review warnings and retry upload.</p>
              <button type="button" (click)="loadMockPackage()">Retry with mock package</button>
            </div>

            <div *ngSwitchDefault class="state-card ready">
              <h3>Intake complete</h3>
              <p>Bid package is organized and ready for qualification.</p>
              <div class="doc-list">
                <article *ngFor="let doc of selected.docs" class="doc-row">
                  <div>
                    <strong>{{ doc.name }}</strong>
                    <p>{{ doc.kind | titlecase }} · {{ doc.pages }} pages</p>
                  </div>
                  <div class="doc-meta">
                    <span>{{ doc.uploadedBy }}</span>
                    <span>{{ doc.uploadedAt | date: 'MMM d, h:mm a' }}</span>
                  </div>
                </article>
              </div>
            </div>
          </ng-container>
        </section>

        <aside class="evidence-panel panel">
          <h2>Evidence and Activity</h2>

          <section class="mini-section">
            <h3>Approved manufacturers</h3>
            <div class="pill-wrap">
              <span class="pill" *ngFor="let item of selected.approvedManufacturers">{{ item }}</span>
            </div>
          </section>

          <section *ngIf="selected.missingItems.length > 0" class="mini-section warnings">
            <h3>Validation warnings</h3>
            <ul>
              <li *ngFor="let item of selected.missingItems">{{ item }}</li>
            </ul>
          </section>

          <section class="mini-section">
            <h3>Timeline</h3>
            <div class="timeline-item" *ngFor="let event of selected.events">
              <div class="dot" [ngClass]="event.severity"></div>
              <div>
                <p>{{ event.message }}</p>
                <small>{{ event.timestamp | date: 'MMM d, h:mm a' }}</small>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <footer class="page-footer">
        <span class="footer-brand">HVAC Portal · Proposal Intake Workspace</span>
        <div class="footer-links">
          <a class="footer-link" href="/docs/sales-rep-user-guide.md" target="_blank" rel="noopener noreferrer">Sales Rep Guide</a>
          <button type="button" class="ghost footer-help-btn" (click)="openHelpDrawer()">Quick Help</button>
        </div>
      </footer>

      <div class="help-backdrop" *ngIf="helpDrawerOpen" (click)="closeHelpDrawer()"></div>
      <aside class="help-drawer" [ngClass]="{ open: helpDrawerOpen }" aria-live="polite" aria-label="Sales rep help drawer">
        <header class="help-header">
          <div>
            <h2>Sales Rep Guide</h2>
            <p>Contextual guidance for the current orchestration step.</p>
          </div>
          <button type="button" class="ghost" (click)="closeHelpDrawer()">Close</button>
        </header>

        <div class="help-tabs">
          <button type="button" class="ghost" [ngClass]="{ active: activeHelpTopic === 'intake' }" (click)="setHelpTopic('intake')">Intake</button>
          <button type="button" class="ghost" [ngClass]="{ active: activeHelpTopic === 'qualification' }" (click)="setHelpTopic('qualification')">Qualification</button>
          <button type="button" class="ghost" [ngClass]="{ active: activeHelpTopic === 'selection' }" (click)="setHelpTopic('selection')">Selection</button>
        </div>

        <section class="help-content" [ngSwitch]="activeHelpTopic">
          <div *ngSwitchCase="'intake'" class="help-topic">
            <h3>Step 1: Intake Bid Package</h3>
            <p>Use this step to organize the package before automation decisions begin.</p>
            <ul>
              <li>Confirm project location, due date, and manufacturer context.</li>
              <li>Load the package and validate that all key files appear in Intake complete.</li>
              <li>Review validation warnings in Evidence and Activity before running qualification.</li>
            </ul>
            <p class="help-callout">Do not run qualification when critical files are missing or unreadable.</p>
          </div>

          <div *ngSwitchCase="'qualification'" class="help-topic">
            <h3>Step 2: Qualification Assistant</h3>
            <p>The assistant proposes GO or NO GO, but human approval is mandatory.</p>
            <ul>
              <li>Review confidence score, scope candidates, and cited reasoning.</li>
              <li>Enter a clear rationale when marking GO or NO GO.</li>
              <li>Use Timeline events to verify why the recommendation changed.</li>
            </ul>
            <p class="help-callout">Proceed to Selection only after a GO decision is recorded.</p>
          </div>

          <div *ngSwitchCase="'selection'" class="help-topic">
            <h3>Step 3: Selection Assistant</h3>
            <p>Compare tool-path output against manufacturer-path selections before final approval.</p>
            <ul>
              <li>Check each comparison row for low, medium, or high severity mismatches.</li>
              <li>Enter the manufacturer-path model exactly as proposed by your rep or distributor.</li>
              <li>Provide rationale for approve or reject to preserve audit trail quality.</li>
            </ul>
            <p class="help-callout">High-severity mismatches should be resolved before approval.</p>
          </div>

          <div *ngSwitchDefault class="help-topic">
            <h3>Workspace guidance</h3>
            <p>Select a topic to view practical instructions for each step in this workflow.</p>
          </div>
        </section>

        <footer class="help-footer">
          <a class="guide-link" href="/docs/sales-rep-user-guide.md" target="_blank" rel="noopener noreferrer">Open full guide &rarr;</a>
        </footer>
      </aside>
    </section>
  `,
  styles: `
    .proposal-shell {
      display: grid;
      gap: 1rem;
      position: relative;
      padding-bottom: 4rem;
    }

    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 10;
      background: #ffffff;
      border-top: 1px solid #ccdae9;
      padding: 0.65rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .footer-brand {
      font-size: 0.82rem;
      color: #4c647f;
      font-weight: 500;
    }

    .footer-links {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .footer-link {
      color: #155d93;
      font-size: 0.82rem;
      font-weight: 600;
      text-decoration: none;
    }

    .footer-link:hover,
    .footer-link:focus-visible {
      text-decoration: underline;
    }

    .footer-help-btn {
      font-size: 0.82rem;
      padding: 0.3rem 0.65rem;
    }

    .workspace-header {
      background: #ffffff;
      border: 1px solid #d8e2ef;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 10px 20px rgba(34, 56, 84, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .workspace-header h1 {
      margin: 0;
      color: #1f3b58;
      font-size: 1.3rem;
    }

    .workspace-header p {
      margin: 0.2rem 0 0;
      color: #4a647f;
      font-size: 0.92rem;
    }

    .inline-message {
      margin-top: 0.4rem;
      font-size: 0.82rem;
      color: #245d8a;
    }

    .inline-message.error {
      color: #a44331;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .status-chip,
    .chip {
      border-radius: 999px;
      padding: 0.2rem 0.65rem;
      font-size: 0.78rem;
      font-weight: 600;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .not_started {
      background: #edf2f9;
      color: #405a77;
      border-color: #d3dceb;
    }

    .uploading,
    .processing {
      background: #eef8ff;
      color: #0d5f94;
      border-color: #b5dcf7;
    }

    .ready {
      background: #edf9f2;
      color: #1d7b48;
      border-color: #bde7cb;
    }

    .idle {
      background: #edf2f9;
      color: #405a77;
      border-color: #d3dceb;
    }

    .running {
      background: #eef8ff;
      color: #0d5f94;
      border-color: #b5dcf7;
    }

    .approved {
      background: #edf9f2;
      color: #1d7b48;
      border-color: #bde7cb;
    }

    .rejected,
    .needs_review {
      background: #fff2f0;
      color: #a44331;
      border-color: #f3c3bb;
    }

    .error {
      background: #fff2f0;
      color: #a44331;
      border-color: #f3c3bb;
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

    button.ghost.active {
      background: #dcecf9;
      color: #123c5f;
      border: 1px solid #bcd7ef;
    }

    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .layout-grid {
      display: grid;
      grid-template-columns: 280px 1fr 320px;
      gap: 1rem;
      align-items: start;
    }

    .panel {
      background: #ffffff;
      border: 1px solid #d8e2ef;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 10px 20px rgba(34, 56, 84, 0.08);
    }

    h2 {
      margin: 0 0 0.75rem;
      font-size: 1.05rem;
      color: #1f3b58;
    }

    .queue-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.85rem;
      color: #5a728d;
      font-size: 0.78rem;
    }

    .queue-filters span {
      background: #f2f6fb;
      border-radius: 999px;
      padding: 0.2rem 0.6rem;
      border: 1px solid #dbe5f1;
    }

    .queue-item {
      width: 100%;
      text-align: left;
      display: grid;
      gap: 0.4rem;
      background: #ffffff;
      border: 1px solid #dde7f2;
      border-radius: 10px;
      padding: 0.65rem;
      margin-bottom: 0.55rem;
      color: #26425e;
    }

    .queue-item.active {
      border-color: #1a73b8;
      box-shadow: 0 0 0 2px rgba(26, 115, 184, 0.15);
    }

    .queue-item .row {
      display: flex;
      justify-content: space-between;
      gap: 0.6rem;
      align-items: center;
    }

    .queue-item .source {
      font-size: 0.73rem;
      color: #526d88;
      background: #f2f6fb;
      border-radius: 999px;
      padding: 0.15rem 0.5rem;
    }

    .queue-item .meta,
    .queue-item .bottom {
      font-size: 0.8rem;
      color: #536c87;
    }

    .project-summary h2 {
      margin-bottom: 0.4rem;
    }

    .project-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      font-size: 0.83rem;
      color: #4a647e;
      margin-bottom: 1rem;
    }

    .project-meta span {
      border: 1px solid #d8e2ef;
      background: #f8fbff;
      border-radius: 999px;
      padding: 0.2rem 0.55rem;
    }

    .state-card {
      border: 1px dashed #c9d8e8;
      border-radius: 12px;
      padding: 1rem;
      background: #fbfdff;
      margin-top: 1rem;
    }

    .qualification-card {
      margin-bottom: 0.9rem;
      border: 1px solid #d8e2ef;
      border-radius: 12px;
      padding: 0.9rem;
      background: #fcfdff;
    }

    .selection-card {
      margin-bottom: 0.9rem;
      border: 1px solid #d8e2ef;
      border-radius: 12px;
      padding: 0.9rem;
      background: #fcfdff;
    }

    .qualification-header {
      display: flex;
      justify-content: space-between;
      gap: 0.8rem;
      align-items: center;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }

    .qualification-header h3 {
      margin: 0;
      color: #1f3b58;
    }

    .qualification-header p {
      margin: 0.2rem 0 0;
      color: #56708c;
      font-size: 0.82rem;
    }

    .qualification-body {
      display: grid;
      gap: 0.75rem;
    }

    .qual-summary {
      margin: 0;
      color: #36536f;
      font-size: 0.9rem;
    }

    .qual-metrics {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-size: 0.8rem;
      color: #47637f;
    }

    .qual-metrics span {
      border-radius: 999px;
      border: 1px solid #d8e2ef;
      background: #f5f9fd;
      padding: 0.2rem 0.55rem;
    }

    .mini-section h4 {
      margin: 0 0 0.4rem;
      color: #2d4a66;
      font-size: 0.9rem;
    }

    .scope-row {
      border: 1px solid #dbe6f1;
      border-radius: 10px;
      padding: 0.6rem;
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.45rem;
      background: #ffffff;
    }

    .scope-row p {
      margin: 0.2rem 0 0.25rem;
      color: #4d6680;
      font-size: 0.83rem;
    }

    .scope-row small {
      display: block;
      color: #6a8198;
      font-size: 0.75rem;
      line-height: 1.3;
    }

    .decision-panel {
      border: 1px solid #dbe6f1;
      border-radius: 10px;
      padding: 0.65rem;
      background: #ffffff;
    }

    .decision-panel h4 {
      margin: 0 0 0.4rem;
      font-size: 0.88rem;
      color: #2d4a66;
    }

    textarea {
      width: 100%;
      min-height: 84px;
      border: 1px solid #cfddec;
      border-radius: 8px;
      padding: 0.5rem;
      font-family: inherit;
      font-size: 0.86rem;
      resize: vertical;
      box-sizing: border-box;
      margin-bottom: 0.5rem;
    }

    .decision-panel label {
      display: grid;
      gap: 0.35rem;
      font-size: 0.82rem;
      color: #3e5b77;
      margin-bottom: 0.45rem;
    }

    input {
      border: 1px solid #cfddec;
      border-radius: 8px;
      padding: 0.5rem;
      font-family: inherit;
      font-size: 0.86rem;
    }

    .selection-grid {
      display: grid;
      gap: 0.75rem;
    }

    .severity {
      align-self: start;
      border-radius: 999px;
      border: 1px solid #d8e2ef;
      padding: 0.15rem 0.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .severity.low {
      color: #1f7a49;
      border-color: #bde7cb;
      background: #edf9f2;
    }

    .severity.medium {
      color: #9b6a13;
      border-color: #f0deaa;
      background: #fff8e7;
    }

    .severity.high {
      color: #a44331;
      border-color: #f3c3bb;
      background: #fff2f0;
    }

    .decision-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .decision-result {
      border: 1px solid #dbe6f1;
      border-radius: 10px;
      padding: 0.65rem;
      background: #f8fbff;
    }

    .decision-result h4 {
      margin: 0 0 0.35rem;
      color: #2d4a66;
      font-size: 0.88rem;
    }

    .decision-result p {
      margin: 0;
      color: #3d5b78;
      font-size: 0.84rem;
    }

    .decision-result small {
      display: block;
      margin-top: 0.3rem;
      color: #597590;
      font-size: 0.8rem;
    }

    .next-step {
      justify-self: start;
      margin-top: 0.25rem;
    }

    .state-card h3 {
      margin: 0 0 0.4rem;
      color: #1f3b58;
    }

    .state-card p {
      margin: 0;
      color: #35516e;
      line-height: 1.4;
    }

    .state-card button {
      margin-top: 0.85rem;
    }

    .progress-wrap {
      margin-top: 0.75rem;
      width: 100%;
      background: #e8eff7;
      border-radius: 999px;
      height: 10px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      width: 70%;
      background: linear-gradient(90deg, #66a8db, #1a73b8);
      animation: pulse 2s ease-in-out infinite;
    }

    .progress-bar.uploading {
      width: 40%;
    }

    .muted {
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }

    .doc-list {
      margin-top: 0.8rem;
      display: grid;
      gap: 0.5rem;
    }

    .doc-row {
      border: 1px solid #d9e5f2;
      border-radius: 10px;
      padding: 0.65rem;
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: center;
      background: #ffffff;
    }

    .doc-row p {
      margin: 0.2rem 0 0;
      font-size: 0.82rem;
      color: #5b738d;
    }

    .doc-meta {
      text-align: right;
      font-size: 0.78rem;
      color: #5a738e;
      display: grid;
      gap: 0.2rem;
    }

    .mini-section {
      margin-bottom: 1rem;
    }

    .mini-section h3 {
      margin: 0 0 0.45rem;
      font-size: 0.9rem;
      color: #27445f;
    }

    .pill-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .pill {
      border-radius: 999px;
      padding: 0.2rem 0.6rem;
      font-size: 0.78rem;
      border: 1px solid #d4e2f0;
      background: #f4f8fc;
      color: #3f5d7a;
    }

    .warnings ul {
      margin: 0;
      padding-left: 1.1rem;
      color: #9a5134;
      font-size: 0.84rem;
    }

    .timeline-item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.55rem;
      align-items: start;
      margin-bottom: 0.65rem;
    }

    .timeline-item p {
      margin: 0;
      font-size: 0.86rem;
      color: #2f4c69;
    }

    .timeline-item small {
      color: #607b97;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 0.25rem;
      background: #77a2c8;
    }

    .dot.warning {
      background: #e89a3c;
    }

    .dot.error {
      background: #d65a4b;
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
      width: min(420px, 94vw);
      background: #f8fbff;
      border-left: 1px solid #cfe0ef;
      box-shadow: -18px 0 36px rgba(19, 38, 58, 0.22);
      transform: translateX(102%);
      transition: transform 220ms ease;
      z-index: 50;
      padding: 1rem;
      display: grid;
      gap: 0.85rem;
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

    .help-header h2 {
      margin: 0;
      font-size: 1.05rem;
    }

    .help-header p {
      margin: 0.3rem 0 0;
      color: #4a647f;
      font-size: 0.82rem;
    }

    .help-tabs {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .help-content {
      display: grid;
      gap: 0.7rem;
    }

    .help-topic h3 {
      margin: 0 0 0.45rem;
      color: #1f3b58;
      font-size: 0.98rem;
    }

    .help-topic p {
      margin: 0;
      color: #3f5e79;
      font-size: 0.86rem;
      line-height: 1.42;
    }

    .help-topic ul {
      margin: 0.6rem 0;
      padding-left: 1.1rem;
      color: #35536f;
      font-size: 0.84rem;
      line-height: 1.45;
    }

    .help-callout {
      border: 1px solid #c8dff3;
      background: #eaf5ff;
      border-radius: 10px;
      padding: 0.55rem;
      color: #17496f;
      font-size: 0.82rem;
      font-weight: 600;
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

    @keyframes pulse {
      0% {
        opacity: 0.65;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0.65;
      }
    }

    @media (max-width: 1280px) {
      .layout-grid {
        grid-template-columns: 1fr;
      }

      .help-drawer {
        width: 100vw;
      }

      .queue-item .row {
        align-items: flex-start;
      }

      .doc-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .doc-meta {
        text-align: left;
      }
    }
  `
})
export class ProposalsPageComponent {
  readonly intakeService = inject(ProposalsIntakeService);
  private readonly emptyOpportunity: BidOpportunity = {
    id: '',
    projectName: 'No opportunity selected',
    projectType: 'N/A',
    location: 'N/A',
    source: 'Open Bid',
    dueDate: new Date().toISOString(),
    manufacturer: 'N/A',
    estimatedValueUsd: 0,
    intakeStatus: 'not_started',
    score: 0,
    approvedManufacturers: [],
    docs: [],
    missingItems: [],
    events: []
  };

  readonly intakeStatusLabel: Record<IntakeStatus, string> = {
    not_started: 'Not started',
    uploading: 'Uploading',
    processing: 'Processing',
    ready: 'Intake complete',
    error: 'Needs attention'
  };

  readonly qualificationStatusLabel: Record<QualificationStatus, string> = {
    idle: 'Not started',
    running: 'Running',
    ready: 'Ready for decision',
    approved: 'Approved (GO)',
    rejected: 'Rejected (NO GO)',
    needs_review: 'Needs review'
  };

  readonly selectionStatusLabel: Record<SelectionStatus, string> = {
    idle: 'Not started',
    running: 'Running',
    ready: 'Ready for decision',
    approved: 'Approved',
    rejected: 'Rejected',
    needs_review: 'Needs review'
  };

  qualificationDecisionNotes = '';
  manufacturerPathModel = '';
  selectionDecisionNotes = '';
  helpDrawerOpen = false;
  activeHelpTopic: HelpTopic = 'intake';

  constructor() {
    this.intakeService.initialize();
  }

  get opportunities(): BidOpportunity[] {
    return this.intakeService.opportunities();
  }

  get selected(): BidOpportunity {
    return this.intakeService.selectedOpportunity() ?? this.opportunities[0] ?? this.emptyOpportunity;
  }

  get isLoading(): boolean {
    return this.intakeService.isLoading();
  }

  get errorMessage(): string | null {
    return this.intakeService.errorMessage();
  }

  get hasQualificationView(): boolean {
    const status = this.selected.qualificationStatus;
    return status !== undefined && status !== 'idle';
  }

  get hasSelectionView(): boolean {
    const status = this.selected.selectionStatus;
    return status !== undefined && status !== 'idle';
  }

  selectOpportunity(id: string): void {
    this.intakeService.selectOpportunity(id);
  }

  loadMockPackage(): void {
    this.intakeService.loadMockPackage();
  }

  resetIntake(): void {
    this.intakeService.resetIntake();
  }

  runQualification(): void {
    this.qualificationDecisionNotes = '';
    this.intakeService.runQualification();
  }

  approveQualification(decision: 'go' | 'no_go'): void {
    if (!this.qualificationDecisionNotes.trim()) {
      this.intakeService.setErrorMessage('Please enter a rationale before submitting a qualification decision.');
      return;
    }

    this.intakeService.approveQualification({
      decision,
      rationale: this.qualificationDecisionNotes
    });
  }

  proceedToSelection(): void {
    this.manufacturerPathModel = '';
    this.selectionDecisionNotes = '';
    this.intakeService.runSelection();
  }

  openHelpDrawer(): void {
    this.activeHelpTopic = this.contextualHelpTopic;
    this.helpDrawerOpen = true;
  }

  closeHelpDrawer(): void {
    this.helpDrawerOpen = false;
  }

  setHelpTopic(topic: HelpTopic): void {
    this.activeHelpTopic = topic;
  }

  approveSelection(decision: 'approve' | 'reject'): void {
    if (!this.manufacturerPathModel.trim()) {
      this.intakeService.setErrorMessage('Please enter the manufacturer-path model before submitting selection decision.');
      return;
    }

    if (!this.selectionDecisionNotes.trim()) {
      this.intakeService.setErrorMessage('Please enter rationale before submitting selection decision.');
      return;
    }

    this.intakeService.approveSelection({
      manufacturerModel: this.manufacturerPathModel,
      decision,
      rationale: this.selectionDecisionNotes
    });
  }

  private get contextualHelpTopic(): HelpTopic {
    if (this.hasSelectionView) {
      return 'selection';
    }

    if (this.hasQualificationView) {
      return 'qualification';
    }

    return 'intake';
  }
}
