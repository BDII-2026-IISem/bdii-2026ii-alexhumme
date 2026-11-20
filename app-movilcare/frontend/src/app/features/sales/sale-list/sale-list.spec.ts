import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { Sale } from '../../../core/models/sale.model';
import { Notification } from '../../../core/services/notification';
import { CustomerApi } from '../../customers/customer-api';
import { PaymentApi } from '../../payments/payment-api';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { WarrantyApi } from '../../warranties/warranty-api';
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

  const SALE: Sale = {
    id: 61,
    customerId: 1,
    customerName: 'Ana Torres',
    saleDate: '2026-11-02T10:00:00-05:00',
    subtotal: '2199.98',
    tax: '0.00',
    total: '2199.98',
    status: 'active',
    lines: [],
  };

  it('should load sales, customers and units and reload after the POST', async () => {
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
    const unitsApi = {
      list: vi.fn().mockReturnValue(of([])),
    };
    const warrantyApi = {
      list: vi.fn().mockReturnValue(of([])),
    };
    const paymentApi = {
      list: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [SaleList],
      providers: [
        provideRouter([]),
        ConfirmationService,
        { provide: SaleApi, useValue: salesApi },
        { provide: CustomerApi, useValue: customersApi },
        { provide: SerializedUnitApi, useValue: unitsApi },
        { provide: WarrantyApi, useValue: warrantyApi },
        { provide: PaymentApi, useValue: paymentApi },
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
    expect(unitsApi.list).toHaveBeenCalledWith('active');

    fixture.componentInstance.save({
      customerId: 1,
      saleDate: '2026-11-02T15:30:00-05:00',
      items: [{ serializedUnitId: 7 }],
    });
    await fixture.whenStable();

    expect(salesApi.create).toHaveBeenCalled();
    expect(salesApi.list).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.sales().length).toBe(1);
    expect(fixture.componentInstance.sale()?.id).toBe(61);
    expect(warrantyApi.list).toHaveBeenCalledWith({ sale: 61 });
  });
});
