import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { Notification } from '../../../core/services/notification';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { ProductApi } from '../product-api';
import { ProductList } from './product-list';

describe('ProductList', () => {
  const PRODUCT: Product = {
    id: 1,
    sku: 'SKU-001',
    name: 'Laptop Lenovo',
    description: null,
    price: '1099.99',
    status: 'active',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [
        // RouterLink en la pestaña «Unidades» necesita el router de prueba.
        provideRouter([]),
        ConfirmationService,
        {
          provide: ProductApi,
          useValue: {
            list: () => of([PRODUCT]),
            available: () => of([PRODUCT]),
          },
        },
        {
          provide: SerializedUnitApi,
          useValue: { list: () => of([]) },
        },
        {
          provide: Notification,
          useValue: { success() {}, warn() {}, error() {} },
        },
      ],
    }).compileComponents();
  });

  it('should render the product in the master list and select it', async () => {
    const fixture = TestBed.createComponent(ProductList);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('SKU-001');
    expect(element.textContent).toContain('Sin unidades');
    expect(fixture.componentInstance.selected()?.id).toBe(1);
    expect(fixture.componentInstance.withoutUnits().has(1)).toBe(true);
  });
});
