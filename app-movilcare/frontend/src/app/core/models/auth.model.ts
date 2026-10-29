import { Status, Timestamps } from './api.model';

export interface User extends Timestamps {
  id: number;
  username: string;
  email: string;
  status: Status;
}

export interface SessionTokens {
  access: string;
  refresh: string;
  tokenType: 'Bearer';
}

export interface EffectivePermission {
  method: string;
  path: string;
  roleId: number;
  roleName: string;
}