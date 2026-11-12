import { Component, computed, inject, signal } from '@angular/core';
import {
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
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  HttpMethod,
  STATUS_OPTIONS,
  Status,
} from '../../../../core/models/api.model';
import {
  Resource,
  ResourcePayload,
} from '../../../../core/models/resource.model';
import { Notification } from '../../../../core/services/notification';
import { filterRows } from '../../../../core/utils/filter-rows';
import {
  HTTP_METHODS,
  methodSeverity,
} from '../../../../core/utils/http-method';
import { toApiMessage } from '../../../../core/utils/to-api-message';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../../shared/ui/status-tag/status-tag';
import { ResourceApi } from '../resource-api';

@Component({
  host: { class: 'block' },
  selector: 'app-resource-list',
  imports: [
    ButtonModule,
    DialogModule,
    EmptyState,
    InputTextModule,
    MessageModule,
    PageHeader,
    ReactiveFormsModule,
    SelectModule,
    StatusTag,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './resource-list.html',
  styleUrl: './resource-list.css',
})
export class ResourceList {
  private readonly api = inject(ResourceApi);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly methods = HTTP_METHODS;
  readonly statusOptions = STATUS_OPTIONS;
  readonly methodSeverity = methodSeverity;

  readonly rows = signal<Resource[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');

  readonly dialogVisible = signal(false);
  readonly editing = signal<Resource | null>(null);

  readonly form = this.fb.group({
    method: ['GET' as HttpMethod, [Validators.required]],
    route: ['', [Validators.required, Validators.pattern(/^api\//)]],
    status: ['active' as Status, [Validators.required]],
  });

  readonly visibleRows = computed(() =>
    filterRows(this.rows(), this.filter(), (row) => [
      row.method,
      row.route,
      row.name,
    ]),
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
      error: (error: unknown) => {
        this.rows.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ method: 'GET', route: '', status: 'active' });
    this.dialogVisible.set(true);
  }

  openEdit(row: Resource): void {
    this.editing.set(row);
    this.form.reset({
      method: row.method,
      route: row.route,
      status: row.status,
    });
    this.dialogVisible.set(true);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const route = value.route.trim();
    this.save({
      // `name` no se pide: el backend lo usa como etiqueta y se deriva del verbo y la ruta.
      name: `${value.method} ${route}`,
      method: value.method,
      route,
      status: value.status,
    });
  }

  private save(payload: ResourcePayload): void {
    const current = this.editing();
    this.saving.set(true);

    (current ? this.api.update(current.id, payload) : this.api.create(payload))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogVisible.set(false);
          this.notify.success(
            current ? 'Recurso actualizado' : 'Recurso creado',
          );
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error('No se pudo guardar', toApiMessage(error));
        },
      });
  }

  remove(row: Resource): void {
    this.confirmation.confirm({
      header: 'Dar de baja',
      message: `¿Deseas dar de baja el recurso ${row.method} ${row.route}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.api.remove(row.id).subscribe({
          next: () => {
            this.notify.warn('Recurso dado de baja');
            this.load();
          },
          error: (error: unknown) =>
            this.notify.error(toApiMessage(error)),
        });
      },
    });
  }

  reactivate(row: Resource): void {
    this.api
      .update(row.id, {
        name: row.name,
        method: row.method,
        route: row.route,
        status: 'active',
      })
      .subscribe({
        next: () => {
          this.notify.success('Recurso reactivado');
          this.load();
        },
        error: (error: unknown) =>
          this.notify.error('No se pudo reactivar', toApiMessage(error)),
      });
  }
}
