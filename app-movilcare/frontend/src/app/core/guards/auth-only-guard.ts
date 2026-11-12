import { authGuard } from './auth-guard';

/** Mismo cuerpo, otra intención: /perfil exige sesión y ningún permiso. */
export const authOnlyGuard = authGuard;
