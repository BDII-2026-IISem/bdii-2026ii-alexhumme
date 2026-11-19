import { Status, Timestamps } from './api.model';

/** Tabla `resource_roles` — /api/resource-roles/. ESTA fila es el permiso. */
export interface ResourceRole extends Timestamps {
  id: number;
  resource: number;
  role: number;
  status: Status;
}

export interface ResourceRolePayload {
  resource: number;
  role: number;
  status: Status;
}
