import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ProductApi } from './product-api';

describe('ProductApi', () => {
  let api: ProductApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(ProductApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should call /api/products/?status=active', () => {
    api.list('active').subscribe();

    http
      .expectOne('http://127.0.0.1:8000/api/products/?status=active')
      .flush([]);

    api.list().subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/products/')
      .flush([]);

    api.available().subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/products/available/')
      .flush([]);
  });
});
