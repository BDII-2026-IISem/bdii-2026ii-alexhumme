import { Money, Status, Timestamps } from './api.model';

/** Consumo de repuesto en una orden (modelo.md: ConsumoRepuesto). */
export interface PartConsumption extends Timestamps {
  id: number;
  serviceOrderId: number;
  serviceOrderNumber: string;
  partId: number;
  partName: string;
  quantity: number;
  unitPrice: Money;
  /** quantity × unitPrice; el backend lo calcula. */
  subtotal: Money;
  status: Status;
}

export type PartConsumptionPayload = Omit<
  PartConsumption,
  | 'id'
  | 'serviceOrderNumber'
  | 'partName'
  | 'subtotal'
  | 'createdAt'
  | 'updatedAt'
>;
