import { Injectable, signal } from '@angular/core';
import { getCurrentUser, signInWithRedirect, signOut } from 'aws-amplify/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUsername = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isAuthenticated = () => this.currentUsername() !== null;

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
