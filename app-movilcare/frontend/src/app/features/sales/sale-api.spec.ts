import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { SaleApi } from './sale-api';

describe('SaleApi', () => {
  let api: SaleApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(SaleApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should GET /api/sales/{id}/ for get()', () => {
    api.get(60).subscribe();
    http
      .expectOne(
        (request) =>
          request.method === 'GET' &&
          request.url === 'http://127.0.0.1:8000/api/sales/60/',
      )
      .flush({ id: 60 });
  });

  it('should DELETE /api/sales/{id}/ for voidSale()', () => {
    api.voidSale(60).subscribe();
    http
      .expectOne(
        (request) =>
          request.method === 'DELETE' &&
          request.url === 'http://127.0.0.1:8000/api/sales/60/',
      )
      .flush(null, {
        status: 204,
        statusText: 'No Content',
      });
  });
});
