import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { Sale } from '../../../core/models/sale.model';
import { Notification } from '../../../core/services/notification';
import { CustomerApi } from '../../customers/customer-api';
import { ProductApi } from '../../products/product-api';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { SaleApi } from '../sale-api';
import { SaleList } from './sale-list';

describe('SaleList', () => {
  const CUSTOMER: Customer = {
    id: 1,
    documentType: 'CC',
    documentNumber: '1098765432',
    name: 'Ana Torres',
    phone: '3001234567',
    email: 'ana@movilcare.test',
    status: 'active',
  };

  const PRODUCT: Product = {
    id: 5,
    sku: 'SKU-005',
    name: 'Laptop Lenovo',
    description: null,
    price: '1099.99',
    status: 'active',
  };

  const SALE: Sale = {
    id: 61,
    customerId: 1,
    customerName: 'Ana Torres',
    saleDate: '2026-11-02T10:00:00-05:00',
    subtotal: '2199.98',
    tax: '0.00',
    discounts: '10.00',
    total: '2189.98',
    status: 'active',
    lines: [],
  };

  it('should load the four collections and reload after the POST', async () => {
    const salesApi = {
      list: vi
        .fn()
        .mockReturnValueOnce(of([]))
        .mockReturnValueOnce(of([SALE])),
      create: vi.fn().mockReturnValue(of(SALE)),
    };
    const customersApi = {
      list: vi.fn().mockReturnValue(of([CUSTOMER])),
    };
    const productsApi = {
      available: vi.fn().mockReturnValue(of([PRODUCT])),
    };
    const unitsApi = {
      list: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [SaleList],
      providers: [
        provideRouter([]),
        { provide: SaleApi, useValue: salesApi },
        { provide: CustomerApi, useValue: customersApi },
        { provide: ProductApi, useValue: productsApi },
        { provide: SerializedUnitApi, useValue: unitsApi },
        {
          provide: Notification,
          useValue: { success() {}, warn() {}, error() {} },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SaleList);
    await fixture.whenStable();

    expect(salesApi.list).toHaveBeenCalledTimes(1);
    expect(customersApi.list).toHaveBeenCalledWith('active');
    expect(productsApi.available).toHaveBeenCalled();
    expect(unitsApi.list).toHaveBeenCalledWith('active');

    fixture.componentInstance.save({
      customerId: 1,
      saleDate: '2026-11-02T15:30:00-05:00',
      discounts: '10.00',
      items: [{ productId: 5, quantity: 2 }],
    });
    await fixture.whenStable();

    expect(salesApi.create).toHaveBeenCalled();
    expect(salesApi.list).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.sales().length).toBe(1);
  });
});
