import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { Diagnosis, DiagnosisPayload } from '../../core/models/diagnosis.model';
import { DiagnosisApi } from './diagnosis-api';

describe('DiagnosisApi', () => {
  let api: DiagnosisApi;
  let http: HttpTestingController;

  const PAYLOAD: DiagnosisPayload = {
    serviceOrderId: 1,
    description: 'No enciende la pantalla',
    diagnosisDate: '2026-11-02',
    observations: null,
    status: 'active',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(DiagnosisApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should GET /api/diagnostics/?service_order=1 for list()', () => {
    api.list({ service_order: 1 }).subscribe();

    http
      .expectOne('http://127.0.0.1:8000/api/diagnostics/?service_order=1')
      .flush([]);
  });

  it('should POST, PATCH and DELETE /api/diagnostics/{id}/', () => {
    api.create(PAYLOAD).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/diagnostics/')
      .flush({ id: 1 } as Diagnosis);

    api.update(1, { status: 'inactive' }).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/diagnostics/1/')
      .flush({ id: 1 } as Diagnosis);

    api.remove(1).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/diagnostics/1/')
      .flush(null, { status: 204, statusText: 'No Content' });
  });
});
