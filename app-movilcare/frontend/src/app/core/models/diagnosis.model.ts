import { Status, Timestamps } from './api.model';

/** Diagnóstico técnico de una orden (modelo.md: Diagnostico). */
export interface Diagnosis extends Timestamps {
  id: number;
  serviceOrderId: number;
  serviceOrderNumber: string;
  description: string;
  diagnosisDate: string;
  observations: string | null;
  status: Status;
}

export type DiagnosisPayload = Omit<
  Diagnosis,
  'id' | 'serviceOrderNumber' | 'createdAt' | 'updatedAt'
>;
