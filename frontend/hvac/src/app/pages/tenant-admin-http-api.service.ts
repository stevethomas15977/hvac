import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TenantAdminApi } from './tenant-admin-api';
import { TenantAdminUpdatePayload, TenantAdminWorkspace } from './tenant-admin.models';

@Injectable({ providedIn: 'root' })
export class TenantAdminHttpApiService implements TenantAdminApi {
  private readonly baseUrl = '/api/admin/tenant';

  constructor(private readonly http: HttpClient) {}

  getWorkspace(): Observable<TenantAdminWorkspace> {
    return this.http.get<TenantAdminWorkspace>(`${this.baseUrl}/workspace`);
  }

  updateTenantAdmin(payload: TenantAdminUpdatePayload): Observable<TenantAdminWorkspace> {
    return this.http.post<TenantAdminWorkspace>(`${this.baseUrl}/users/admin-role`, payload);
  }
}
