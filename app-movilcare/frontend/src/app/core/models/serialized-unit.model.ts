import { Status, Timestamps } from './api.model';

export interface SerializedUnit extends Timestamps {
  id: number;
  product: number;
  productId: number;
  productName: string;
  name: string;
  description: string | null;
  status: Status;
}

export type SerializedUnitPayload = Pick<
  SerializedUnit,
  'product' | 'name' | 'description'
>;