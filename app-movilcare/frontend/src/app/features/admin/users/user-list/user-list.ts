import { Component, computed, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { STATUS_OPTIONS, Status } from '../../../../core/models/api.model';
import { EffectivePermission } from '../../../../core/models/auth.model';
import { RoleUser } from '../../../../core/models/role-user.model';
import { Role } from '../../../../core/models/role.model';
import { User, UserPayload } from '../../../../core/models/user.model';
import { Notification } from '../../../../core/services/notification';
import { filterRows } from '../../../../core/utils/filter-rows';
import { methodSeverity } from '../../../../core/utils/http-method';
import { toApiMessage } from '../../../../core/utils/to-api-message';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../../shared/ui/status-tag/status-tag';
import { RoleApi } from '../../roles/role-api';
import { RoleUserApi } from '../../role-users/role-user-api';
import { UserApi } from '../user-api';

@Component({
  host: { class: 'block' },
  selector: 'app-user-list',
  imports: [
    ButtonModule,
    DialogModule,
    EmptyState,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
    PageHeader,
    PasswordModule,
    ReactiveFormsModule,
    SelectModule,
    StatusTag,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserList {
  private readonly api = inject(UserApi);
  private readonly roleApi = inject(RoleApi);
  private readonly roleUserApi = inject(RoleUserApi);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statusOptions = STATUS_OPTIONS;
  readonly methodSeverity = methodSeverity;

  readonly rows = signal<User[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');

  /** Catálogo de roles y asignaciones `role_users` (activas e inactivas). */
  readonly roles = signal<Role[]>([]);
  private roleRows: RoleUser[] = [];
  /** Roles activos del usuario tal y como se cargaron al abrir el diálogo. */
  private baseRoleIds: number[] = [];

  readonly dialogVisible = signal(false);
  readonly editing = signal<User | null>(null);

  readonly permissions = signal<EffectivePermission[]>([]);
  readonly permissionsUser = signal<User | null>(null);
  readonly permissionsLoading = signal(false);

  readonly form = this.fb.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(150),
      ],
    ],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    firstName: ['', [Validators.maxLength(150)]],
    lastName: ['', [Validators.maxLength(150)]],
    status: ['active' as Status, [Validators.required]],
    /** Varios roles por usuario: la BD permite N filas `role_users`. */
    roles: [[] as number[], [Validators.required]],
  });

  /** `computed`: escribir en el buscador no genera peticiones. */
  readonly visibleRows = computed(() =>
    filterRows(this.rows(), this.filter(), (row) => [
      row.username,
      row.email,
      row.firstName ?? '',
      row.lastName ?? '',
    ]),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    // Usuarios + catálogo de roles + asignaciones: la lista pinta los roles
    // y el diálogo calcula el delta contra las filas `role_users` reales.
    forkJoin({
      users: this.api.list(),
      roles: this.roleApi.list(),
      assignments: this.roleUserApi.list(),
    }).subscribe({
      next: ({ users, roles, assignments }) => {
        this.rows.set(users);
        this.roles.set(roles);
        this.roleRows = assignments;
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
    this.resetForm(null);
    this.dialogVisible.set(true);
  }

  openEdit(row: User): void {
    this.editing.set(row);
    this.resetForm(row);
    this.dialogVisible.set(true);
  }

  /** En edición la contraseña se deshabilita: el `PATCH` no la lleva. */
  private resetForm(row: User | null): void {
    this.baseRoleIds = row ? this.activeRoleIds(row.id) : [];

    this.form.reset({
      username: row?.username ?? '',
      email: row?.email ?? '',
      password: '',
      firstName: row?.firstName ?? '',
      lastName: row?.lastName ?? '',
      status: row?.status ?? 'active',
      roles: [...this.baseRoleIds],
    });

    if (row) {
      this.form.controls.password.disable();
    } else {
      this.form.controls.password.enable();
    }
  }

  /** Roles activos de un usuario según la última carga de `role_users`. */
  private activeRoleIds(userId: number): number[] {
    return this.roleRows
      .filter((link) => link.user === userId && link.status === 'active')
      .map((link) => link.role);
  }

  /** Nombres de los roles activos, para la columna de la tabla. */
  roleNames(userId: number): string[] {
    return this.activeRoleIds(userId)
      .map((id) => this.roles().find((role) => role.id === id)?.name)
      .filter((name): name is string => name !== undefined);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: UserPayload = {
      username: value.username.trim(),
      email: value.email.trim(),
      firstName: value.firstName.trim() || null,
      lastName: value.lastName.trim() || null,
      status: value.status,
    };

    if (!this.editing()) {
      payload.password = value.password;
    }

    this.save(payload, value.roles);
  }

  private save(payload: UserPayload, selectedRoles: number[]): void {
    const current = this.editing();
    this.saving.set(true);

    const userOp = current
      ? this.api.update(current.id, payload)
      : this.api.create(payload);

    userOp
      .pipe(
        switchMap((saved) => {
          // El usuario primero (necesita su id); después, el delta de roles.
          const ops = this.roleOps(saved.id, selectedRoles);
          return ops.length > 0 ? forkJoin(ops) : of(null);
        }),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogVisible.set(false);
          this.notify.success(
            current ? 'Usuario actualizado' : 'Usuario creado',
          );
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error('No se pudo guardar', toApiMessage(error));
        },
      });
  }

  /**
   * Delta de `role_users` frente a la carga inicial: fuera → `DELETE`
   * (baja lógica); dentro con fila → `PATCH status active`; sin fila → `POST`.
   * El par rol + usuario es único, así que nunca se reinserta una fila viva.
   */
  private roleOps(
    userId: number,
    selected: number[],
  ): Array<Observable<unknown>> {
    const ops: Array<Observable<unknown>> = [];
    const links = this.roleRows.filter((link) => link.user === userId);

    for (const base of this.baseRoleIds) {
      if (!selected.includes(base)) {
        const link = links.find((row) => row.role === base);
        if (link) ops.push(this.roleUserApi.remove(link.id));
      }
    }

    for (const roleId of selected) {
      if (this.baseRoleIds.includes(roleId)) continue;
      const link = links.find((row) => row.role === roleId);
      const payload = { role: roleId, user: userId, status: 'active' as const };
      ops.push(
        link
          ? this.roleUserApi.update(link.id, payload)
          : this.roleUserApi.create(payload),
      );
    }

    return ops;
  }

  remove(row: User): void {
    this.confirmation.confirm({
      header: 'Dar de baja',
      message: `¿Deseas dar de baja al usuario ${row.username}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.api.remove(row.id).subscribe({
          next: () => {
            this.notify.warn('Usuario dado de baja');
            this.load();
          },
          error: (error: unknown) =>
            this.notify.error(toApiMessage(error)),
        });
      },
    });
  }

  reactivate(row: User): void {
    this.api
      .update(row.id, {
        username: row.username,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        status: 'active',
      })
      .subscribe({
        next: () => {
          this.notify.success('Usuario reactivado');
          this.load();
        },
        error: (error: unknown) =>
          this.notify.error('No se pudo reactivar', toApiMessage(error)),
      });
  }

  /** La forma más rápida de diagnosticar un 403: qué filas sostienen a este usuario. */
  openPermissions(row: User): void {
    this.permissionsUser.set(row);
    this.permissions.set([]);
    this.permissionsLoading.set(true);

    this.api.permissions(row.id).subscribe({
      next: (rows) => {
        this.permissions.set(rows);
        this.permissionsLoading.set(false);
      },
      error: (error: unknown) => {
        this.permissionsLoading.set(false);
        this.notify.error(
          'No se pudieron leer los permisos',
          toApiMessage(error),
        );
      },
    });
  }
}
