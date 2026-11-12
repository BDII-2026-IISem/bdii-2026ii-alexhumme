import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { SerializedUnitApi } from './serialized-unit-api';

describe('SerializedUnitApi', () => {
  let api: SerializedUnitApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(SerializedUnitApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should call /api/serialized-units/?status=active', () => {
    api.list('active').subscribe();

    http
      .expectOne(
        'http://127.0.0.1:8000/api/serialized-units/?status=active',
      )
      .flush([]);

    api.list().subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/serialized-units/')
      .flush([]);

    api.remove(1).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/serialized-units/1/')
      .flush(null, { status: 204, statusText: 'No Content' });
  });
});
