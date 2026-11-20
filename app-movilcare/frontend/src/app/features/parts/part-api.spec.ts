import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { Part, PartPayload } from '../../core/models/part.model';
import { PartApi } from './part-api';

describe('PartApi', () => {
  let api: PartApi;
  let http: HttpTestingController;

  const PAYLOAD: PartPayload = {
    name: 'Batería iPhone 13',
    description: null,
    price: '45.00',
    stock: 10,
    status: 'active',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(PartApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should GET /api/parts/?status=active for list()', () => {
    api.list({ status: 'active' }).subscribe();

    http
      .expectOne('http://127.0.0.1:8000/api/parts/?status=active')
      .flush([]);
  });

  it('should POST, PATCH and DELETE /api/parts/{id}/', () => {
    api.create(PAYLOAD).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/parts/')
      .flush({ id: 1 } as Part);

    api.update(1, { stock: 8 }).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/parts/1/')
      .flush({ id: 1 } as Part);

    api.remove(1).subscribe();
    http
      .expectOne('http://127.0.0.1:8000/api/parts/1/')
      .flush(null, { status: 204, statusText: 'No Content' });
  });
});
