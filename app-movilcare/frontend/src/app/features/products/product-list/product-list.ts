import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import {
  Product,
  ProductPayload,
} from '../../../core/models/product.model';

import { Notification } from '../../../core/services/notification';
import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { ProductApi } from '../product-api';
import { ProductForm } from '../product-form/product-form';

@Component({
  selector: 'app-product-list',
  imports: [
    ButtonModule,
    DialogModule,
    EmptyState,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    StatusTag,
    TableModule,
    TagModule,
    ToggleSwitchModule,
    TooltipModule,
    ProductForm,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
  host: {
    class: 'block',
  },
})
export class ProductList {
  private readonly api = inject(ProductApi);
  private readonly unitsApi = inject(SerializedUnitApi);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);

  readonly rows = signal<Product[]>([]);
  /** Copia sin filtrar para restaurar el toggle «Solo disponibles». */
  private readonly allRows = signal<Product[]>([]);
  /** Conteo de unidades `active` por `productId`. */
  readonly unitCounts = signal<Map<number, number>>(new Map());

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly filter = signal('');
  readonly availableOnly = signal(false);
  readonly dialogVisible = signal(false);
  readonly editing = signal<Product | null>(null);
  readonly resetKey = signal(0);

  readonly visibleRows = computed(() =>
    filterRows(
      this.rows(),
      this.filter(),
      (product) => [
        product.sku,
        product.name,
        product.description,
      ],
    ),
  );

  /** Productos `active` sin ninguna unidad `active`. */
  readonly withoutUnits = computed(() => {
    const counts = this.unitCounts();

    return new Set(
      this.allRows()
        .filter(
          (product) =>
            product.status === 'active' &&
            (counts.get(product.id) ?? 0) === 0,
        )
        .map((product) => product.id),
    );
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      products: this.api.list(),
      units: this.unitsApi.list('active'),
    }).subscribe({
      next: ({ products, units }) => {
        const counts = new Map<number, number>();

        for (const unit of units) {
          counts.set(
            unit.productId,
            (counts.get(unit.productId) ?? 0) + 1,
          );
        }

        this.unitCounts.set(counts);
        this.allRows.set(products);
        this.rows.set(
          this.availableOnly()
            ? products.filter(
                (product) => (counts.get(product.id) ?? 0) > 0,
              )
            : products,
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.allRows.set([]);
        this.rows.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  toggleAvailableOnly(checked: boolean): void {
    this.availableOnly.set(checked);

    if (!checked) {
      this.rows.set(this.allRows());
      return;
    }

    this.loading.set(true);

    this.api.available().subscribe({
      next: (products) => {
        const counts = this.unitCounts();
        this.rows.set(
          products.filter(
            (product) => (counts.get(product.id) ?? 0) > 0,
          ),
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.resetKey.update((key) => key + 1);
    this.dialogVisible.set(true);
  }

  openEdit(product: Product): void {
    this.editing.set(product);
    this.resetKey.update((key) => key + 1);
    this.dialogVisible.set(true);
  }

  save(payload: Omit<ProductPayload, 'status'>): void {
    const current = this.editing();

    this.saving.set(true);

    const request = current
      ? this.api.update(current.id, payload)
      : this.api.create({
          ...payload,
          status: 'active',
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.notify.success(
          current ? 'Producto actualizado' : 'Producto creado',
        );
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.notify.error(toApiMessage(error));
      },
    });
  }

  remove(product: Product): void {
    this.confirmation.confirm({
      header: 'Dar de baja',
      message: `¿Deseas dar de baja el producto ${product.name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',

      accept: () => {
        this.api.remove(product.id).subscribe({
          next: () => {
            this.notify.warn('Producto dado de baja');
            this.load();
          },
          error: (error) => {
            this.notify.error(toApiMessage(error));
          },
        });
      },
    });
  }
}
