import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Customer, CustomerPayload } from '../../core/models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/customers`;

  list(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.base}/`);
  }

  get(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.base}/${id}/`);
  }

  create(payload: CustomerPayload): Observable<Customer> {
    return this.http.post<Customer>(`${this.base}/`, payload);
  }

  update(
    id: number,
    payload: Partial<CustomerPayload>,
  ): Observable<Customer> {
    return this.http.patch<Customer>(
      `${this.base}/${id}/`,
      payload,
    );
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}