import { Money, Status, Timestamps } from './api.model';

/** Repuesto de bodega (modelo.md: Repuesto). */
export interface Part extends Timestamps {
  id: number;
  name: string;
  description: string | null;
  price: Money;
  stock: number;
  status: Status;
}

export type PartPayload = Omit<Part, 'id' | 'createdAt' | 'updatedAt'>;
