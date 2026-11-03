import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import {
  Sale,
  SaleCreatePayload,
} from '../../../core/models/sale.model';

import { Notification } from '../../../core/services/notification';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { CustomerApi } from '../../customers/customer-api';
import { ProductApi } from '../../products/product-api';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { SaleApi } from '../sale-api';
import { SaleForm } from '../sale-form/sale-form';

@Component({
  selector: 'app-sale-list',
  imports: [
    ButtonModule,
    DatePipe,
    DialogModule,
    EmptyState,
    MessageModule,
    PageHeader,
    RouterLink,
    StatusTag,
    TableModule,
    TagModule,
    SaleForm,
  ],
  templateUrl: './sale-list.html',
  styleUrl: './sale-list.css',
  host: {
    class: 'block',
  },
})
export class SaleList {
  private readonly api = inject(SaleApi);
  private readonly customersApi = inject(CustomerApi);
  private readonly productsApi = inject(ProductApi);
  private readonly unitsApi = inject(SerializedUnitApi);
  private readonly notify = inject(Notification);

  readonly sales = signal<Sale[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly products = signal<Product[]>([]);
  readonly stock = signal<Map<number, number>>(new Map());

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  /** Error del `POST`: vive en el diálogo, no en la lista. */
  readonly saleError = signal<string | null>(null);

  readonly dialogVisible = signal(false);
  readonly resetKey = signal(0);

  private readonly customerMap = computed(
    () => new Map(this.customers().map((c) => [c.id, c.name])),
  );

  /** Unidades activas de los productos disponibles: la etiqueta del encabezado. */
  readonly availableUnits = computed(() => {
    const available = new Set(this.products().map((product) => product.id));
    let total = 0;

    for (const [productId, quantity] of this.stock()) {
      if (available.has(productId)) {
        total += quantity;
      }
    }

    return total;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      sales: this.api.list(),
      customers: this.customersApi.list('active'),
      products: this.productsApi.available(),
      units: this.unitsApi.list('active'),
    }).subscribe({
      next: ({ sales, customers, products, units }) => {
        const stock = new Map<number, number>();

        for (const unit of units) {
          stock.set(
            unit.productId,
            (stock.get(unit.productId) ?? 0) + 1,
          );
        }

        this.sales.set(sales);
        this.customers.set(customers);
        this.products.set(products);
        this.stock.set(stock);
        this.loading.set(false);
      },
      error: (error) => {
        this.sales.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  /** Nombre visible: el que trae la venta, luego el mapa, por último el id. */
  customerName(sale: Sale): string {
    return (
      sale.customerName ||
      this.customerMap().get(sale.customerId) ||
      `Cliente #${sale.customerId}`
    );
  }

  openCreate(): void {
    this.resetKey.update((key) => key + 1);
    this.saleError.set(null);
    this.dialogVisible.set(true);
  }

  save(payload: SaleCreatePayload): void {
    this.saving.set(true);
    this.saleError.set(null);

    this.api.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.notify.success('Venta registrada');
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.saleError.set(toApiMessage(error));
      },
    });
  }
}