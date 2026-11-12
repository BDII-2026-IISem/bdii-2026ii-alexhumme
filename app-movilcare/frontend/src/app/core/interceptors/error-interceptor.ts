import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { Notification } from '../services/notification';

/** Rutas de sesión: su error se explica en el formulario, no en un toast. */
const AUTH_ENTRY = ['/auth/login/', '/auth/refresh/', '/auth/logout/'];
const MENSAJES: Record<number, [string, string]> = {
  0: [
    'Sin conexión con la API',
    'Verifica que Django esté en http://127.0.0.1:8000.',
  ],
  403: [
    'Acceso denegado',
    'Tu rol no tiene el permiso que exige esta operación.',
  ],
  404: ['Registro no encontrado', 'El registro ya no existe.'],
  409: ['Dato duplicado', 'Ese valor ya está registrado.'],
};
let lastToast = { key: '', at: 0 };

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(Notification);
  return next(req).pipe(
    catchError((error: unknown) => {
      // 400: lo pinta el formulario con toApiMessage. 401: lo resuelve
      // authInterceptor. 401/400 no están en MENSAJES, así que no toastea.
      if (
        error instanceof HttpErrorResponse &&
        !AUTH_ENTRY.some((endpoint) => req.url.includes(endpoint))
      ) {
        const message = MENSAJES[error.status];
        if (message) {
          toastOnce(`${error.status}-${req.url}`, () =>
            notify.error(message[0], message[1]),
          );
        } else if (error.status >= 500) {
          toastOnce(`server-${error.status}`, () =>
            notify.error('Error del servidor', 'Revisa la consola de Django.'),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};

/** Un mismo fallo repetido en ráfaga produce un solo aviso. */
function toastOnce(key: string, show: () => void): void {
  const now = Date.now();
  if (lastToast.key === key && now - lastToast.at < 4000) {
    return;
  }
  lastToast = { key, at: now };
  show();
}
