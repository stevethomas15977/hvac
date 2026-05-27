import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);

  await auth.ensureInitialized();

  if (auth.isAuthenticated()) {
    return true;
  }

  await auth.startHostedSignIn();
  return false;
};
