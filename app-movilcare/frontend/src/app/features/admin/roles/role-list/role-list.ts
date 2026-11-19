import { Component, computed, inject, signal } from '@angular/core';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';

import { STATUS_OPTIONS, Status } from '../../../../core/models/api.model';
import {
  ResourceRole,
  ResourceRolePayload,
} from '../../../../core/models/resource-role.model';
import { Resource } from '../../../../core/models/resource.model';
import { Role, RolePayload } from '../../../../core/models/role.model';
import {
  RoleUser,
  RoleUserPayload,
} from '../../../../core/models/role-user.model';
import { User } from '../../../../core/models/user.model';
import { Notification } from '../../../../core/services/notification';
import { filterRows } from '../../../../core/utils/filter-rows';
import { methodSeverity } from '../../../../core/utils/http-method';
import { toApiMessage } from '../../../../core/utils/to-api-message';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../../shared/ui/status-tag/status-tag';
import { ResourceApi } from '../../resources/resource-api';
import { ResourceRoleApi } from '../../resource-roles/resource-role-api';
import { RoleUserApi } from '../../role-users/role-user-api';
import { UserApi } from '../../users/user-api';
import { RoleApi } from '../role-api';

/** Opciones del filtro de estado del listado («opciones» de la columna izquierda). */
const STATUS_FILTER_OPTIONS: Array<{ label: string; value: Status | 'all' }> = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Activos', value: 'active' },
  { label: 'Inactivos', value: 'inactive' },
];

function sameIds(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((value, index) => value === right[index]);
}

/**
 * Vista maestro-detalle de la matriz RBAC: columna izquierda con el listado
 * de roles (búsqueda, filtro y alta); panel derecho con el detalle editable
 * del rol seleccionado —datos, usuarios que lo poseen y recursos concedidos—
 * y los botones «Eliminar rol» y «Guardar cambios».
 */
@Component({
  host: { class: 'block' },
  selector: 'app-role-list',
  imports: [
    ButtonModule,
    EmptyState,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    ReactiveFormsModule,
    SelectModule,
    StatusTag,
    TableModule,
    TagModule,
    TabsModule,
    TooltipModule,
  ],
  templateUrl: './role-list.html',
  styleUrl: './role-list.css',
})
export class RoleList {
  private readonly api = inject(RoleApi);
  private readonly roleUserApi = inject(RoleUserApi);
  private readonly resourceRoleApi = inject(ResourceRoleApi);
  private readonly userApi = inject(UserApi);
  private readonly resourceApi = inject(ResourceApi);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  readonly methodSeverity = methodSeverity;

  /** Listado de la columna izquierda. */
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');
  readonly statusFilter = signal<Status | 'all'>('all');

  /** Panel de detalle. */
  readonly creating = signal(false);
  readonly loadingDetail = signal(false);
  readonly saving = signal(false);
  private readonly selectedRole = signal<Role | null>(null);

  /** Pestaña activa del panel de detalle: usuarios o permisos. */
  readonly detailTab = signal<'usuarios' | 'permisos'>('usuarios');

  /** Página de cada subtabla (5 por página); se reinicia al cambiar de rol. */
  readonly memberFirst = signal(0);
  readonly grantFirst = signal(0);

  /** Borrador editable del detalle: ids activos de usuarios y concesiones. */
  readonly memberIds = signal<number[]>([]);
  readonly grantIds = signal<number[]>([]);
  readonly newMember = signal<number | null>(null);
  readonly newResource = signal<number | null>(null);

  /** Catálogos de los selectores y de las etiquetas de la tabla. */
  readonly users = signal<User[]>([]);
  readonly resources = signal<Resource[]>([]);

  /** Filas persistidas del rol (activas e inactivas): reactivar, no reinsertar. */
  private memberRows: RoleUser[] = [];
  private grantRows: ResourceRole[] = [];
  private baseMemberIds: number[] = [];
  private baseGrantIds: number[] = [];

  readonly form = this.fb.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(30)],
    ],
    description: ['', [Validators.maxLength(255)]],
    status: ['active' as Status, [Validators.required]],
  });

  readonly visibleRoles = computed(() => {
    const rows = filterRows(this.roles(), this.filter(), (row) => [
      row.name,
      row.description ?? '',
    ]);
    const status = this.statusFilter();
    return status === 'all'
      ? rows
      : rows.filter((row) => row.status === status);
  });

  readonly hasDetail = computed(
    () => this.creating() || this.selectedRole() !== null,
  );
  readonly detailTitle = computed(() =>
    this.creating() ? 'Nuevo rol' : (this.selectedRole()?.name ?? ''),
  );
  readonly detailStatus = computed<Status>(
    () => this.selectedRole()?.status ?? 'active',
  );

  /** Usuarios aún sin asignar: el `p-select` del alta de miembros. */
  readonly userOptions = computed(() =>
    this.users()
      .filter((user) => !this.memberIds().includes(user.id))
      .map((user) => ({
        value: user.id,
        label: `${user.username} — ${user.email}`,
      })),
  );

  /** Recursos aún sin conceder: el `p-select` del alta de concesiones. */
  readonly resourceOptions = computed(() =>
    this.resources()
      .filter((resource) => !this.grantIds().includes(resource.id))
      .map((resource) => ({
        value: resource.id,
        label: `${resource.method} ${resource.route}`,
      })),
  );

  /** Usuarios del borrador, resueltos contra el catálogo para la tabla. */
  readonly memberView = computed(() =>
    this.memberIds()
      .map((id) => this.users().find((user) => user.id === id))
      .filter((user): user is User => user !== undefined),
  );

  readonly grantView = computed(() =>
    this.grantIds()
      .map((id) => this.resources().find((row) => row.id === id))
      .filter((row): row is Resource => row !== undefined),
  );

  constructor() {
    this.load();
    forkJoin({
      users: this.userApi.list(),
      resources: this.resourceApi.list(),
    }).subscribe({
      next: ({ users, resources }) => {
        this.users.set(users);
        this.resources.set(resources);
      },
      error: (error: unknown) =>
        this.notify.error(
          'No se pudieron cargar los catálogos',
          toApiMessage(error),
        ),
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: (rows) => {
        this.roles.set(rows);
        this.loading.set(false);
        // El panel nunca queda vacío: si nada está seleccionado, se abre el
        // primer rol (y tras eliminar uno, el que queda a continuación).
        if (!this.selectedRole() && !this.creating() && rows.length > 0) {
          this.loadDetail(rows[0]);
        }
      },
      error: (error: unknown) => {
        this.roles.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  isSelected(role: Role): boolean {
    return !this.creating() && this.selectedRole()?.id === role.id;
  }

  /** Cambiar de rol descarta el borrador solo si el usuario lo confirma. */
  select(role: Role): void {
    if (this.isSelected(role) && !this.creating()) return;
    if (this.hasUnsavedChanges()) {
      this.confirmation.confirm({
        header: 'Cambios sin guardar',
        message: `Hay cambios sin guardar en el detalle. Si cambias de rol se perderán. ¿Continuar con ${role.name}?`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Descartar y continuar',
        rejectLabel: 'Seguir editando',
        accept: () => this.loadDetail(role),
      });
      return;
    }
    this.loadDetail(role);
  }

  openCreate(): void {
    if (this.hasUnsavedChanges()) {
      this.confirmation.confirm({
        header: 'Cambios sin guardar',
        message: 'Hay cambios sin guardar en el detalle. Si creas un nuevo rol se perderán. ¿Continuar?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Descartar y continuar',
        rejectLabel: 'Seguir editando',
        accept: () => this.startCreate(),
      });
      return;
    }
    this.startCreate();
  }

  addMember(): void {
    const user = this.newMember();
    if (!user) return;
    if (!this.memberIds().includes(user)) {
      this.memberIds.update((ids) => [...ids, user]);
    }
    this.newMember.set(null);
  }

  removeMember(user: number): void {
    this.memberIds.update((ids) => ids.filter((id) => id !== user));
  }

  addGrant(): void {
    const resource = this.newResource();
    if (!resource) return;
    if (!this.grantIds().includes(resource)) {
      this.grantIds.update((ids) => [...ids, resource]);
    }
    this.newResource.set(null);
  }

  removeGrant(resource: number): void {
    this.grantIds.update((ids) => ids.filter((id) => id !== resource));
  }

  /** Un botón, tres frentes: `PATCH` del rol + altas y bajas de las dos tablas. */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: RolePayload = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      status: value.status,
    };

    this.saving.set(true);

    if (this.creating()) {
      this.api.create(payload).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.notify.success('Rol creado');
          this.load();
          this.loadDetail(created);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error('No se pudo crear el rol', toApiMessage(error));
        },
      });
      return;
    }

    const role = this.selectedRole();
    if (!role) {
      this.saving.set(false);
      return;
    }

    const ops: Array<Observable<unknown>> = [];
    if (this.form.dirty) ops.push(this.api.update(role.id, payload));
    ops.push(...this.memberOps(role.id), ...this.grantOps(role.id));

    if (ops.length === 0) {
      this.saving.set(false);
      this.notify.info('Sin cambios por guardar');
      return;
    }

    forkJoin(ops).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Cambios guardados');
        this.load();
        this.loadDetail({ ...role, ...payload });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error('No se pudo guardar', toApiMessage(error));
      },
    });
  }

  removeSelected(): void {
    const role = this.selectedRole();
    if (!role) return;

    this.confirmation.confirm({
      header: 'Eliminar rol',
      message: `¿Deseas eliminar el rol ${role.name}? Sus concesiones dejarán de autorizar.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.api.remove(role.id).subscribe({
          next: () => {
            this.notify.warn('Rol eliminado');
            this.clearDetail();
            this.load();
          },
          error: (error: unknown) =>
            this.notify.error('No se pudo eliminar', toApiMessage(error)),
        });
      },
    });
  }

  /** Hay borrador distinto de la última carga: formulario, miembros o concesiones. */
  private hasUnsavedChanges(): boolean {
    if (this.form.dirty) return true;
    return (
      !sameIds(this.memberIds(), this.baseMemberIds) ||
      !sameIds(this.grantIds(), this.baseGrantIds)
    );
  }

  private startCreate(): void {
    // `selectedRole` se conserva para poder volver con «Cancelar».
    this.creating.set(true);
    this.loadingDetail.set(false);
    this.memberRows = [];
    this.grantRows = [];
    this.baseMemberIds = [];
    this.baseGrantIds = [];
    this.memberIds.set([]);
    this.grantIds.set([]);
    this.newMember.set(null);
    this.newResource.set(null);
    this.memberFirst.set(0);
    this.grantFirst.set(0);
    this.form.reset({ name: '', description: '', status: 'active' });
  }

  cancelCreate(): void {
    const role = this.selectedRole();
    this.creating.set(false);
    if (role) {
      this.loadDetail(role);
    } else {
      this.clearDetail();
    }
  }

  private clearDetail(): void {
    this.creating.set(false);
    this.selectedRole.set(null);
    this.loadingDetail.set(false);
    this.memberRows = [];
    this.grantRows = [];
    this.baseMemberIds = [];
    this.baseGrantIds = [];
    this.memberIds.set([]);
    this.grantIds.set([]);
    this.newMember.set(null);
    this.newResource.set(null);
    this.memberFirst.set(0);
    this.grantFirst.set(0);
    this.form.reset({ name: '', description: '', status: 'active' });
  }

  private loadDetail(role: Role): void {
    this.creating.set(false);
    this.selectedRole.set(role);
    this.loadingDetail.set(true);
    this.newMember.set(null);
    this.newResource.set(null);
    this.memberFirst.set(0);
    this.grantFirst.set(0);
    this.form.reset({
      name: role.name,
      description: role.description ?? '',
      status: role.status,
    });

    forkJoin({
      assignments: this.roleUserApi.list(),
      grants: this.resourceRoleApi.list(),
    }).subscribe({
      next: ({ assignments, grants }) => {
        // Respuesta tardía de una selección que ya cambió: se descarta.
        if (this.creating() || this.selectedRole()?.id !== role.id) return;
        const rows = assignments.filter((row) => row.role === role.id);
        const rowsGrant = grants.filter((row) => row.role === role.id);
        this.memberRows = rows;
        this.grantRows = rowsGrant;
        this.baseMemberIds = rows
          .filter((row) => row.status === 'active')
          .map((row) => row.user);
        this.baseGrantIds = rowsGrant
          .filter((row) => row.status === 'active')
          .map((row) => row.resource);
        this.memberIds.set([...this.baseMemberIds]);
        this.grantIds.set([...this.baseGrantIds]);
        this.loadingDetail.set(false);
      },
      error: (error: unknown) => {
        this.loadingDetail.set(false);
        this.notify.error(
          'No se pudo cargar el detalle del rol',
          toApiMessage(error),
        );
      },
    });
  }

  /**
   * Miembros fuera del borrador = `DELETE` (baja lógica); miembros nuevos =
   * `PATCH status active` si ya hubo fila (el par rol + user es único) o `POST`.
   */
  private memberOps(roleId: number): Array<Observable<unknown>> {
    const ops: Array<Observable<unknown>> = [];
    const current = this.memberIds();

    for (const base of this.baseMemberIds) {
      if (!current.includes(base)) {
        const row = this.memberRows.find((link) => link.user === base);
        if (row) ops.push(this.roleUserApi.remove(row.id));
      }
    }

    for (const user of current) {
      if (this.baseMemberIds.includes(user)) continue;
      const existing = this.memberRows.find((link) => link.user === user);
      const payload: RoleUserPayload = {
        user,
        role: roleId,
        status: 'active',
      };
      ops.push(
        existing
          ? this.roleUserApi.update(existing.id, payload)
          : this.roleUserApi.create(payload),
      );
    }

    return ops;
  }

  private grantOps(roleId: number): Array<Observable<unknown>> {
    const ops: Array<Observable<unknown>> = [];
    const current = this.grantIds();

    for (const base of this.baseGrantIds) {
      if (!current.includes(base)) {
        const row = this.grantRows.find((grant) => grant.resource === base);
        if (row) ops.push(this.resourceRoleApi.remove(row.id));
      }
    }

    for (const resource of current) {
      if (this.baseGrantIds.includes(resource)) continue;
      const existing = this.grantRows.find(
        (grant) => grant.resource === resource,
      );
      const payload: ResourceRolePayload = {
        resource,
        role: roleId,
        status: 'active',
      };
      ops.push(
        existing
          ? this.resourceRoleApi.update(existing.id, payload)
          : this.resourceRoleApi.create(payload),
      );
    }

    return ops;
  }
}
