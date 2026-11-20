import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Diagnosis, DiagnosisPayload } from '../../core/models/diagnosis.model';

/** Diagnósticos técnicos (`?service_order=` carga los de una orden). */
@Injectable({ providedIn: 'root' })
export class DiagnosisApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/diagnostics`;

  list(params?: Record<string, string | number>): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<Diagnosis> {
    return this.http.get<Diagnosis>(`${this.base}/${id}/`);
  }

  create(payload: DiagnosisPayload): Observable<Diagnosis> {
    return this.http.post<Diagnosis>(`${this.base}/`, payload);
  }

  update(
    id: number,
    payload: Partial<DiagnosisPayload>,
  ): Observable<Diagnosis> {
    return this.http.patch<Diagnosis>(`${this.base}/${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}
