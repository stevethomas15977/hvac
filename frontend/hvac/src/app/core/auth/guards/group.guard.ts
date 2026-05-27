import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export interface GroupGuardData {
  requiredGroups?: string[];
}

export const groupGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const data = route.data as GroupGuardData;
  const requiredGroups = data.requiredGroups ?? [];

  await auth.ensureInitialized();

  if (!auth.isAuthenticated()) {
    await auth.startHostedSignIn();
    return false;
  }

  const allowed = await auth.hasAnyGroup(requiredGroups);
  return allowed ? true : router.createUrlTree(['/app/dashboard']);
};
