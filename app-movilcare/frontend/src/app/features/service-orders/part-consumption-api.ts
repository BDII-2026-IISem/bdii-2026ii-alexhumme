import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PartConsumption,
  PartConsumptionPayload,
} from '../../core/models/part-consumption.model';

/**
 * Consumos de repuesto por orden (`?service_order=`, `?part=`).
 * El `unitPrice` es opcional: sin él el backend usa el precio vigente.
 */
@Injectable({ providedIn: 'root' })
export class PartConsumptionApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/part-consumptions`;

  list(
    params?: Record<string, string | number>,
  ): Observable<PartConsumption[]> {
    return this.http.get<PartConsumption[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<PartConsumption> {
    return this.http.get<PartConsumption>(`${this.base}/${id}/`);
  }

  create(payload: PartConsumptionPayload): Observable<PartConsumption> {
    return this.http.post<PartConsumption>(`${this.base}/`, payload);
  }

  update(
    id: number,
    payload: Partial<PartConsumptionPayload>,
  ): Observable<PartConsumption> {
    return this.http.patch<PartConsumption>(`${this.base}/${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}
