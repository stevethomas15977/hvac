import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { TenantAdminUpdatePayload, TenantAdminWorkspace } from '../models/tenant-admin.models';

export interface TenantAdminApi {
  getWorkspace(): Observable<TenantAdminWorkspace>;
  updateTenantAdmin(payload: TenantAdminUpdatePayload): Observable<TenantAdminWorkspace>;
}

export const TENANT_ADMIN_API = new InjectionToken<TenantAdminApi>('TENANT_ADMIN_API');
