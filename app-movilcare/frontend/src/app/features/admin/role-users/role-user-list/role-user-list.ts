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
  RoleUser,
  RoleUserPayload,
} from '../../../../core/models/role-user.model';
import { Role } from '../../../../core/models/role.model';
import { User } from '../../../../core/models/user.model';
import { Notification } from '../../../../core/services/notification';
import { filterRows } from '../../../../core/utils/filter-rows';
import { toApiMessage } from '../../../../core/utils/to-api-message';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../../shared/ui/status-tag/status-tag';
import { RoleApi } from '../../roles/role-api';
import { UserApi } from '../../users/user-api';
import { RoleUserApi } from '../role-user-api';

@Component({
  host: { class: 'block' },
  selector: 'app-role-user-list',
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
  templateUrl: './role-user-list.html',
  styleUrl: './role-user-list.css',
})
export class RoleUserList {
  private readonly api = inject(RoleUserApi);
  private readonly userApi = inject(UserApi);
  private readonly roleApi = inject(RoleApi);
  private readonly notify = inject(Notification);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly rows = signal<RoleUser[]>([]);
  readonly users = signal<User[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');

  readonly dialogVisible = signal(false);
  readonly editing = signal<RoleUser | null>(null);

  readonly form = this.fb.group({
    user: [null as number | null, [Validators.required]],
    role: [null as number | null, [Validators.required]],
  });

  readonly visibleRows = computed(() =>
    filterRows(this.rows(), this.filter(), (row) => [
      this.userLabel(row.user),
      this.roleLabel(row.role),
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

  /** Los dos extremos del `p-select` y las etiquetas de la tabla. */
  private loadCatalogs(): void {
    forkJoin({
      users: this.userApi.list(),
      roles: this.roleApi.list(),
    }).subscribe({
      next: ({ users, roles }) => {
        this.users.set(users);
        this.roles.set(roles);
      },
      error: (error: unknown) =>
        this.notify.error(
          'No se pudieron cargar los catálogos',
          toApiMessage(error),
        ),
    });
  }

  userLabel(id: number): string {
    return (
      this.users().find((row) => row.id === id)?.username ?? `#${id}`
    );
  }

  roleLabel(id: number): string {
    return this.roles().find((row) => row.id === id)?.name ?? `#${id}`;
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ user: null, role: null });
    this.dialogVisible.set(true);
  }

  openEdit(row: RoleUser): void {
    this.editing.set(row);
    this.form.reset({ user: row.user, role: row.role });
    this.dialogVisible.set(true);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (!value.user || !value.role) {
      this.form.markAllAsTouched();
      return;
    }

    this.save({ user: value.user, role: value.role, status: 'active' });
  }

  private save(payload: RoleUserPayload): void {
    const current = this.editing();
    this.saving.set(true);

    (current ? this.api.update(current.id, payload) : this.api.create(payload))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogVisible.set(false);
          this.notify.success(
            current ? 'Asignación actualizada' : 'Asignación creada',
          );
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error('No se pudo guardar', toApiMessage(error));
        },
      });
  }

  remove(row: RoleUser): void {
    this.api.remove(row.id).subscribe({
      next: () => {
        this.notify.warn('Asignación retirada');
        this.load();
      },
      error: (error: unknown) => this.notify.error(toApiMessage(error)),
    });
  }

  /** Retirar y volver a conceder es cambiar `status`: no se inserta otra fila. */
  reactivate(row: RoleUser): void {
    this.api
      .update(row.id, {
        user: row.user,
        role: row.role,
        status: 'active',
      })
      .subscribe({
        next: () => {
          this.notify.success('Asignación reactivada');
          this.load();
        },
        error: (error: unknown) =>
          this.notify.error('No se pudo reactivar', toApiMessage(error)),
      });
  }
}
