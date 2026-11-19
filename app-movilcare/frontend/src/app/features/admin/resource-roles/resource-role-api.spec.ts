import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ResourceRoleApi } from './resource-role-api';

describe('ResourceRoleApi', () => {
  let api: ResourceRoleApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    api = TestBed.inject(ResourceRoleApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should POST the grant with numeric role and resource', () => {
    api
      .create({ role: 2, resource: 7, status: 'active' })
      .subscribe();

    const alta = http.expectOne(
      'http://127.0.0.1:8000/api/resource-roles/',
    );

    expect(alta.request.method).toBe('POST');
    expect(alta.request.body).toEqual({
      role: 2,
      resource: 7,
      status: 'active',
    });

    alta.flush({ id: 99, role: 2, resource: 7, status: 'active' });
  });

  it('should retire a grant with a DELETE, not a row deletion on the server', () => {
    api.remove(7).subscribe();

    const baja = http.expectOne(
      'http://127.0.0.1:8000/api/resource-roles/7/',
    );

    expect(baja.request.method).toBe('DELETE');
    baja.flush(null, { status: 204, statusText: 'No Content' });
  });
});
