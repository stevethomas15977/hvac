import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { TenantAdminApi } from '../api/tenant-admin-api';
import { TenantAdminUpdatePayload, TenantAdminWorkspace } from '../models/tenant-admin.models';

@Injectable({ providedIn: 'root' })
export class TenantAdminMockApiService implements TenantAdminApi {
  private readonly workspace: TenantAdminWorkspace = {
    tenantGroup: 'tenant_softwarelikeyou',
    users: [
      {
        username: 'Steve',
        email: 'steve.thomas@softwarelikeyou.com',
        groups: ['tenant_softwarelikeyou', 'tenant_softwarelikeyou_admin'],
        isTenantAdmin: true,
        lastModifiedAt: new Date('2026-05-29T12:25:00Z').toISOString()
      },
      {
        username: 'JordanLee',
        email: 'jordan.lee@softwarelikeyou.com',
        groups: ['tenant_softwarelikeyou'],
        isTenantAdmin: false,
        lastModifiedAt: new Date('2026-05-27T15:05:00Z').toISOString()
      },
      {
        username: 'TaylorBrooks',
        email: 'taylor.brooks@softwarelikeyou.com',
        groups: ['tenant_softwarelikeyou'],
        isTenantAdmin: false,
        lastModifiedAt: new Date('2026-05-26T18:20:00Z').toISOString()
      }
    ],
    events: [
      {
        id: 'evt-1',
        message: 'Tenant admin workspace opened in mock mode.',
        actor: 'system',
        timestamp: new Date('2026-05-29T12:40:00Z').toISOString(),
        severity: 'info'
      }
    ]
  };

  getWorkspace(): Observable<TenantAdminWorkspace> {
    return of(structuredClone(this.workspace)).pipe(delay(220));
  }

  updateTenantAdmin(payload: TenantAdminUpdatePayload): Observable<TenantAdminWorkspace> {
    const target = this.workspace.users.find((item) => item.username === payload.username);
    if (!target) {
      return throwError(() => new Error('User not found in tenant group.'));
    }

    target.isTenantAdmin = payload.isTenantAdmin;
    target.lastModifiedAt = new Date().toISOString();

    const adminGroup = `${this.workspace.tenantGroup}_admin`;
    const hasAdminGroup = target.groups.includes(adminGroup);
    if (payload.isTenantAdmin && !hasAdminGroup) {
      target.groups = [...target.groups, adminGroup];
    }

    if (!payload.isTenantAdmin && hasAdminGroup) {
      target.groups = target.groups.filter((item) => item !== adminGroup);
    }

    this.workspace.events = [
      {
        id: `evt-${Date.now()}`,
        message: `${payload.username} ${payload.isTenantAdmin ? 'granted' : 'removed from'} tenant admin role.`,
        actor: 'tenant.admin',
        timestamp: new Date().toISOString(),
        severity: payload.isTenantAdmin ? 'info' : 'warning'
      },
      ...this.workspace.events
    ];

    return of(structuredClone(this.workspace)).pipe(delay(280));
  }
}
