import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-logged-out',
  template: `
    <main class="auth-flow">
      <section class="auth-card">
        <h1>Signed out</h1>
        <p>You are currently signed out from HVAC Portal.</p>
        <button type="button" (click)="onSignIn()" [disabled]="auth.isLoading()">
          {{ auth.isLoading() ? 'Redirecting...' : 'Sign in again' }}
        </button>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(145deg, #f4f7fb 0%, #dde8f5 100%);
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }

    .auth-flow {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }

    .auth-card {
      background: #ffffff;
      border: 1px solid #d8e2ef;
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(34, 56, 84, 0.12);
      padding: 1.25rem;
      width: min(420px, 100%);
      display: grid;
      gap: 0.9rem;
    }

    h1 {
      margin: 0;
      font-size: 1.25rem;
      color: #1f3b58;
    }

    p {
      margin: 0;
      color: #35516e;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 0.7rem 1rem;
      font-size: 0.95rem;
      background: #1a73b8;
      color: #ffffff;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
  `
})
export class LoggedOutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    this.auth.initialize();
  }

  async onSignIn(): Promise<void> {
    if (this.auth.isAuthenticated()) {
      await this.router.navigateByUrl('/app/dashboard');
      return;
    }

    await this.auth.startHostedSignIn();
  }
}
