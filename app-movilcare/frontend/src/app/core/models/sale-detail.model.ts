import { Money, Status } from './api.model';

/** Línea de venta: una unidad serializada concreta (quantity = 1). */
export interface SaleDetail {
  id: number;
  serializedUnitId: number;
  serializedUnitSerial: string;
  productName: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  observations: string | null;
  status: Status;
}
