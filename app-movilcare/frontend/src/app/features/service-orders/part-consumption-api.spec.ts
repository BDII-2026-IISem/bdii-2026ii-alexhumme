import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import {
  PartConsumption,
  PartConsumptionPayload,
} from '../../core/models/part-consumption.model';
import { PartConsumptionApi } from './part-consumption-api';

describe('PartConsumptionApi', () => {
  let api: PartConsumptionApi;
  let http: HttpTestingController;

  const PAYLOAD: PartConsumptionPayload = {
    serviceOrderId: 1,
    partId: 8,
    quantity: 2,
    unitPrice: '45.00',
    status: 'active',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(PartConsumptionApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should GET /api/part-consumptions/ with snake_case query params', () => {
    api.list({ service_order: 1, part: 8 }).subscribe();

    http
      .expectOne(
        'http://127.0.0.1:8000/api/part-consumptions/?service_order=1&part=8',
      )
      .flush([]);
  });

  it('should POST, PATCH and DELETE /api/part-consumptions/{id}/', () => {
    api.create(PAYLOAD).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/part-consumptions/')
      .flush({ id: 1 } as PartConsumption);

    api.update(1, { quantity: 3 }).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/part-consumptions/1/')
      .flush({ id: 1 } as PartConsumption);

    api.remove(1).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/part-consumptions/1/')
      .flush(null, { status: 204, statusText: 'No Content' });
  });
});
