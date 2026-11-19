import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { EffectivePermission } from '../../../../core/models/auth.model';
import { RoleUser } from '../../../../core/models/role-user.model';
import { Role } from '../../../../core/models/role.model';
import { User } from '../../../../core/models/user.model';
import { Notification } from '../../../../core/services/notification';
import { RoleUserApi } from '../../role-users/role-user-api';
import { RoleApi } from '../../roles/role-api';
import { UserApi } from '../user-api';
import { UserList } from './user-list';

const USUARIO: User = {
  id: 2,
  username: 'seller',
  email: 'seller@movilcare.test',
  firstName: 'Sara',
  lastName: 'Vega',
  status: 'active',
};

const PERMISOS: EffectivePermission[] = [
  {
    method: 'GET',
    path: 'api/customers/',
    roleId: 2,
    roleName: 'seller',
  },
  {
    method: 'GET',
    path: 'api/sales/',
    roleId: 2,
    roleName: 'seller',
  },
];

const ROLES: Role[] = [
  { id: 1, name: 'admin', description: null, status: 'active' },
  { id: 2, name: 'vendedor', description: null, status: 'active' },
];

/** El usuario 2 entra con el rol 1; la fila 60 es una baja que se puede reactivar. */
const ASIGNACIONES: RoleUser[] = [
  { id: 50, role: 1, user: 2, status: 'active' },
  { id: 60, role: 2, user: 2, status: 'inactive' },
];

describe('UserList', () => {
  const userApi = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    permissions: vi.fn(),
  };
  const roleApi = { list: vi.fn() };
  const roleUserApi = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  function setup() {
    userApi.list.mockReturnValue(of([USUARIO]));
    userApi.create.mockReturnValue(of({ ...USUARIO, id: 9, username: 'newbie' }));
    userApi.update.mockReturnValue(of(USUARIO));
    userApi.remove.mockReturnValue(of(undefined));
    userApi.permissions.mockReturnValue(of(PERMISOS));
    roleApi.list.mockReturnValue(of(ROLES));
    roleUserApi.list.mockReturnValue(of(ASIGNACIONES));
    roleUserApi.create.mockReturnValue(
      of({ id: 70, role: 2, user: 9, status: 'active' }),
    );
    roleUserApi.update.mockReturnValue(
      of({ id: 60, role: 2, user: 2, status: 'active' }),
    );
    roleUserApi.remove.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      imports: [UserList],
      providers: [
        ConfirmationService,
        { provide: UserApi, useValue: userApi },
        { provide: RoleApi, useValue: roleApi },
        { provide: RoleUserApi, useValue: roleUserApi },
        {
          provide: Notification,
          useValue: { success() {}, warn() {}, error() {}, info() {} },
        },
      ],
    });
  }

  beforeEach(setup);

  it('should paint one row per permission in the dialog', async () => {
    const fixture = TestBed.createComponent(UserList);
    await fixture.whenStable();

    fixture.componentInstance.openPermissions(USUARIO);
    await fixture.whenStable();

    const cells = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '[data-testid="permisos"] tbody tr',
    );

    expect(cells.length).toBe(2);
    expect(cells[0].textContent).toContain('GET');
    expect(cells[0].textContent).toContain('api/customers/');
    expect(cells[0].textContent).toContain('seller');
  });

  it('should paint the roles of each user as tags in the table', async () => {
    const fixture = TestBed.createComponent(UserList);
    await fixture.whenStable();

    const cells = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'tbody tr:first-child td',
    );
    const tags = [...cells[2].querySelectorAll('p-tag')].map((tag) =>
      tag.textContent?.trim(),
    );

    expect(tags).toEqual(['admin']);
    expect(cells[2].textContent).not.toContain('vendedor');
  });

  it('should open the dialog with the active roles of the user', async () => {
    const fixture = TestBed.createComponent(UserList);
    await fixture.whenStable();

    fixture.componentInstance.openEdit(USUARIO);
    await fixture.whenStable();

    expect(fixture.componentInstance.form.controls.roles.value).toEqual([1]);
    expect(fixture.componentInstance.roles()).toEqual(ROLES);
  });

  it('should send the user PATCH and the role delta on save', async () => {
    const fixture = TestBed.createComponent(UserList);
    await fixture.whenStable();

    fixture.componentInstance.openEdit(USUARIO);
    await fixture.whenStable();

    // Se retira el rol 1 y se reactiva la fila inexistente-para-rol del usuario.
    fixture.componentInstance.form.controls.roles.setValue([2]);
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(userApi.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ username: 'seller' }),
    );
    expect(roleUserApi.remove).toHaveBeenCalledWith(50);
    expect(roleUserApi.update).toHaveBeenCalledWith(60, {
      role: 2,
      user: 2,
      status: 'active',
    });
    expect(roleUserApi.create).not.toHaveBeenCalled();
    expect(fixture.componentInstance.dialogVisible()).toBe(false);
  });

  it('should create the user and then assign the selected roles', async () => {
    const fixture = TestBed.createComponent(UserList);
    await fixture.whenStable();

    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.patchValue({
      username: 'newbie',
      email: 'newbie@movilcare.test',
      password: 'secret123',
      roles: [1],
    });
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(userApi.create).toHaveBeenCalled();
    expect(roleUserApi.create).toHaveBeenCalledWith({
      role: 1,
      user: 9,
      status: 'active',
    });
    expect(roleUserApi.remove).not.toHaveBeenCalled();
    expect(roleUserApi.update).not.toHaveBeenCalled();
  });

  it('should not create a user without at least one role', async () => {
    const fixture = TestBed.createComponent(UserList);
    await fixture.whenStable();

    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.patchValue({
      username: 'norole',
      email: 'norole@movilcare.test',
      password: 'secret123',
      roles: [],
    });
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(fixture.componentInstance.form.controls.roles.invalid).toBe(true);
    expect(userApi.create).not.toHaveBeenCalled();
    expect(roleUserApi.create).not.toHaveBeenCalled();
  });
});
