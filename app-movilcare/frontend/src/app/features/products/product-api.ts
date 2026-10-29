import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, ProductPayload } from '../../core/models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  list(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/`);
  }

  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${id}/`);
  }

  available(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/available/`);
  }

  create(payload: ProductPayload): Observable<Product> {
    return this.http.post<Product>(`${this.base}/`, payload);
  }

  update(
    id: number,
    payload: Partial<ProductPayload>,
  ): Observable<Product> {
    return this.http.patch<Product>(
      `${this.base}/${id}/`,
      payload,
    );
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }

  units(productId: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(
      `${this.base}/${productId}/units/`,
    );
  }
}