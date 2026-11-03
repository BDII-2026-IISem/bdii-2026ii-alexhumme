import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { SaleDetailApi, SaleDetailRow } from '../sale-detail-api';

@Component({
  selector: 'app-sale-detail-list',
  imports: [
    CurrencyPipe,
    EmptyState,
    InputTextModule,
    MessageModule,
    PageHeader,
    RouterLink,
    TableModule,
    TagModule,
  ],
  templateUrl: './sale-detail-list.html',
  styleUrl: './sale-detail-list.css',
  host: {
    class: 'block',
  },
})
export class SaleDetailList {
  private readonly api = inject(SaleDetailApi);

  readonly rows = signal<SaleDetailRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');

  /** Búsqueda local por número de venta, nombre de producto o cantidad. */
  readonly filtered = computed(() =>
    filterRows(this.rows(), this.query(), (row) => [
      String(row.saleId),
      row.productName,
      String(row.quantity),
    ]),
  );

  /** Etiqueta del encabezado: unidades de todas las líneas. */
  readonly units = computed(() =>
    this.rows().reduce(
      (sum, row) => sum + row.quantity,
      0,
    ),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (error) => {
        this.rows.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }
}