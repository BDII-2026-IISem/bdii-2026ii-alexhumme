import { HttpMethod, Status } from './api.model';

/** El login acepta username, email o ambos: nunca un campo combinado. */
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

/** Lo único que devuelve el login y lo único que rota con el refresh. */
export interface TokenPair {
  access: string;
  refresh: string;
  tokenType: 'Bearer';
  accessExpiresIn: number;
}

/** `GET /api/auth/profile/` directo, sin envoltorio ni avatar. */
export interface SessionUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  status: Status;
}

/** Una fila de `GET /api/auth/permissions/`. */
export interface EffectivePermission {
  method: HttpMethod;
  path: string;
  roleId: number;
  roleName: string;
}