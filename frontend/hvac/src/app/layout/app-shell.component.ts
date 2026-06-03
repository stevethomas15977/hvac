import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  imports: [NgIf, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="dashboard-shell">
      <header class="top-nav">
        <div class="brand">HVAC Portal</div>
        <nav class="nav-links" aria-label="Main">
          <a routerLink="/app/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          <a routerLink="/app/proposals" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Proposals</a>
          <a routerLink="/app/proposals/new" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">New Proposal</a>
          <a *ngIf="auth.isTenantAdmin()" routerLink="/app/admin" routerLinkActive="active">User Admin</a>
        </nav>
        <div class="profile-actions">
          <span class="username">{{ auth.currentUsername() }}</span>
          <button type="button" (click)="onSignOut()" [disabled]="auth.isLoading()">
            {{ auth.isLoading() ? 'Signing out...' : 'Sign out' }}
          </button>
        </div>
      </header>

      <main class="center-panel">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(160deg, #eef3f9 0%, #d8e3f0 100%);
      color: #1f2f44;
    }

    .dashboard-shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }

    .top-nav {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid #ccdae9;
      background: #ffffff;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .brand {
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .nav-links {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .nav-links a {
      text-decoration: none;
      color: #294462;
      padding: 0.45rem 0.7rem;
      border-radius: 8px;
      font-size: 0.92rem;
    }

    .nav-links a.active {
      background: #1a73b8;
      color: #ffffff;
    }

    .profile-actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .username {
      font-size: 0.87rem;
      color: #4c647f;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.88rem;
      background: #1a73b8;
      color: #ffffff;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .center-panel {
      padding: 1rem;
    }

    @media (max-width: 900px) {
      .top-nav {
        grid-template-columns: 1fr;
      }

      .profile-actions {
        justify-content: space-between;
      }
    }
  `
})
export class AppShellComponent {
  readonly auth = inject(AuthService);

  async onSignOut(): Promise<void> {
    await this.auth.signOutUser();
  }
}
