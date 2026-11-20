import { Money, Status, Timestamps } from './api.model';

/** Orden de recepción/técnica (modelo.md: OrdenServicio). */
export interface ServiceOrder extends Timestamps {
  id: number;
  customerId: number;
  customerName: string;
  serializedUnitId: number;
  unitSerial: string;
  productName: string;
  /** `OS-YYMMDD-<hex>`: lo genera el backend. */
  number: string;
  openDate: string;
  closeDate: string | null;
  /** Suma de los consumos de repuestos activos de la orden. */
  total: Money;
  status: Status;
}

export type ServiceOrderPayload = Omit<
  ServiceOrder,
  | 'id'
  | 'customerName'
  | 'unitSerial'
  | 'productName'
  | 'number'
  | 'total'
  | 'createdAt'
  | 'updatedAt'
>;
