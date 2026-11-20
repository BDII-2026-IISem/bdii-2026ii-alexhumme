import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ServiceOrder,
  ServiceOrderPayload,
} from '../../core/models/service-order.model';

/**
 * Órdenes de servicio.
 *
 * `params` usa los nombres de consulta del backend (`status`, `customer`,
 * `serialized_unit`): el CamelCase solo aplica al cuerpo.
 */
@Injectable({ providedIn: 'root' })
export class ServiceOrderApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/service-orders`;

  list(params?: Record<string, string | number>): Observable<ServiceOrder[]> {
    return this.http.get<ServiceOrder[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<ServiceOrder> {
    return this.http.get<ServiceOrder>(`${this.base}/${id}/`);
  }

  create(payload: ServiceOrderPayload): Observable<ServiceOrder> {
    return this.http.post<ServiceOrder>(`${this.base}/`, payload);
  }

  update(
    id: number,
    payload: Partial<ServiceOrderPayload>,
  ): Observable<ServiceOrder> {
    return this.http.patch<ServiceOrder>(`${this.base}/${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}
