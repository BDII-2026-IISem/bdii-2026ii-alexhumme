import { Status, Timestamps } from './api.model';

export interface SerializedUnit extends Timestamps {
  id: number;
  product: number;
  productId: number;
  productName: string;
  serial: string;
  status: Status;
}

export type SerializedUnitPayload = Omit<
  SerializedUnit,
  'id' | 'productId' | 'productName' | 'createdAt' | 'updatedAt'
>;
