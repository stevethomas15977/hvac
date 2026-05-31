import { Injectable, inject, signal } from '@angular/core';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { buildCognitoConfig, isCognitoConfigured } from './cognito.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly runtimeConfig = inject(RuntimeConfigService);

  readonly currentUsername = signal<string | null>(null);
  readonly isTenantAdmin = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isAuthenticated = () => this.currentUsername() !== null;

  async ensureInitialized(): Promise<void> {
    if (this.currentUsername() !== null) {
      return;
    }

    await this.initialize();
  }

  async initialize(): Promise<void> {
    this.errorMessage.set(null);

    if (this.isLocalAuthMode()) {
      this.currentUsername.set('local.estimator');
      this.isTenantAdmin.set(true);
      return;
    }

    await this.refreshCurrentUser();
  }

  async startHostedSignIn(): Promise<void> {
    if (this.isLocalAuthMode()) {
      this.currentUsername.set('local.estimator');
      this.isTenantAdmin.set(true);
      return;
    }

    if (!this.isHostedSignInConfigured()) {
      this.errorMessage.set('Cognito is not configured for this environment.');
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      const { signInWithRedirect } = await import('aws-amplify/auth');
      await signInWithRedirect();
    } catch (error) {
      this.errorMessage.set(this.toErrorMessage(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async signOutUser(): Promise<void> {
    if (this.isLocalAuthMode()) {
      this.currentUsername.set(null);
      this.isTenantAdmin.set(false);
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      const { signOut } = await import('aws-amplify/auth');
      await signOut();
      this.currentUsername.set(null);
      this.isTenantAdmin.set(false);
    } catch (error) {
      this.errorMessage.set(this.toErrorMessage(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async hasTenantAdminAccess(): Promise<boolean> {
    if (this.isLocalAuthMode()) {
      this.isTenantAdmin.set(true);
      return true;
    }

    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const tenantAdmin = this.toBooleanClaimValue(session.tokens?.idToken?.payload['custom:tenant_admin']);
    this.isTenantAdmin.set(tenantAdmin);
    return tenantAdmin;
  }

  async getUserGroups(): Promise<string[]> {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const groups = session.tokens?.idToken?.payload['cognito:groups'];

    if (Array.isArray(groups)) {
      return groups.filter((value): value is string => typeof value === 'string');
    }

    return [];
  }

  async hasAnyGroup(requiredGroups: string[]): Promise<boolean> {
    if (requiredGroups.length === 0) {
      return true;
    }

    const groups = await this.getUserGroups();
    return requiredGroups.some((group) => groups.includes(group));
  }

  private async refreshCurrentUser(): Promise<void> {
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      this.currentUsername.set(user.username);
      await this.hasTenantAdminAccess();
    } catch {
      this.currentUsername.set(null);
      this.isTenantAdmin.set(false);
    }
  }

  private toBooleanClaimValue(value: unknown): boolean {
    return value === true || value === 'true' || value === 'yes';
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Authentication failed.';
  }

  private isLocalAuthMode(): boolean {
    return this.runtimeConfig.config.app.authMode !== 'cognito';
  }

  private isHostedSignInConfigured(): boolean {
    const cognitoConfig = buildCognitoConfig(this.runtimeConfig.config.cognito);
    return isCognitoConfigured(cognitoConfig);
  }
}
