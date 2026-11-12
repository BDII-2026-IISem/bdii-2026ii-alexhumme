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

import { STATUS_OPTIONS, Status } from '../../../../core/models/api.model';
import { Role, RolePayload } from '../../../../core/models/role.model';
import { Notification } from '../../../../core/services/notification';
import { filterRows } from '../../../../core/utils/filter-rows';
import { toApiMessage } from '../../../../core/utils/to-api-message';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../../shared/ui/status-tag/status-tag';
import { RoleApi } from '../role-api';

@Component({
  host: { class: 'block' },
  selector: 'app-role-list',
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
  templateUrl: './role-list.html',
  styleUrl: './role-list.css',
})
export class RoleList {
  private readonly api = inject(RoleApi);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statusOptions = STATUS_OPTIONS;

  readonly rows = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');

  readonly dialogVisible = signal(false);
  readonly editing = signal<Role | null>(null);

  readonly form = this.fb.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(30)],
    ],
    description: ['', [Validators.maxLength(255)]],
    status: ['active' as Status, [Validators.required]],
  });

  readonly visibleRows = computed(() =>
    filterRows(this.rows(), this.filter(), (row) => [
      row.name,
      row.description ?? '',
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
    this.form.reset({ name: '', description: '', status: 'active' });
    this.dialogVisible.set(true);
  }

  openEdit(row: Role): void {
    this.editing.set(row);
    this.form.reset({
      name: row.name,
      description: row.description ?? '',
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
    this.save({
      name: value.name.trim(),
      description: value.description.trim() || null,
      status: value.status,
    });
  }

  private save(payload: RolePayload): void {
    const current = this.editing();
    this.saving.set(true);

    (current ? this.api.update(current.id, payload) : this.api.create(payload))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogVisible.set(false);
          this.notify.success(
            current ? 'Rol actualizado' : 'Rol creado',
          );
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error('No se pudo guardar', toApiMessage(error));
        },
      });
  }

  remove(row: Role): void {
    this.confirmation.confirm({
      header: 'Dar de baja',
      message: `¿Deseas dar de baja el rol ${row.name}? Sus concesiones dejarán de autorizar.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.api.remove(row.id).subscribe({
          next: () => {
            this.notify.warn('Rol dado de baja');
            this.load();
          },
          error: (error: unknown) =>
            this.notify.error(toApiMessage(error)),
        });
      },
    });
  }

  reactivate(row: Role): void {
    this.api
      .update(row.id, {
        name: row.name,
        description: row.description,
        status: 'active',
      })
      .subscribe({
        next: () => {
          this.notify.success('Rol reactivado');
          this.load();
        },
        error: (error: unknown) =>
          this.notify.error('No se pudo reactivar', toApiMessage(error)),
      });
  }
}
