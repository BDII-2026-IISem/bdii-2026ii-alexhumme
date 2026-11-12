import { Component, computed, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  ResourceRole,
  ResourceRolePayload,
} from '../../../../core/models/resource-role.model';
import { Resource } from '../../../../core/models/resource.model';
import { Role } from '../../../../core/models/role.model';
import { Notification } from '../../../../core/services/notification';
import { filterRows } from '../../../../core/utils/filter-rows';
import { methodSeverity } from '../../../../core/utils/http-method';
import { toApiMessage } from '../../../../core/utils/to-api-message';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../../shared/ui/status-tag/status-tag';
import { ResourceApi } from '../../resources/resource-api';
import { RoleApi } from '../../roles/role-api';
import { ResourceRoleApi } from '../resource-role-api';

@Component({
  host: { class: 'block' },
  selector: 'app-resource-role-list',
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
  templateUrl: './resource-role-list.html',
  styleUrl: './resource-role-list.css',
})
export class ResourceRoleList {
  private readonly api = inject(ResourceRoleApi);
  private readonly resourceApi = inject(ResourceApi);
  private readonly roleApi = inject(RoleApi);
  private readonly notify = inject(Notification);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly methodSeverity = methodSeverity;

  readonly rows = signal<ResourceRole[]>([]);
  readonly resources = signal<Resource[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');

  readonly dialogVisible = signal(false);
  readonly editing = signal<ResourceRole | null>(null);

  readonly form = this.fb.group({
    resource: [null as number | null, [Validators.required]],
    role: [null as number | null, [Validators.required]],
  });

  /** `MÉTODO ruta` para leer; el valor enviado es el `id`. */
  readonly resourceOptions = computed(() =>
    this.resources().map((row) => ({
      id: row.id,
      label: `${row.method} ${row.route}`,
    })),
  );

  readonly visibleRows = computed(() =>
    filterRows(this.rows(), this.filter(), (row) => [
      this.roleLabel(row.role),
      this.resourceLabel(row.resource),
    ]),
  );

  constructor() {
    this.load();
    this.loadCatalogs();
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

  private loadCatalogs(): void {
    forkJoin({
      resources: this.resourceApi.list(),
      roles: this.roleApi.list(),
    }).subscribe({
      next: ({ resources, roles }) => {
        this.resources.set(resources);
        this.roles.set(roles);
      },
      error: (error: unknown) =>
        this.notify.error(
          'No se pudieron cargar los catálogos',
          toApiMessage(error),
        ),
    });
  }

  resource(id: number): Resource | undefined {
    return this.resources().find((row) => row.id === id);
  }

  resourceLabel(id: number): string {
    const row = this.resource(id);
    return row ? `${row.method} ${row.route}` : `#${id}`;
  }

  roleLabel(id: number): string {
    return this.roles().find((row) => row.id === id)?.name ?? `#${id}`;
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ resource: null, role: null });
    this.dialogVisible.set(true);
  }

  openEdit(row: ResourceRole): void {
    this.editing.set(row);
    this.form.reset({ resource: row.resource, role: row.role });
    this.dialogVisible.set(true);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (!value.resource || !value.role) {
      this.form.markAllAsTouched();
      return;
    }

    this.save({
      resource: value.resource,
      role: value.role,
      status: 'active',
    });
  }

  private save(payload: ResourceRolePayload): void {
    const current = this.editing();
    this.saving.set(true);

    (current ? this.api.update(current.id, payload) : this.api.create(payload))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogVisible.set(false);
          this.notify.success(
            current ? 'Concesión actualizada' : 'Concesión creada',
          );
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error('No se pudo guardar', toApiMessage(error));
        },
      });
  }

  remove(row: ResourceRole): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notify.warn('Concesión retirada');
        this.load();
      },
      error: (error: unknown) => this.notify.error(toApiMessage(error)),
    });
  }

  /** Reactivar la fila, no insertar otra: el par rol + recurso es único. */
  reactivate(row: ResourceRole): void {
    this.api
      .update(row.id, {
        resource: row.resource,
        role: row.role,
        status: 'active',
      })
      .subscribe({
        next: () => {
          this.notify.success('Concesión reactivada');
          this.load();
        },
        error: (error: unknown) =>
          this.notify.error('No se pudo reactivar', toApiMessage(error)),
      });
  }
}
