import { Injectable, signal } from '@angular/core';
import { fetchAuthSession, getCurrentUser, signInWithRedirect, signOut } from 'aws-amplify/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUsername = signal<string | null>(null);
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
    await this.refreshCurrentUser();
  }

  async startHostedSignIn(): Promise<void> {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      await signInWithRedirect();
    } catch (error) {
      this.errorMessage.set(this.toErrorMessage(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async signOutUser(): Promise<void> {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      await signOut();
      this.currentUsername.set(null);
    } catch (error) {
      this.errorMessage.set(this.toErrorMessage(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async getUserGroups(): Promise<string[]> {
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
      const user = await getCurrentUser();
      this.currentUsername.set(user.username);
    } catch {
      this.currentUsername.set(null);
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Authentication failed.';
  }
}
