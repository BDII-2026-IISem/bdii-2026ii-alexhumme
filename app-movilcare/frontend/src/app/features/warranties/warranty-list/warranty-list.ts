import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { STATUS_OPTIONS, Status } from '../../../core/models/api.model';
import { Sale } from '../../../core/models/sale.model';
import {
  Warranty,
  WarrantyPayload,
  WarrantyType,
} from '../../../core/models/warranty.model';
import { Notification } from '../../../core/services/notification';
import { SessionStore } from '../../../core/services/session-store';
import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { SaleApi } from '../../sales/sale-api';
import { todayLocalDate } from '../../sales/sale-date';
import { WarrantyApi } from '../warranty-api';

/** Opciones del filtro de estado de la columna izquierda. */
const STATUS_FILTER_OPTIONS: Array<{ label: string; value: Status | 'all' }> = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Vigentes', value: 'active' },
  { label: 'Anuladas', value: 'inactive' },
];

const WARRANTY_TYPE_OPTIONS: Array<{ label: string; value: WarrantyType }> = [
  { label: 'Garantía comercial', value: 'commercial' },
  { label: 'Garantía extendida', value: 'extended' },
];

/**
 * Vista maestro-detalle de garantías: columna izquierda con el listado;
 * panel derecho con la garantía seleccionada editable (fechas, tipo,
 * descripción y estado) y el alta sobre una línea de venta.
 */
@Component({
  host: { class: 'block' },
  selector: 'app-warranty-list',
  imports: [
    ButtonModule,
    DialogModule,
    EmptyState,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    ReactiveFormsModule,
    SelectModule,
    StatusTag,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],
  templateUrl: './warranty-list.html',
  styleUrl: './warranty-list.css',
})
export class WarrantyList {
  private readonly api = inject(WarrantyApi);
  private readonly salesApi = inject(SaleApi);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  readonly warrantyTypeOptions = WARRANTY_TYPE_OPTIONS;

  /** Listado de la columna izquierda. */
  readonly warranties = signal<Warranty[]>([]);
  /** Catálogo de ventas para elegir la línea que garantiza (alta). */
  private readonly sales = signal<Sale[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');
  readonly statusFilter = signal<Status | 'all'>('all');

  /** Panel de detalle. */
  private readonly selectedWarranty = signal<Warranty | null>(null);
  readonly saving = signal(false);
  readonly removing = signal(false);

  /** Diálogo «Nueva garantía». */
  readonly createVisible = signal(false);
  readonly createSaving = signal(false);
  readonly createError = signal<string | null>(null);

  readonly detailForm = this.fb.group({
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    warrantyType: ['commercial' as WarrantyType, [Validators.required]],
    description: ['', [Validators.maxLength(255)]],
    status: ['active' as Status, [Validators.required]],
  });

  readonly createForm = this.fb.group({
    saleDetailId: [null as number | null, [Validators.required]],
    startDate: [todayLocalDate(), [Validators.required]],
    endDate: ['', [Validators.required]],
    warrantyType: ['commercial' as WarrantyType, [Validators.required]],
    description: ['', [Validators.maxLength(255)]],
  });

  /** Id de la garantía enlazada desde la venta (`/garantias?id=`). */
  private readonly initialId = Number(
    this.route.snapshot.queryParamMap.get('id'),
  );

  readonly canCreate = computed(() =>
    this.session.canPermission('POST /api/warranties'),
  );
  readonly canDelete = computed(() =>
    this.session.canPermission('DELETE /api/warranties/:id'),
  );

  readonly visibleWarranties = computed(() => {
    const rows = filterRows(this.warranties(), this.filter(), (row) => [
      row.serializedUnitSerial,
      String(row.saleId),
      row.warrantyType,
    ]);
    const status = this.statusFilter();
    return status === 'all'
      ? rows
      : rows.filter((row) => row.status === status);
  });

  readonly hasDetail = computed(() => this.selectedWarranty() !== null);
  readonly warranty = this.selectedWarranty.asReadonly();

  /** Líneas de venta como opciones del selector del alta. */
  readonly lineOptions = computed(() =>
    this.sales().flatMap((sale) =>
      (sale.lines ?? []).map((line) => ({
        value: line.id,
        label: `Venta #${sale.id} · ${line.serializedUnitSerial} — ${line.productName}`,
      })),
    ),
  );

  /** Solo se avisa de la falta de líneas si el catálogo terminó bien. */
  readonly salesLoaded = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      warranties: this.api.list(),
      // El catálogo de ventas es solo para el alta: si la sesión no puede
      // leerlo, el diálogo lo indica en lugar de romper la página.
      sales: this.salesApi
        .list()
        .pipe(catchError(() => of([] as Sale[]))),
    }).subscribe({
      next: ({ warranties, sales }) => {
        this.warranties.set(warranties);
        this.sales.set(sales);
        this.salesLoaded.set(true);
        this.loading.set(false);

        // El panel nunca queda vacío: se respeta `?id=`, luego la selección
        // actual y por último la primera garantía.
        const wanted =
          this.initialId || this.selectedWarranty()?.id || warranties[0]?.id;
        const target = warranties.find((row) => row.id === wanted);
        if (target) {
          if (this.selectedWarranty()?.id !== target.id) {
            this.select(target);
          } else {
            this.selectedWarranty.set(target);
          }
        }
      },
      error: (error: unknown) => {
        this.warranties.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  isSelected(warranty: Warranty): boolean {
    return this.selectedWarranty()?.id === warranty.id;
  }

  select(warranty: Warranty): void {
    if (this.isSelected(warranty)) return;
    this.selectedWarranty.set(warranty);
    this.detailForm.reset({
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      warrantyType: warranty.warrantyType,
      description: warranty.description ?? '',
      status: warranty.status,
    });
  }

  openCreate(): void {
    this.createError.set(null);
    this.createForm.reset({
      saleDetailId: null,
      startDate: todayLocalDate(),
      endDate: '',
      warrantyType: 'commercial',
      description: '',
    });
    this.createVisible.set(true);
  }

  createWarranty(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();

    if (value.saleDetailId === null) {
      return;
    }

    const payload: WarrantyPayload = {
      saleDetailId: value.saleDetailId,
      startDate: value.startDate,
      endDate: value.endDate,
      warrantyType: value.warrantyType,
      description: value.description.trim() || null,
      // Las entidades hijas nacen activas por convención del proyecto.
      status: 'active',
    };

    this.createSaving.set(true);
    this.createError.set(null);

    this.api.create(payload).subscribe({
      next: (created) => {
        this.createSaving.set(false);
        this.createVisible.set(false);
        this.notify.success('Garantía creada');
        this.load();
        this.select(created);
      },
      error: (error: unknown) => {
        this.createSaving.set(false);
        this.createError.set(toApiMessage(error));
      },
    });
  }

  save(): void {
    if (this.detailForm.invalid) {
      this.detailForm.markAllAsTouched();
      return;
    }

    const warranty = this.selectedWarranty();
    if (!warranty) return;

    const value = this.detailForm.getRawValue();

    const payload: WarrantyPayload = {
      saleDetailId: warranty.saleDetailId,
      startDate: value.startDate,
      endDate: value.endDate,
      warrantyType: value.warrantyType,
      description: value.description.trim() || null,
      status: value.status,
    };

    this.saving.set(true);

    this.api.update(warranty.id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.notify.success('Garantía guardada');
        this.selectedWarranty.set(updated);
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error('No se pudo guardar', toApiMessage(error));
      },
    });
  }

  remove(): void {
    const warranty = this.selectedWarranty();
    if (!warranty) return;

    this.confirmation.confirm({
      header: 'Eliminar garantía',
      message: `¿Deseas eliminar la garantía de ${warranty.serializedUnitSerial}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.removing.set(true);
        this.api.remove(warranty.id).subscribe({
          next: () => {
            this.removing.set(false);
            this.notify.warn('Garantía eliminada');
            this.selectedWarranty.set(null);
            this.load();
          },
          error: (error: unknown) => {
            this.removing.set(false);
            this.notify.error('No se pudo eliminar', toApiMessage(error));
          },
        });
      },
    });
  }
}
