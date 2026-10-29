import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../models/api.model';

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos del formulario.',
  401: 'La sesión no es válida. Inicia sesión nuevamente.',
  403: 'No tienes autorización para esta operación.',
  404: 'El registro solicitado no existe.',
  409: 'El registro genera un conflicto con los datos existentes.',
};

export function toApiMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error
      ? error.message
      : 'Se produjo un error inesperado.';
  }

  if (error.status === 0) {
    return 'No se pudo conectar con la API de MovilCare.';
  }

  const body: unknown = error.error;

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const detail = (body as ApiError).detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }

    for (const [field, value] of Object.entries(
      body as Record<string, unknown>,
    )) {
      const message = Array.isArray(value) ? value[0] : value;

      if (typeof message === 'string' && message.trim()) {
        return `${field}: ${message.trim()}`;
      }
    }
  }

  return HTTP_MESSAGES[error.status] ?? error.message;
}