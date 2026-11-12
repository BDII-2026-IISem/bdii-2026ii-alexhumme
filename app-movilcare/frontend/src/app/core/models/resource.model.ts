import { HttpMethod, Status, Timestamps } from './api.model';

/**
 * Tabla `resources` — /api/resources/. `route` es la ruta de `resolve()`
 * de Django (sin barra inicial, con conversor): `api/customers/<int:pk>/`.
 * La tupla (method, route) es única.
 */
export interface Resource extends Timestamps {
  id: number;
  name: string;
  method: HttpMethod;
  route: string;
  status: Status;
}

export interface ResourcePayload {
  name: string;
  method: HttpMethod;
  route: string;
  status: Status;
}
