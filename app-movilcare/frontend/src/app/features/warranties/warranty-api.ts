import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Warranty, WarrantyPayload } from '../../core/models/warranty.model';

/**
 * Garantías por línea de venta.
 *
 * `params` usa los nombres de consulta tal cual los lee el backend
 * (`sale`, `sale_detail`, `status`): el CamelCase solo aplica al cuerpo.
 */
@Injectable({ providedIn: 'root' })
export class WarrantyApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/warranties`;

  list(params?: Record<string, string | number>): Observable<Warranty[]> {
    return this.http.get<Warranty[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<Warranty> {
    return this.http.get<Warranty>(`${this.base}/${id}/`);
  }

  create(payload: WarrantyPayload): Observable<Warranty> {
    return this.http.post<Warranty>(`${this.base}/`, payload);
  }

  update(
    id: number,
    payload: Partial<WarrantyPayload>,
  ): Observable<Warranty> {
    return this.http.patch<Warranty>(`${this.base}/${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}
