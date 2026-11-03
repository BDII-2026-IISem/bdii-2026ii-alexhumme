import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Sale } from '../../../core/models/sale.model';
import { Notification } from '../../../core/services/notification';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { ProductApi } from '../../products/product-api';
import { SaleApi } from '../sale-api';

@Component({
  selector: 'app-sale-detail',
  imports: [
    ButtonModule,
    CurrencyPipe,
    DatePipe,
    EmptyState,
    MessageModule,
    PageHeader,
    RouterLink,
    StatusTag,
    TableModule,
    TagModule,
  ],
  templateUrl: './sale-detail.html',
  styleUrl: './sale-detail.css',
  host: {
    class: 'block',
  },
})
export class SaleDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SaleApi);
  private readonly productsApi = inject(ProductApi);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notify = inject(Notification);

  readonly sale = signal<Sale | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly voiding = signal(false);

  private readonly productNames = signal<Map<number, string>>(new Map());

  private readonly saleId = Number(
    this.route.snapshot.paramMap.get('id'),
  );

  readonly isVoided = computed(
    () => this.sale()?.status === 'inactive',
  );

  readonly customerLabel = computed(() => {
    const sale = this.sale();

    if (!sale) {
      return '';
    }

    return sale.customerName || `Cliente #${sale.customerId}`;
  });

  /** Unidades vendidas en la venta: la suma de `quantity` de sus líneas. */
  readonly units = computed(() =>
    (this.sale()?.lines ?? []).reduce(
      (sum, line) => sum + line.quantity,
      0,
    ),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    // La guía une la venta con el catálogo: `productName` ya viene en la
    // línea (ISS-06) y el catálogo solo queda como respaldo.
    forkJoin({
      sale: this.api.get(this.saleId),
      products: this.productsApi.list(),
    }).subscribe({
      next: ({ sale, products }) => {
        this.sale.set(sale);
        this.productNames.set(
          new Map(
            products.map((product) => [product.id, product.name]),
          ),
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.sale.set(null);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  lineName(productId: number, productName: string): string {
    return (
      productName ||
      this.productNames().get(productId) ||
      `Producto #${productId}`
    );
  }

  voidSale(): void {
    const sale = this.sale();

    // Nada que anular si no hay venta o si ya está anulada.
    if (!sale || this.isVoided()) {
      return;
    }

    this.confirmation.confirm({
      header: 'Anular venta',
      message: `¿Anular la venta #${sale.id}? Quedará como inactiva.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Anular',
      rejectLabel: 'Cancelar',

      accept: () => {
        this.voiding.set(true);
        this.api.voidSale(sale.id).subscribe({
          next: () => {
            this.voiding.set(false);
            this.notify.warn('Venta anulada');
            this.load();
          },
          error: (error) => {
            this.voiding.set(false);
            this.notify.error(toApiMessage(error));
          },
        });
      },
    });
  }
}