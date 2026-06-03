import { computed, Inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { TENANT_ADMIN_API, TenantAdminApi } from '../api/tenant-admin-api';
import { TenantAdminWorkspace, TenantUser } from '../models/tenant-admin.models';

@Injectable({ providedIn: 'root' })
export class TenantAdminService {
  readonly workspace = signal<TenantAdminWorkspace | null>(null);
  readonly filter = signal('');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filteredUsers = computed<TenantUser[]>(() => {
    const data = this.workspace();
    if (!data) {
      return [];
    }

    const search = this.filter().trim().toLowerCase();
    if (!search) {
      return data.users;
    }

    return data.users.filter((user) => {
      return user.username.toLowerCase().includes(search) || user.email.toLowerCase().includes(search);
    });
  });

  constructor(@Inject(TENANT_ADMIN_API) private readonly api: TenantAdminApi) {}

  initialize(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api
      .getWorkspace()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (workspace) => this.workspace.set(workspace),
        error: (error: unknown) => this.errorMessage.set(this.toErrorMessage(error))
      });
  }

  setFilter(value: string): void {
    this.filter.set(value);
  }

  refresh(): void {
    this.initialize();
  }

  updateTenantAdmin(username: string, isTenantAdmin: boolean): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api
      .updateTenantAdmin({ username, isTenantAdmin })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (workspace) => this.workspace.set(workspace),
        error: (error: unknown) => this.errorMessage.set(this.toErrorMessage(error))
      });
  }

  private toErrorMessage(error: unknown): string {
    const nestedMessage = this.getNestedApiErrorMessage(error);
    if (nestedMessage) {
      return nestedMessage;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unable to process tenant administration action.';
  }

  private getNestedApiErrorMessage(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const errorWithPayload = error as {
      error?: {
        error?: {
          message?: unknown;
        };
        message?: unknown;
      };
      message?: unknown;
    };

    const apiErrorMessage = errorWithPayload.error?.error?.message;
    if (typeof apiErrorMessage === 'string' && apiErrorMessage.trim()) {
      return apiErrorMessage;
    }

    const topLevelErrorMessage = errorWithPayload.error?.message;
    if (typeof topLevelErrorMessage === 'string' && topLevelErrorMessage.trim()) {
      return topLevelErrorMessage;
    }

    const fallbackMessage = errorWithPayload.message;
    if (typeof fallbackMessage === 'string' && fallbackMessage.trim()) {
      return fallbackMessage;
    }

    return null;
  }
}
