import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SerializedUnit,
  SerializedUnitPayload,
} from '../../core/models/serialized-unit.model';

@Injectable({ providedIn: 'root' })
export class SerializedUnitApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/serialized-units`;

  list(): Observable<SerializedUnit[]> {
    return this.http.get<SerializedUnit[]>(`${this.base}/`);
  }

  get(id: number): Observable<SerializedUnit> {
    return this.http.get<SerializedUnit>(`${this.base}/${id}/`);
  }

  create(payload: SerializedUnitPayload): Observable<SerializedUnit> {
    return this.http.post<SerializedUnit>(`${this.base}/`, payload);
  }

  update(
    id: number,
    payload: Partial<SerializedUnitPayload>,
  ): Observable<SerializedUnit> {
    return this.http.patch<SerializedUnit>(
      `${this.base}/${id}/`,
      payload,
    );
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}