import { Money, Status, Timestamps } from './api.model';

export interface Product extends Timestamps {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  price: Money;
  status: Status;
}

export type ProductPayload = Omit<
  Product,
  'id' | 'createdAt' | 'updatedAt'
>;