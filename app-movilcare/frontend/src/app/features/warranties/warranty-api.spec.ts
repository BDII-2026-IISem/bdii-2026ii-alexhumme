import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { Warranty, WarrantyPayload } from '../../core/models/warranty.model';
import { WarrantyApi } from './warranty-api';

describe('WarrantyApi', () => {
  let api: WarrantyApi;
  let http: HttpTestingController;

  const PAYLOAD: WarrantyPayload = {
    saleDetailId: 5,
    startDate: '2026-11-02',
    endDate: '2027-11-02',
    warrantyType: 'commercial',
    description: null,
    status: 'active',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(WarrantyApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should GET /api/warranties/ with snake_case query params', () => {
    api.list({ sale: 61, sale_detail: 5, status: 'active' }).subscribe();

    http
      .expectOne(
        'http://127.0.0.1:8000/api/warranties/?sale=61&sale_detail=5&status=active',
      )
      .flush([]);
  });

  it('should POST, PATCH and DELETE /api/warranties/{id}/', () => {
    api.create(PAYLOAD).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/warranties/')
      .flush({ id: 1 } as Warranty);

    api.update(1, { status: 'inactive' }).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/warranties/1/')
      .flush({ id: 1 } as Warranty);

    api.remove(1).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/warranties/1/')
      .flush(null, { status: 204, statusText: 'No Content' });
  });
});
