import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { tenantAdminGuard } from './core/auth/guards/tenant-admin.guard';
import { AppShellComponent } from './layout/app-shell.component';
import { AdminPageComponent } from './pages/admin-page.component';
import { AuthCallbackComponent } from './pages/auth-callback.component';
import { DashboardHomeComponent } from './pages/dashboard-home.component';
import { LoggedOutComponent } from './pages/logged-out.component';
import { ProposalsNewWizardComponent } from './pages/proposals-new-wizard.component';
import { ProposalsPageComponent } from './pages/proposals-page.component';

export const routes: Routes = [
	{
		path: 'callback',
		component: AuthCallbackComponent
	},
	{
		path: 'logout',
		component: LoggedOutComponent
	},
	{
		path: 'app',
		canActivate: [authGuard],
		component: AppShellComponent,
		children: [
			{
				path: 'dashboard',
				component: DashboardHomeComponent
			},
			{
				path: 'proposals',
				component: ProposalsPageComponent
			},
			{
				path: 'proposals/new',
				component: ProposalsNewWizardComponent
			},
			{
				path: 'admin',
				canActivate: [tenantAdminGuard],
				component: AdminPageComponent
			},
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'dashboard'
			}
		]
	},
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'app/dashboard'
	},
	{
		path: '**',
		redirectTo: 'app/dashboard'
	}
];
