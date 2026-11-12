import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { EffectivePermission } from '../../../../core/models/auth.model';
import { User } from '../../../../core/models/user.model';
import { Notification } from '../../../../core/services/notification';
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

describe('UserList', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserList],
      providers: [
        ConfirmationService,
        {
          provide: UserApi,
          useValue: {
            list: () => of([USUARIO]),
            permissions: () => of(PERMISOS),
          },
        },
        {
          provide: Notification,
          useValue: { success() {}, warn() {}, error() {}, info() {} },
        },
      ],
    });
  });

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
});
