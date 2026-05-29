import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { PROPOSAL_INTAKE_API } from './pages/proposal-intake-api';
import { ProposalsIntakeHttpApiService } from './pages/proposals-intake-http-api.service';
import { ProposalsIntakeMockApiService } from './pages/proposals-intake-mock-api.service';
import { TENANT_ADMIN_API } from './pages/tenant-admin-api';
import { TenantAdminHttpApiService } from './pages/tenant-admin-http-api.service';
import { TenantAdminMockApiService } from './pages/tenant-admin-mock-api.service';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAppInitializer(() => inject(RuntimeConfigService).initialize()),
    {
      provide: PROPOSAL_INTAKE_API,
      useFactory: () => {
        const mode = inject(RuntimeConfigService).config.app.proposalApiMode;
        return mode === 'http'
          ? inject(ProposalsIntakeHttpApiService)
          : inject(ProposalsIntakeMockApiService);
      }
    },
    {
      provide: TENANT_ADMIN_API,
      useFactory: () => {
        const mode = inject(RuntimeConfigService).config.app.proposalApiMode;
        return mode === 'http'
          ? inject(TenantAdminHttpApiService)
          : inject(TenantAdminMockApiService);
      }
    }
  ]
};
