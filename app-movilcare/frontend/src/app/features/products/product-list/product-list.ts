import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import {
  Product,
  ProductPayload,
} from '../../../core/models/product.model';
import { SerializedUnit } from '../../../core/models/serialized-unit.model';

import { Notification } from '../../../core/services/notification';
import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { HasPermission } from '../../../shared/directives/has-permission';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { ProductApi } from '../product-api';
import { ProductForm } from '../product-form/product-form';

/** Cuerpo de escritura de `ProductForm`: el alta agrega `status`. */
type ProductDraft = Omit<ProductPayload, 'status'>;

/**
 * Vista maestro-detalle de productos: columna izquierda con el listado
 * (búsqueda, «solo disponibles» y alta); panel derecho con la ficha
 * editable del producto seleccionado y sus unidades serializadas.
 */
@Component({
  host: { class: 'block' },
  selector: 'app-product-list',
  imports: [
    ButtonModule,
    EmptyState,
    FormsModule,
    HasPermission,
    InputTextModule,
    MessageModule,
    PageHeader,
    ProductForm,
    RouterLink,
    StatusTag,
    TableModule,
    TabsModule,
    TagModule,
    ToggleSwitchModule,
    TooltipModule,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private readonly api = inject(ProductApi);
  private readonly unitsApi = inject(SerializedUnitApi);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);

  /** Listado de la columna izquierda. */
  readonly rows = signal<Product[]>([]);
  /** Unidades `active` por `productId`. */
  readonly unitCounts = signal<Map<number, number>>(new Map());
  private readonly units = signal<SerializedUnit[]>([]);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly filter = signal('');
  readonly availableOnly = signal(false);

  /** Panel de detalle. */
  private readonly selectedProduct = signal<Product | null>(null);
  readonly creating = signal(false);
  readonly resetKey = signal(0);

  readonly visibleRows = computed(() => {
    const counts = this.unitCounts();
    const rows = filterRows(this.rows(), this.filter(), (product) => [
      product.sku,
      product.name,
      product.description,
    ]);

    return this.availableOnly()
      ? rows.filter((product) => (counts.get(product.id) ?? 0) > 0)
      : rows;
  });

  /** Productos `active` sin ninguna unidad `active`. */
  readonly withoutUnits = computed(() => {
    const counts = this.unitCounts();

    return new Set(
      this.rows()
        .filter(
          (product) =>
            product.status === 'active' &&
            (counts.get(product.id) ?? 0) === 0,
        )
        .map((product) => product.id),
    );
  });

  readonly hasDetail = computed(
    () => this.creating() || this.selectedProduct() !== null,
  );
  readonly selected = this.selectedProduct.asReadonly();
  readonly detailTitle = computed(() =>
    this.creating() ? 'Nuevo producto' : (this.selectedProduct()?.name ?? ''),
  );

  /** Unidades activas del producto seleccionado (pestaña «Unidades»). */
  readonly selectedUnits = computed(() => {
    const product = this.selectedProduct();
    if (!product) return [];
    return this.units().filter((unit) => unit.productId === product.id);
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
        this.units.set(units);
        this.rows.set(products);
        this.loading.set(false);

        // El panel nunca queda vacío: se respeta la selección actual y,
        // si no hay, el primer producto.
        if (!this.creating()) {
          const wanted = this.selectedProduct()?.id || products[0]?.id;
          const target = products.find((product) => product.id === wanted);
          if (target) {
            // Misma fila con datos frescos (tras guardar o eliminar otra).
            this.selectedProduct.set(target);
          }
        }
      },
      error: (error: unknown) => {
        this.rows.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  isSelected(product: Product): boolean {
    return !this.creating() && this.selectedProduct()?.id === product.id;
  }

  select(product: Product): void {
    if (this.isSelected(product)) return;
    this.creating.set(false);
    this.selectedProduct.set(product);
    this.resetKey.update((key) => key + 1);
  }

  openCreate(): void {
    this.creating.set(true);
    this.resetKey.update((key) => key + 1);
  }

  /** Cancelar vuelve al producto seleccionado (o al estado vacío). */
  clearDetail(): void {
    this.creating.set(false);
    this.resetKey.update((key) => key + 1);
  }

  save(draft: ProductDraft): void {
    this.saving.set(true);

    if (this.creating()) {
      const payload: ProductPayload = { ...draft, status: 'active' };
      this.api.create(payload).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.notify.success('Producto creado');
          this.creating.set(false);
          this.selectedProduct.set(created);
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error('No se pudo crear el producto', toApiMessage(error));
        },
      });
      return;
    }

    const product = this.selectedProduct();
    if (!product) {
      this.saving.set(false);
      return;
    }

    this.api.update(product.id, draft).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.notify.success('Producto actualizado');
        this.selectedProduct.set(updated);
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(
          'No se pudo guardar el producto',
          toApiMessage(error),
        );
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
            if (this.selectedProduct()?.id === product.id) {
              this.selectedProduct.set(null);
              this.creating.set(false);
            }
            this.load();
          },
          error: (error: unknown) =>
            this.notify.error('No se pudo dar de baja', toApiMessage(error)),
        });
      },
    });
  }
}
