import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RuntimeConfigService } from '../core/config/runtime-config.service';
import { TenantAdminApi } from './tenant-admin-api';
import { TenantAdminUpdatePayload, TenantAdminWorkspace } from './tenant-admin.models';

@Injectable({ providedIn: 'root' })
export class TenantAdminHttpApiService implements TenantAdminApi {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpClient,
    runtimeConfig: RuntimeConfigService
  ) {
    const configuredBaseUrl = runtimeConfig.config.app.proposalWizardApiBaseUrl ?? '';
    this.baseUrl = `${configuredBaseUrl}/api/admin/tenant`;
  }

  getWorkspace(): Observable<TenantAdminWorkspace> {
    return this.withAuthHeaders((headers) =>
      this.http.get<TenantAdminWorkspace>(`${this.baseUrl}/workspace`, {
        headers
      })
    );
  }

  updateTenantAdmin(payload: TenantAdminUpdatePayload): Observable<TenantAdminWorkspace> {
    return this.withAuthHeaders((headers) =>
      this.http.post<TenantAdminWorkspace>(`${this.baseUrl}/users/admin-role`, payload, {
        headers
      })
    );
  }

  private withAuthHeaders<T>(requestFactory: (headers: HttpHeaders | undefined) => Observable<T>): Observable<T> {
    return from(import('aws-amplify/auth').then(({ fetchAuthSession }) => fetchAuthSession())).pipe(
      switchMap((session) => {
        const idToken = session.tokens?.idToken?.toString();
        const headers = idToken
          ? new HttpHeaders({
              Authorization: `Bearer ${idToken}`
            })
          : undefined;

        return requestFactory(headers);
      })
    );
  }
}
