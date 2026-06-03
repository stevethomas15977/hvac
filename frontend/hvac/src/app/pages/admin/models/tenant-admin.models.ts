export interface TenantUser {
  username: string;
  email: string;
  groups: string[];
  isTenantAdmin: boolean;
  lastModifiedAt: string;
}

export type TenantAuditSeverity = 'info' | 'warning';

export interface TenantAuditEvent {
  id: string;
  message: string;
  actor: string;
  timestamp: string;
  severity: TenantAuditSeverity;
}

export interface TenantAdminWorkspace {
  tenantGroup: string;
  users: TenantUser[];
  events: TenantAuditEvent[];
}

export interface TenantAdminUpdatePayload {
  username: string;
  isTenantAdmin: boolean;
}
