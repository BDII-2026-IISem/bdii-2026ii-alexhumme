import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SaleDetail } from '../../core/models/sale-detail.model';
import { Sale } from '../../core/models/sale.model';
import { SaleApi } from '../sales/sale-api';

/** Línea aplanada: `SaleDetail` más el número de la venta que la contiene. */
export interface SaleDetailRow extends SaleDetail {
  saleId: number;
}

@Injectable({ providedIn: 'root' })
export class SaleDetailApi {
  private readonly sales = inject(SaleApi);

  list(): Observable<SaleDetailRow[]> {
    return this.sales.list().pipe(
      map((sales: Sale[]) =>
        sales.flatMap((sale) =>
          (sale.lines ?? []).map((item) => ({
            saleId: sale.id,
            ...item,
          })),
        ),
      ),
    );
  }

  bySale(saleId: number): Observable<SaleDetail[]> {
    return this.sales.get(saleId).pipe(
      map((sale) => sale.lines ?? []),
    );
  }
}