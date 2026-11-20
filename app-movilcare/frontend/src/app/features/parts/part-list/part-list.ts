import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { STATUS_OPTIONS, Status } from '../../../core/models/api.model';
import {
  PartConsumption,
} from '../../../core/models/part-consumption.model';
import { Part, PartPayload } from '../../../core/models/part.model';
import { Notification } from '../../../core/services/notification';
import { SessionStore } from '../../../core/services/session-store';
import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { PartConsumptionApi } from '../../service-orders/part-consumption-api';
import { PartApi } from '../part-api';

/** Opciones del filtro de estado de la columna izquierda. */
const STATUS_FILTER_OPTIONS: Array<{ label: string; value: Status | 'all' }> = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Activos', value: 'active' },
  { label: 'Inactivos', value: 'inactive' },
];

/**
 * Vista maestro-detalle de repuestos: columna izquierda con el listado;
 * panel derecho con la ficha editable del repuesto seleccionado y los
 * consumos en los que se ha usado (enlazados a su orden).
 */
@Component({
  host: { class: 'block' },
  selector: 'app-part-list',
  imports: [
    ButtonModule,
    CurrencyPipe,
    EmptyState,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    ReactiveFormsModule,
    RouterLink,
    SelectModule,
    StatusTag,
    TableModule,
    TabsModule,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],
  templateUrl: './part-list.html',
  styleUrl: './part-list.css',
})
export class PartList {
  private readonly api = inject(PartApi);
  private readonly consumptionApi = inject(PartConsumptionApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;

  /** Listado de la columna izquierda. */
  readonly parts = signal<Part[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');
  readonly statusFilter = signal<Status | 'all'>('all');

  /** Panel de detalle. */
  private readonly selectedPart = signal<Part | null>(null);
  readonly creating = signal(false);
  readonly saving = signal(false);
  readonly consumptions = signal<PartConsumption[]>([]);
  readonly loadingConsumptions = signal(false);

  readonly detailForm = this.fb.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
    ],
    description: ['', [Validators.maxLength(255)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    status: ['active' as Status, [Validators.required]],
  });

  readonly canCreate = computed(() =>
    this.session.canPermission('POST /api/parts'),
  );
  readonly canEdit = computed(() =>
    this.session.canPermission('PATCH /api/parts/:id'),
  );
  readonly canDelete = computed(() =>
    this.session.canPermission('DELETE /api/parts/:id'),
  );
  readonly canSeeConsumptions = computed(() =>
    this.session.canPermission('GET /api/part-consumptions'),
  );

  readonly visibleParts = computed(() => {
    const rows = filterRows(this.parts(), this.filter(), (part) => [
      part.name,
      part.description,
    ]);
    const status = this.statusFilter();
    return status === 'all'
      ? rows
      : rows.filter((part) => part.status === status);
  });

  readonly hasDetail = computed(
    () => this.creating() || this.selectedPart() !== null,
  );
  readonly part = this.selectedPart.asReadonly();
  readonly detailTitle = computed(() =>
    this.creating() ? 'Nuevo repuesto' : (this.selectedPart()?.name ?? ''),
  );

  /** El alta solo guarda con POST; la edición, con PATCH. */
  readonly canSave = computed(() =>
    this.creating() ? this.canCreate() : this.canEdit(),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: (parts) => {
        this.parts.set(parts);
        this.loading.set(false);

        // El panel nunca queda vacío: se respeta la selección actual y,
        // si no hay, el primer repuesto.
        if (!this.creating()) {
          const wanted = this.selectedPart()?.id || parts[0]?.id;
          const target = parts.find((row) => row.id === wanted);
          if (target) {
            this.selectedPart.set(target);
          }
        }
      },
      error: (error: unknown) => {
        this.parts.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  isSelected(part: Part): boolean {
    return !this.creating() && this.selectedPart()?.id === part.id;
  }

  select(part: Part): void {
    if (this.isSelected(part)) return;
    this.creating.set(false);
    this.selectedPart.set(part);
    this.detailForm.reset({
      name: part.name,
      description: part.description ?? '',
      price: Number(part.price),
      stock: part.stock,
      status: part.status,
    });
    this.loadConsumptions(part.id);
  }

  openCreate(): void {
    this.creating.set(true);
    this.consumptions.set([]);
    this.detailForm.reset({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      status: 'active',
    });
  }

  /** Cancelar vuelve al repuesto seleccionado (o al estado vacío). */
  clearDetail(): void {
    this.creating.set(false);
    const part = this.selectedPart();
    if (part) {
      this.detailForm.reset({
        name: part.name,
        description: part.description ?? '',
        price: Number(part.price),
        stock: part.stock,
        status: part.status,
      });
      this.loadConsumptions(part.id);
    }
  }

  /** Pestaña «Consumos»: qué órdenes usaron este repuesto. */
  private loadConsumptions(partId: number): void {
    this.consumptions.set([]);

    if (!this.canSeeConsumptions()) {
      return;
    }

    this.loadingConsumptions.set(true);
    this.consumptionApi
      .list({ part: partId })
      .pipe(catchError(() => of([] as PartConsumption[])))
      .subscribe({
        next: (rows) => {
          if (this.selectedPart()?.id !== partId) return;
          this.consumptions.set(rows);
          this.loadingConsumptions.set(false);
        },
      });
  }

  save(): void {
    if (this.detailForm.invalid) {
      this.detailForm.markAllAsTouched();
      return;
    }

    if (!this.canSave()) {
      return;
    }

    const value = this.detailForm.getRawValue();

    const payload: PartPayload = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      price: value.price.toFixed(2),
      stock: value.stock,
      status: value.status,
    };

    this.saving.set(true);

    if (this.creating()) {
      this.api.create(payload).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.notify.success('Repuesto creado');
          this.creating.set(false);
          this.selectedPart.set(created);
          this.detailForm.reset({
            name: created.name,
            description: created.description ?? '',
            price: Number(created.price),
            stock: created.stock,
            status: created.status,
          });
          this.load();
          this.loadConsumptions(created.id);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error('No se pudo crear el repuesto', toApiMessage(error));
        },
      });
      return;
    }

    const part = this.selectedPart();
    if (!part) {
      this.saving.set(false);
      return;
    }

    this.api.update(part.id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.notify.success('Repuesto actualizado');
        this.selectedPart.set(updated);
        this.detailForm.reset({
          name: updated.name,
          description: updated.description ?? '',
          price: Number(updated.price),
          stock: updated.stock,
          status: updated.status,
        });
        this.load();
        this.loadConsumptions(updated.id);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error('No se pudo guardar el repuesto', toApiMessage(error));
      },
    });
  }

  remove(part: Part): void {
    this.confirmation.confirm({
      header: 'Dar de baja',
      message: `¿Deseas dar de baja el repuesto ${part.name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.api.remove(part.id).subscribe({
          next: () => {
            this.notify.warn('Repuesto dado de baja');
            if (this.selectedPart()?.id === part.id) {
              this.selectedPart.set(null);
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
