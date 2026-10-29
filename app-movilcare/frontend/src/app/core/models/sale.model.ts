import { Money, Status, Timestamps } from './api.model';
import { SaleDetail, SaleDetailInput } from './sale-detail.model';

export interface Sale extends Timestamps {
  id: number;
  customerId: number;
  customerName: string;
  saleDate: string;
  subtotal: Money;
  tax: Money;
  discounts: Money;
  total: Money;
  status: Status;
  lines: SaleDetail[];
}

export interface SaleCreatePayload {
  customerId: number;
  saleDate: string;
  discounts: Money;
  lines: SaleDetailInput[];
}