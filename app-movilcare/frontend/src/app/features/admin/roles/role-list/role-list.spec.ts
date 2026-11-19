import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Resource } from '../../../../core/models/resource.model';
import { ResourceRole } from '../../../../core/models/resource-role.model';
import { Role } from '../../../../core/models/role.model';
import { RoleUser } from '../../../../core/models/role-user.model';
import { User } from '../../../../core/models/user.model';
import { Notification } from '../../../../core/services/notification';
import { ResourceApi } from '../../resources/resource-api';
import { ResourceRoleApi } from '../../resource-roles/resource-role-api';
import { RoleUserApi } from '../../role-users/role-user-api';
import { UserApi } from '../../users/user-api';
import { RoleApi } from '../role-api';
import { RoleList } from './role-list';

const ROL: Role = {
  id: 1,
  name: 'admin',
  description: 'Acceso completo',
  status: 'active',
};

const OTRO_ROL: Role = {
  id: 2,
  name: 'vendedor',
  description: 'Solo lectura',
  status: 'active',
};

const USUARIOS: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@movilcare.test',
    firstName: 'Ana',
    lastName: 'Torres',
    status: 'active',
  },
  {
    id: 2,
    username: 'vendedor',
    email: 'vendedor@movilcare.test',
    firstName: 'Luis',
    lastName: 'Gomez',
    status: 'active',
  },
];

const RECURSOS: Resource[] = [
  {
    id: 7,
    name: 'GET api/customers/',
    method: 'GET',
    route: 'api/customers/',
    status: 'active',
  },
  {
    id: 26,
    name: 'POST api/sales/',
    method: 'POST',
    route: 'api/sales/',
    status: 'active',
  },
];

const ASIGNACIONES: RoleUser[] = [
  { id: 10, role: 1, user: 1, status: 'active' },
  { id: 11, role: 1, user: 2, status: 'active' },
  { id: 12, role: 2, user: 2, status: 'active' },
];

const CONCESIONES: ResourceRole[] = [
  { id: 100, resource: 7, role: 1, status: 'active' },
  { id: 101, resource: 26, role: 2, status: 'active' },
];

describe('RoleList', () => {
  function setup(overrides: Record<string, unknown> = {}) {
    const roleApi = {
      list: vi.fn().mockReturnValue(of([ROL, OTRO_ROL])),
      create: vi.fn().mockReturnValue(of(ROL)),
      update: vi.fn().mockReturnValue(of(ROL)),
      remove: vi.fn().mockReturnValue(of(undefined)),
      ...overrides,
    };
    const roleUserApi = {
      list: vi.fn().mockReturnValue(of(ASIGNACIONES)),
      create: vi.fn().mockReturnValue(of(ASIGNACIONES[0])),
      update: vi.fn().mockReturnValue(of(ASIGNACIONES[0])),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };
    const resourceRoleApi = {
      list: vi.fn().mockReturnValue(of(CONCESIONES)),
      create: vi.fn().mockReturnValue(of(CONCESIONES[0])),
      update: vi.fn().mockReturnValue(of(CONCESIONES[0])),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [RoleList],
      providers: [
        ConfirmationService,
        { provide: RoleApi, useValue: roleApi },
        { provide: RoleUserApi, useValue: roleUserApi },
        { provide: ResourceRoleApi, useValue: resourceRoleApi },
        {
          provide: UserApi,
          useValue: { list: vi.fn().mockReturnValue(of(USUARIOS)) },
        },
        {
          provide: ResourceApi,
          useValue: { list: vi.fn().mockReturnValue(of(RECURSOS)) },
        },
        {
          provide: Notification,
          useValue: {
            success() {},
            warn() {},
            error() {},
            info() {},
          },
        },
      ],
    });

    return { roleApi, roleUserApi, resourceRoleApi };
  }

  it('should paint the users and the grants of the selected role', async () => {
    setup();
    const fixture = TestBed.createComponent(RoleList);
    await fixture.whenStable();

    fixture.componentInstance.select(ROL);
    await fixture.whenStable();

    const users = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll('[data-testid="usuarios-rol"] tbody tr');
    const grants = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll('[data-testid="permisos-rol"] tbody tr');

    expect(users.length).toBe(2);
    expect(users[0].textContent).toContain('admin');
    expect(grants.length).toBe(1);
    expect(grants[0].textContent).toContain('GET');
    expect(grants[0].textContent).toContain('api/customers/');
  });

  it('should send the role PATCH and the member DELETE on save', async () => {
    const { roleApi, roleUserApi } = setup();
    const fixture = TestBed.createComponent(RoleList);
    await fixture.whenStable();

    fixture.componentInstance.select(ROL);
    await fixture.whenStable();

    // En la UI el tipeo marca `dirty` por la tubería del CVA; `patchValue`
    // no lo hace, así que se marca igual que cuando el usuario escribe.
    fixture.componentInstance.form.patchValue({ name: 'superadmin' });
    fixture.componentInstance.form.markAsDirty();
    fixture.componentInstance.removeMember(1);
    fixture.componentInstance.save();
    await fixture.whenStable();

    expect(roleApi.update).toHaveBeenCalledWith(1, {
      name: 'superadmin',
      description: 'Acceso completo',
      status: 'active',
    });
    expect(roleUserApi.remove).toHaveBeenCalledWith(10);
    expect(roleUserApi.create).not.toHaveBeenCalled();
  });

  it('should POST a new grant without touching the role when only it changed', async () => {
    const { roleApi, resourceRoleApi } = setup();
    const fixture = TestBed.createComponent(RoleList);
    await fixture.whenStable();

    fixture.componentInstance.select(ROL);
    await fixture.whenStable();

    fixture.componentInstance.newResource.set(26);
    fixture.componentInstance.addGrant();
    fixture.componentInstance.save();
    await fixture.whenStable();

    expect(resourceRoleApi.create).toHaveBeenCalledWith({
      resource: 26,
      role: 1,
      status: 'active',
    });
    expect(roleApi.update).not.toHaveBeenCalled();
  });

  it('should create the role from the list button and filter the list', async () => {
    const { roleApi } = setup();
    const fixture = TestBed.createComponent(RoleList);
    await fixture.whenStable();

    const component = fixture.componentInstance;
    expect(component.visibleRoles().length).toBe(2);

    component.filter.set('vend');
    expect(component.visibleRoles().length).toBe(1);
    expect(component.visibleRoles()[0].name).toBe('vendedor');
    component.filter.set('');

    component.openCreate();
    component.form.patchValue({ name: 'operador' });
    component.save();
    await fixture.whenStable();

    expect(roleApi.create).toHaveBeenCalledWith({
      name: 'operador',
      description: null,
      status: 'active',
    });
    expect(roleApi.update).not.toHaveBeenCalled();
  });
});
