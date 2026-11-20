import { Status, Timestamps } from './api.model';

export type WarrantyType = 'commercial' | 'extended';

/** Garantía por artículo vendido: cuelga de la línea de venta. */
export interface Warranty extends Timestamps {
  id: number;
  saleDetailId: number;
  saleId: number;
  serializedUnitSerial: string;
  startDate: string;
  endDate: string;
  warrantyType: WarrantyType;
  description: string | null;
  status: Status;
}

export type WarrantyPayload = Omit<
  Warranty,
  'id' | 'saleId' | 'serializedUnitSerial' | 'createdAt' | 'updatedAt'
>;
