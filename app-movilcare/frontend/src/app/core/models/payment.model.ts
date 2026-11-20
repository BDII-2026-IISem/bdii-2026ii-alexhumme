import { Money, Status, Timestamps } from './api.model';

/** Referencia polimórfica del pago (modelo.md: referencia_tipo/id). */
export type PaymentReferenceType = 'sale' | 'service_order';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mobile';

/** Pago de una venta u orden de servicio (modelo.md: Pago). */
export interface Payment extends Timestamps {
  id: number;
  referenceType: PaymentReferenceType;
  referenceId: number;
  method: PaymentMethod;
  amount: Money;
  paymentDate: string;
  status: Status;
}

export type PaymentPayload = Omit<
  Payment,
  'id' | 'createdAt' | 'updatedAt'
>;
