import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { SessionStore } from '../services/session-store';
import { authGuard } from './auth-guard';
import { permissionGuard } from './permission-guard';

/** Ejecuta un guard con una sesión simulada y devuelve su decisión. */
function run(
  guard: CanActivateFn,
  url: string,
  allowed: boolean,
  data: Record<string, unknown> = {},
) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: SessionStore,
        useValue: { isAuthenticated: () => allowed, canPermission: () => allowed },
      },
    ],
  });
  return TestBed.runInInjectionContext(() =>
    guard(
      { data } as unknown as ActivatedRouteSnapshot,
      { url } as RouterStateSnapshot,
    ),
  );
}

describe('guards de RBAC', () => {
  it('authGuard manda a /login con returnUrl cuando no hay sesión', () => {
    const result = run(authGuard, '/clientes', false);
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).queryParams['returnUrl']).toBe('/clientes');
  });

  it('permissionGuard deja pasar con la concesión', () => {
    expect(
      run(permissionGuard, '/clientes', true, {
        permission: 'GET /api/customers',
      }),
    ).toBe(true);
  });

  it('permissionGuard desvía a /forbidden con el permiso que falta', () => {
    const result = run(permissionGuard, '/clientes', false, {
      permission: 'GET /api/customers',
    });
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).queryParams['permission']).toBe(
      'GET /api/customers',
    );
  });
});
