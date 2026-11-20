import { Money, Status, Timestamps } from './api.model';
import { SaleDetail } from './sale-detail.model';

export interface Sale extends Timestamps {
  id: number;
  customerId: number;
  customerName: string;
  saleDate: string;
  subtotal: Money;
  tax: Money;
  total: Money;
  status: Status;
  lines: SaleDetail[];
}

/**
 * Alta de venta (modelo.md): una línea por unidad serializada elegida.
 * `quantity` lo fija el backend en 1 y el total es subtotal + impuesto.
 */
export interface SaleCreatePayload {
  customerId: number;
  saleDate: string;
  items: Array<{ serializedUnitId: number }>;
}
