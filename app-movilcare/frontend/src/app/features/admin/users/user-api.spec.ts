import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { User } from '../../../core/models/user.model';
import { UserApi } from './user-api';

const USUARIO: User = {
  id: 2,
  username: 'seller',
  email: 'seller@movilcare.test',
  firstName: 'Sara',
  lastName: 'Vega',
  status: 'active',
};

describe('UserApi', () => {
  let api: UserApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    api = TestBed.inject(UserApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should read users without a password field', () => {
    let rows: User[] = [];

    api.list().subscribe((response) => (rows = response));
    http
      .expectOne('http://127.0.0.1:8000/api/users/')
      .flush([USUARIO]);

    expect(Object.keys(rows[0])).not.toContain('password');
  });

  it('should not send password when updating', () => {
    api
      .update(1, {
        username: 'seller',
        email: 'seller@movilcare.test',
        firstName: 'Sara',
        lastName: 'Vega',
        status: 'active',
      })
      .subscribe();

    const patch = http.expectOne('http://127.0.0.1:8000/api/users/1/');

    expect(patch.request.method).toBe('PATCH');
    expect('password' in (patch.request.body as object)).toBe(false);

    patch.flush(USUARIO);
  });

  it('should read the permissions envelope and return its array', () => {
    let total = -1;

    api
      .permissions(2)
      .subscribe((rows) => (total = rows.length));

    http
      .expectOne('http://127.0.0.1:8000/api/users/2/permissions/')
      .flush({
        permissions: [
          {
            method: 'GET',
            path: 'api/customers/',
            roleId: 2,
            roleName: 'seller',
          },
        ],
      });

    expect(total).toBe(1);
  });
});
