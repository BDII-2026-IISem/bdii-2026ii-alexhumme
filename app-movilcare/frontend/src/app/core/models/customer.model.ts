import { Status, Timestamps } from './api.model';

export interface Customer extends Timestamps {
  id: number;
  documentType: string;
  documentNumber: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: Status;
}

export type CustomerPayload = Omit<
  Customer,
  'id' | 'createdAt' | 'updatedAt'
>;