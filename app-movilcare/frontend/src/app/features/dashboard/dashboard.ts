import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Customer } from '../../core/models/customer.model';
import { Product } from '../../core/models/product.model';
import { Sale } from '../../core/models/sale.model';
import { SerializedUnit } from '../../core/models/serialized-unit.model';
import { toNumber } from '../../core/models/api.model';
import { toApiMessage } from '../../core/utils/to-api-message';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { CustomerApi } from '../customers/customer-api';
import { ProductApi } from '../products/product-api';
import { SaleApi } from '../sales/sale-api';
import { SerializedUnitApi } from '../serialized-units/serialized-unit-api';

/**
 * ¿La venta cayó en el mismo día local (año, mes y día) que `reference`?
 * `new Date(iso)` convierte a la hora del navegador antes de comparar.
 */
function sameDay(iso: string, reference: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

@Component({
  selector: 'app-dashboard',
  imports: [
    ButtonModule,
    CurrencyPipe,
    EmptyState,
    MessageModule,
    PageHeader,
    TableModule,
    TagModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  host: {
    class: 'block',
  },
})
export class Dashboard {
  private readonly salesApi = inject(SaleApi);
  private readonly productsApi = inject(ProductApi);
  private readonly customersApi = inject(CustomerApi);
  private readonly unitsApi = inject(SerializedUnitApi);

  readonly sales = signal<Sale[]>([]);
  readonly products = signal<Product[]>([]);
  readonly clients = signal<Customer[]>([]);
  readonly units = signal<SerializedUnit[]>([]);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      sales: this.salesApi.list(),
      products: this.productsApi.list(),
      clients: this.customersApi.list('active'),
      units: this.unitsApi.list('active'),
    }).subscribe({
      next: ({ sales, products, clients, units }) => {
        this.sales.set(sales);
        this.products.set(products);
        this.clients.set(clients);
        this.units.set(units);
        this.loading.set(false);
      },
      error: (error) => {
        this.sales.set([]);
        this.products.set([]);
        this.clients.set([]);
        this.units.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  /** Ventas `active` cuya fecha cayó hoy (hora local). */
  readonly todaySales = computed(() => {
    const reference = new Date();

    return this.sales().filter(
      (sale) =>
        sale.status === 'active' &&
        sameDay(sale.saleDate, reference),
    );
  });

  /** Suma de los totales de `todaySales`, con `toNumber` (Money es string). */
  readonly todayTotal = computed(() =>
    this.todaySales().reduce(
      (sum, sale) => sum + toNumber(sale.total),
      0,
    ),
  );

  /** Unidades activas por producto. */
  private readonly stockByProduct = computed(() => {
    const stock = new Map<number, number>();

    for (const unit of this.units()) {
      stock.set(
        unit.productId,
        (stock.get(unit.productId) ?? 0) + 1,
      );
    }

    return stock;
  });

  /**
   * Adaptación de la guía (`quantity <= minStock`): MovilCare no tiene esas
   * columnas, así que «bajo el mínimo» es un producto `active` sin
   * unidades activas.
   */
  readonly lowStock = computed(() =>
    this.products().filter(
      (product) =>
        product.status === 'active' &&
        (this.stockByProduct().get(product.id) ?? 0) === 0,
    ),
  );
}