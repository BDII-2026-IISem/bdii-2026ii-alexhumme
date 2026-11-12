import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStore } from '../services/session-store';

/** Con sesión abierta, /login no tiene nada que ofrecer: al panel (`/dashboard`). */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  if (!session.isAuthenticated()) return true;
  return router.createUrlTree(['/dashboard']);
};
