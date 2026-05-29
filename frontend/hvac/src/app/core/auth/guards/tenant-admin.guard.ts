import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const tenantAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureInitialized();

  if (!auth.isAuthenticated()) {
    await auth.startHostedSignIn();
    return false;
  }

  const allowed = await auth.hasTenantAdminAccess();
  return allowed ? true : router.createUrlTree(['/app/dashboard']);
};