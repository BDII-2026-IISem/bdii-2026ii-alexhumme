import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Part, PartPayload } from '../../core/models/part.model';

/** Repuestos de bodega (CRUD + filtro `?status=`). */
@Injectable({ providedIn: 'root' })
export class PartApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/parts`;

  list(params?: Record<string, string | number>): Observable<Part[]> {
    return this.http.get<Part[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<Part> {
    return this.http.get<Part>(`${this.base}/${id}/`);
  }

  create(payload: PartPayload): Observable<Part> {
    return this.http.post<Part>(`${this.base}/`, payload);
  }

  update(id: number, payload: Partial<PartPayload>): Observable<Part> {
    return this.http.patch<Part>(`${this.base}/${id}/`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}
