import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <main class="auth-flow">
      <section class="auth-card">
        <h1>Finishing sign in</h1>
        <p>{{ message() }}</p>
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
    }

    h1 {
      margin: 0 0 0.65rem;
      font-size: 1.25rem;
      color: #1f3b58;
    }

    p {
      margin: 0;
      color: #35516e;
    }
  `
})
export class AuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly message = signal('Validating session...');

  async ngOnInit(): Promise<void> {
    await this.auth.initialize();

    if (this.auth.isAuthenticated()) {
      await this.router.navigateByUrl('/app/dashboard');
      return;
    }

    this.message.set('Sign-in was not completed. Please try again.');
  }
}
