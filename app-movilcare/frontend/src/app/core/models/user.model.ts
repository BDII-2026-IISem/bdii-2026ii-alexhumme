import { Status, Timestamps } from './api.model';

/** Tabla `users` — /api/users/. La respuesta NUNCA trae `password`. */
export interface User extends Timestamps {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: Status;
}

/** Cuerpo de escritura. `password` va solo en el alta y es de solo escritura. */
export interface UserPayload {
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: Status;
  password?: string;
}
