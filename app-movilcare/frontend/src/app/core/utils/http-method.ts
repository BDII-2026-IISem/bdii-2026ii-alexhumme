import { HttpMethod } from '../models/api.model';

/** Opciones del `p-select` de `method`: el valor es el propio verbo. */
export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
];

const SEVERITY: Record<HttpMethod, 'info' | 'success' | 'warn' | 'danger'> =
  {
    GET: 'info',
    POST: 'success',
    PUT: 'warn',
    PATCH: 'warn',
    DELETE: 'danger',
  };

/** Lectura informativa, escritura en aviso, borrado en peligro. */
export const methodSeverity = (method?: HttpMethod) =>
  method ? SEVERITY[method] : 'secondary';
