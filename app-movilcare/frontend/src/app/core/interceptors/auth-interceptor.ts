import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';

import { TokenPair } from '../models/auth.model';
import { AuthService } from '../services/auth';
import { Notification } from '../services/notification';
import { SessionStore } from '../services/session-store';

/** Un único refresh en vuelo para todas las peticiones que reciban 401. */
let refreshInFlight: Observable<TokenPair> | null = null;
/** Rutas que emiten o revocan tokens: no llevan Bearer ni se reintentan. */
const TOKEN_ENDPOINTS = ['/auth/login/', '/auth/refresh/', '/auth/logout/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(Notification);

  const isTokenEndpoint = TOKEN_ENDPOINTS.some((endpoint) =>
    req.url.includes(endpoint),
  );
  const access = session.accessToken();
  const request =
    access && !isTokenEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${access}` } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        isTokenEndpoint
      ) {
        return throwError(() => error);
      }
      if (!session.refreshToken()) {
        redirectToLogin(session, router, notify);
        return throwError(() => error);
      }
      // `??=`: si ya hay un refresh en vuelo se comparte, no se abre otro.
      refreshInFlight ??= auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          redirectToLogin(session, router, notify);
          return throwError(() => refreshError);
        }),
        finalize(() => {
          refreshInFlight = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      // Reintento con el access nuevo; si vuelve a fallar no se reejecuta
      // este catchError (evita el bucle infinito de refrescos).
      return refreshInFlight.pipe(
        switchMap(() => {
          const renewed = session.accessToken();
          return next(
            renewed
              ? req.clone({
                  setHeaders: { Authorization: `Bearer ${renewed}` },
                })
              : req,
          );
        }),
      );
    }),
  );
};

function redirectToLogin(
  session: SessionStore,
  router: Router,
  notify: Notification,
): void {
  session.clear();
  notify.error('Sesión vencida', 'Vuelve a iniciar sesión.');
  // En MovilCare el inicio es /clientes (el comodín `''` redirige allí).
  const returnUrl = router.url.startsWith('/login') ? '/clientes' : router.url;
  void router.navigate(['/login'], { queryParams: { returnUrl } });
}
