import { Money } from './api.model';

export interface SaleDetail {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface SaleDetailInput {
  productId: number;
  quantity: number;
}