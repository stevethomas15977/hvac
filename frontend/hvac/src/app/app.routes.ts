import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { tenantAdminGuard } from './core/auth/guards/tenant-admin.guard';
import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
	{
		path: 'callback',
		loadComponent: () => import('./pages/auth-callback.component').then((module) => module.AuthCallbackComponent)
	},
	{
		path: 'logout',
		loadComponent: () => import('./pages/logged-out.component').then((module) => module.LoggedOutComponent)
	},
	{
		path: 'app',
		canActivate: [authGuard],
		component: AppShellComponent,
		children: [
			{
				path: 'dashboard',
				loadComponent: () => import('./pages/dashboard-home.component').then((module) => module.DashboardHomeComponent)
			},
			{
				path: 'proposals',
				loadComponent: () => import('./pages/proposals-page.component').then((module) => module.ProposalsPageComponent)
			},
			{
				path: 'proposals/new',
				loadComponent: () => import('./pages/proposals-new-wizard.component').then((module) => module.ProposalsNewWizardComponent)
			},
			{
				path: 'admin',
				canActivate: [tenantAdminGuard],
				loadComponent: () => import('./pages/admin-page.component').then((module) => module.AdminPageComponent)
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
