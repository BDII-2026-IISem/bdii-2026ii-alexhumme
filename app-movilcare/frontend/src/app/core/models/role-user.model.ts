import { Status, Timestamps } from './api.model';

/** Tabla `role_users` — /api/role-users/. `role` + `user` es único. */
export interface RoleUser extends Timestamps {
  id: number;
  role: number;
  user: number;
  status: Status;
}

export interface RoleUserPayload {
  role: number;
  user: number;
  status: Status;
}
