import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Customer } from '../../core/models/customer.model';
import { Product } from '../../core/models/product.model';
import { Sale } from '../../core/models/sale.model';
import { CustomerApi } from '../customers/customer-api';
import { ProductApi } from '../products/product-api';
import { SaleApi } from '../sales/sale-api';
import {
  toIsoWithOffset,
  toLocalInputValue,
} from '../sales/sale-date';
import { SerializedUnitApi } from '../serialized-units/serialized-unit-api';
import { Dashboard } from './dashboard';

function yesterday(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

describe('Dashboard', () => {
  const CUSTOMERS: Customer[] = [
    {
      id: 1,
      documentType: 'CC',
      documentNumber: '1098765432',
      name: 'Ana Torres',
      phone: '3001234567',
      email: 'ana@movilcare.test',
      status: 'active',
    },
    {
      id: 2,
      documentType: 'CC',
      documentNumber: '1087654321',
      name: 'Luis Ríos',
      phone: '3007654321',
      email: 'luis@movilcare.test',
      status: 'active',
    },
  ];

  const SALE_TODAY: Sale = {
    id: 1,
    customerId: 1,
    customerName: 'Ana Torres',
    saleDate: toIsoWithOffset(toLocalInputValue()),
    subtotal: '150.00',
    tax: '0.00',
    total: '150.00',
    status: 'active',
    lines: [],
  };

  const SALE_VOIDED_TODAY: Sale = {
    ...SALE_TODAY,
    id: 2,
    total: '999.00',
    status: 'inactive',
  };

  const SALE_OLD: Sale = {
    ...SALE_TODAY,
    id: 3,
    saleDate: toIsoWithOffset(toLocalInputValue(yesterday())),
    total: '777.00',
  };

  const PRODUCTS: Product[] = [
    {
      id: 10,
      sku: 'SKU-010',
      name: 'Producto inactivo sin unidades',
      description: null,
      price: '10.00',
      status: 'inactive',
    },
    {
      id: 11,
      sku: 'SKU-011',
      name: 'Producto con unidades',
      description: null,
      price: '20.00',
      status: 'active',
    },
    {
      id: 12,
      sku: 'SKU-012',
      name: 'Producto sin unidades',
      description: null,
      price: '30.00',
      status: 'active',
    },
  ];

  const UNITS = [
    {
      id: 100,
      product: 11,
      productId: 11,
      productName: 'Producto con unidades',
      serial: 'UNI-100',
      status: 'active' as const,
    },
  ];

  async function setup() {
    const salesApi = {
      list: vi
        .fn()
        .mockReturnValue(
          of([SALE_TODAY, SALE_VOIDED_TODAY, SALE_OLD]),
        ),
    };
    const productsApi = {
      list: vi.fn().mockReturnValue(of(PRODUCTS)),
    };
    const customersApi = {
      list: vi.fn().mockReturnValue(of(CUSTOMERS)),
    };
    const unitsApi = {
      list: vi.fn().mockReturnValue(of(UNITS)),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: SaleApi, useValue: salesApi },
        { provide: ProductApi, useValue: productsApi },
        { provide: CustomerApi, useValue: customersApi },
        { provide: SerializedUnitApi, useValue: unitsApi },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();

    return { fixture, salesApi, productsApi, customersApi, unitsApi };
  }

  it('should keep only the active sale of today', async () => {
    const { fixture } = await setup();

    const todaySales = fixture.componentInstance.todaySales();

    expect(todaySales.length).toBe(1);
    expect(todaySales[0].id).toBe(1);
    expect(fixture.componentInstance.todayTotal()).toBe(150);
  });

  it('should ignore inactive products and products with units in lowStock', async () => {
    const { fixture, customersApi } = await setup();

    const lowStockIds = fixture.componentInstance
      .lowStock()
      .map((product) => product.id);

    // El inactivo (10) se ignora aunque no tenga unidades; el 11 tiene
    // unidades; solo queda el 12, activo y sin unidades.
    expect(lowStockIds).toEqual([12]);

    // La tarjeta de clientes cuenta el arreglo activo.
    expect(fixture.componentInstance.clients().length).toBe(2);
    expect(customersApi.list).toHaveBeenCalledWith('active');
  });
});
