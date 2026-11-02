import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { CustomerApi } from './customer-api';

describe('CustomerApi', () => {
  let api: CustomerApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(CustomerApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should call /api/customers/ with trailing slash', () => {
    api.list().subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/customers/')
      .flush([]);

    api.remove(1).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/customers/1/')
      .flush(null, { status: 204, statusText: 'No Content' });
  });
});
