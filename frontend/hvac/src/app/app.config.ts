import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { PROPOSAL_INTAKE_API } from './pages/proposals/api/proposal-intake-api';
import { ProposalsIntakeHttpApiService } from './pages/proposals/services/proposals-intake-http-api.service';
import { ProposalsIntakeMockApiService } from './pages/proposals/mocks/proposals-intake-mock-api.service';
import { PROPOSAL_WIZARD_API } from './pages/proposals/wizard/api/proposal-wizard-api';
import { ProposalWizardHttpApiService } from './pages/proposals/wizard/services/proposal-wizard-http-api.service';
import { ProposalWizardMockApiService } from './pages/proposals/wizard/mocks/proposal-wizard-mock-api.service';
import { TENANT_ADMIN_API } from './pages/admin/api/tenant-admin-api';
import { TenantAdminHttpApiService } from './pages/admin/services/tenant-admin-http-api.service';
import { TenantAdminMockApiService } from './pages/admin/mocks/tenant-admin-mock-api.service';

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
        const authMode = inject(RuntimeConfigService).config.app.authMode;
        return authMode === 'cognito'
          ? inject(TenantAdminHttpApiService)
          : inject(TenantAdminMockApiService);
      }
    },
    {
      provide: PROPOSAL_WIZARD_API,
      useFactory: () => {
        const mode = inject(RuntimeConfigService).config.app.proposalWizardApiMode;
        return mode === 'http'
          ? inject(ProposalWizardHttpApiService)
          : inject(ProposalWizardMockApiService);
      }
    }
  ]
};
