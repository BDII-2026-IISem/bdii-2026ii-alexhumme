export type Status = 'active' | 'inactive';

export type Money = string;

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE';

export interface Timestamps {
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiError {
  detail?: string;
}

export function toNumber(
  value: Money | number | null | undefined,
): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}