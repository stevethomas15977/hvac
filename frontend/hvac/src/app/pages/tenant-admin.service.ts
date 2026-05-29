import { computed, Inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { TENANT_ADMIN_API, TenantAdminApi } from './tenant-admin-api';
import { TenantAdminWorkspace, TenantUser } from './tenant-admin.models';

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
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unable to process tenant administration action.';
  }
}
