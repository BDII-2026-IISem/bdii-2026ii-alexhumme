import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Payment, PaymentPayload } from '../../core/models/payment.model';

/**
 * Pagos de ventas y órdenes.
 *
 * `params` usa los nombres de consulta del backend (`reference_type`,
 * `reference_id`, `method`, `status`): el CamelCase solo aplica al cuerpo.
 */
@Injectable({ providedIn: 'root' })
export class PaymentApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/payments`;

  list(params?: Record<string, string | number>): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.base}/${id}/`);
  }

  create(payload: PaymentPayload): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/`, payload);
  }

  update(
    id: number,
    payload: Partial<PaymentPayload>,
  ): Observable<Payment> {
    return this.http.patch<Payment>(`${this.base}/${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}
