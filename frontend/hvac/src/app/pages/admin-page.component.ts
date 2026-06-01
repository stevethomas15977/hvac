import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TenantAdminService } from './tenant-admin.service';

@Component({
  selector: 'app-admin-page',
  imports: [NgIf, NgFor, NgClass, DatePipe, FormsModule],
  template: `
    <section class="admin-shell">
      <header class="panel header-panel">
        <div>
          <h1>Tenant Administration</h1>
          <p>Manage tenant users and admin role assignment for the current Cognito group.</p>
          <p class="inline-message" *ngIf="service.isLoading()">Syncing tenant workspace...</p>
          <p class="inline-message error" *ngIf="service.errorMessage()">{{ service.errorMessage() }}</p>
        </div>
        <div class="header-actions">
          <span class="tenant-chip" *ngIf="service.workspace() as workspace">{{ workspace.tenantGroup }}</span>
          <button type="button" class="ghost" (click)="service.refresh()" [disabled]="service.isLoading()">Refresh</button>
        </div>
      </header>

      <div class="layout-grid" *ngIf="service.workspace() as workspace">
        <section class="panel">
          <div class="panel-head">
            <h2>Tenant Users</h2>
            <input
              [ngModel]="service.filter()"
              (ngModelChange)="service.setFilter($event)"
              placeholder="Search by username or email" />
          </div>

          <div class="empty-state" *ngIf="service.filteredUsers().length === 0">
            No users matched your filter.
          </div>

          <article class="user-row" *ngFor="let user of service.filteredUsers()">
            <div>
              <div class="row-top">
                <strong>{{ user.username }}</strong>
                <span class="admin-badge" [ngClass]="{ active: user.isTenantAdmin }">
                  {{ user.isTenantAdmin ? 'Tenant Admin' : 'Standard User' }}
                </span>
              </div>
              <p>{{ user.email }}</p>
              <small class="group-list">Groups: {{ user.groups.join(', ') || 'None' }}</small>
              <small>Last updated {{ user.lastModifiedAt | date: 'MMM d, h:mm a' }}</small>
            </div>
            <div class="row-actions">
              <button
                type="button"
                class="ghost"
                [disabled]="service.isLoading()"
                (click)="service.updateTenantAdmin(user.username, !user.isTenantAdmin)">
                {{ user.isTenantAdmin ? 'Revoke Admin' : 'Make Admin' }}
              </button>
            </div>
          </article>
        </section>

        <aside class="panel">
          <h2>Audit Events</h2>
          <div class="empty-state" *ngIf="workspace.events.length === 0">No events recorded.</div>
          <article class="event-row" *ngFor="let event of workspace.events">
            <div class="event-dot" [ngClass]="event.severity"></div>
            <div>
              <p>{{ event.message }}</p>
              <small>{{ event.actor }} · {{ event.timestamp | date: 'MMM d, h:mm a' }}</small>
            </div>
          </article>
        </aside>
      </div>

      <section class="panel empty-state" *ngIf="!service.workspace() && !service.isLoading()">
        No tenant workspace loaded.
      </section>
    </section>
  `,
  styles: `
    .admin-shell {
      display: grid;
      gap: 1rem;
    }

    .panel {
      background: #ffffff;
      border: 1px solid #d8e2ef;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 10px 20px rgba(34, 56, 84, 0.08);
    }

    .header-panel {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.35rem;
      color: #1f3b58;
    }

    p {
      margin: 0;
      color: #35516e;
    }

    h2 {
      margin: 0;
      font-size: 1.05rem;
      color: #1f3b58;
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
      gap: 0.55rem;
      flex-wrap: wrap;
    }

    .tenant-chip {
      border-radius: 999px;
      border: 1px solid #cce0f3;
      background: #eef7ff;
      color: #1f4f76;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.22rem 0.6rem;
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

    .layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }

    input {
      border: 1px solid #cfddec;
      border-radius: 8px;
      padding: 0.45rem 0.55rem;
      font-family: inherit;
      font-size: 0.85rem;
      min-width: 230px;
    }

    .user-row {
      border: 1px solid #d9e6f1;
      border-radius: 10px;
      padding: 0.65rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.8rem;
      margin-bottom: 0.55rem;
    }

    .row-top {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.15rem;
      flex-wrap: wrap;
    }

    .user-row p {
      font-size: 0.84rem;
      color: #4f6882;
      margin-bottom: 0.1rem;
    }

    .user-row small {
      color: #6a8198;
      font-size: 0.76rem;
    }

    .group-list {
      display: block;
      margin-bottom: 0.15rem;
    }

    .admin-badge {
      border-radius: 999px;
      border: 1px solid #d3dceb;
      background: #edf2f9;
      color: #405a77;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.12rem 0.45rem;
      white-space: nowrap;
    }

    .admin-badge.active {
      border-color: #bde7cb;
      background: #edf9f2;
      color: #1d7b48;
    }

    .event-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.55rem;
      align-items: start;
      margin-bottom: 0.6rem;
    }

    .event-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 0.25rem;
      background: #77a2c8;
    }

    .event-dot.warning {
      background: #e89a3c;
    }

    .event-row p {
      font-size: 0.84rem;
      color: #2f4c69;
      margin-bottom: 0.12rem;
    }

    .event-row small {
      color: #607b97;
      font-size: 0.76rem;
    }

    .empty-state {
      color: #5d738b;
      font-size: 0.85rem;
    }

    @media (max-width: 1100px) {
      .layout-grid {
        grid-template-columns: 1fr;
      }

      .user-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `
})
export class AdminPageComponent {
  readonly service = inject(TenantAdminService);

  constructor() {
    this.service.initialize();
  }
}
