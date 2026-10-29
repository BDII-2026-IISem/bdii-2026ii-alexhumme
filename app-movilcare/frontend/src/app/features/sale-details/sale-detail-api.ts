import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SaleDetail } from '../../core/models/sale-detail.model';
import { Sale } from '../../core/models/sale.model';
import { SaleApi } from '../sales/sale-api';

@Injectable({ providedIn: 'root' })
export class SaleDetailApi {
  private readonly sales = inject(SaleApi);

  list(): Observable<SaleDetail[]> {
    return this.sales.list().pipe(
      map((sales: Sale[]) => sales.flatMap((sale) => sale.lines ?? [])),
    );
  }

  bySale(saleId: number): Observable<SaleDetail[]> {
    return this.sales.get(saleId).pipe(
      map((sale) => sale.lines ?? []),
    );
  }
}