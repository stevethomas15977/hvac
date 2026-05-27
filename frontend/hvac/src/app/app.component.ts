import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import { isCognitoConfigured, cognitoConfig } from './core/auth/cognito.config';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly auth = this.authService;
  readonly isConfigured = isCognitoConfigured(cognitoConfig);

  async ngOnInit(): Promise<void> {
    if (!this.isConfigured) {
      return;
    }

    await this.auth.initialize();
  }

  async onSignIn(): Promise<void> {
    await this.auth.startHostedSignIn();
  }

  async onSignOut(): Promise<void> {
    await this.auth.signOutUser();
  }
}
