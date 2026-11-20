import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import {
  ServiceOrder,
  ServiceOrderPayload,
} from '../../core/models/service-order.model';
import { ServiceOrderApi } from './service-order-api';

describe('ServiceOrderApi', () => {
  let api: ServiceOrderApi;
  let http: HttpTestingController;

  const PAYLOAD: ServiceOrderPayload = {
    customerId: 1,
    serializedUnitId: 7,
    openDate: '2026-11-02',
    closeDate: null,
    status: 'active',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(ServiceOrderApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should GET /api/service-orders/ with snake_case query params', () => {
    api.list({ customer: 1, serialized_unit: 7, status: 'active' }).subscribe();

    http
      .expectOne(
        'http://127.0.0.1:8000/api/service-orders/?customer=1&serialized_unit=7&status=active',
      )
      .flush([]);
  });

  it('should POST, PATCH and DELETE /api/service-orders/{id}/', () => {
    api.create(PAYLOAD).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/service-orders/')
      .flush({ id: 1 } as ServiceOrder);

    api.update(1, { closeDate: '2026-11-05' }).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/service-orders/1/')
      .flush({ id: 1 } as ServiceOrder);

    api.remove(1).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/service-orders/1/')
      .flush(null, { status: 204, statusText: 'No Content' });
  });
});
