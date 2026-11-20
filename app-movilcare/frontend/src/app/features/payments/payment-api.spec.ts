import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { Payment, PaymentPayload } from '../../core/models/payment.model';
import { PaymentApi } from './payment-api';

describe('PaymentApi', () => {
  let api: PaymentApi;
  let http: HttpTestingController;

  const PAYLOAD: PaymentPayload = {
    referenceType: 'sale',
    referenceId: 61,
    method: 'cash',
    amount: '2199.98',
    paymentDate: '2026-11-02',
    status: 'active',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(PaymentApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should GET /api/payments/ with snake_case query params', () => {
    api
      .list({ reference_type: 'sale', reference_id: 61, method: 'cash' })
      .subscribe();

    http
      .expectOne(
        'http://127.0.0.1:8000/api/payments/?reference_type=sale&reference_id=61&method=cash',
      )
      .flush([]);
  });

  it('should POST, PATCH and DELETE /api/payments/{id}/', () => {
    api.create(PAYLOAD).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/payments/')
      .flush({ id: 1 } as Payment);

    api.update(1, { status: 'inactive' }).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/payments/1/')
      .flush({ id: 1 } as Payment);

    api.remove(1).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/payments/1/')
      .flush(null, { status: 204, statusText: 'No Content' });
  });
});
