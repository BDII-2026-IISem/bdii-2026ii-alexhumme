import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStore } from '../services/session-store';

/** ¿Qué puedes hacer? La ruta lo declara: data: { permission: 'GET /api/customers' }. */
export const permissionGuard: CanActivateFn = (route) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const permission = route.data?.['permission'] as string | undefined;
  if (!permission || session.canPermission(permission)) return true;
  return router.createUrlTree(['/forbidden'], {
    queryParams: { permission },
  });
};
