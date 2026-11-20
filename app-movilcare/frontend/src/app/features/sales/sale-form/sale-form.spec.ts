import { TestBed } from '@angular/core/testing';

import { Customer } from '../../../core/models/customer.model';
import { SaleCreatePayload } from '../../../core/models/sale.model';
import { SerializedUnit } from '../../../core/models/serialized-unit.model';
import { toIsoWithOffset } from '../sale-date';
import { SaleForm } from './sale-form';

describe('SaleForm', () => {
  const CUSTOMER: Customer = {
    id: 1,
    documentType: 'CC',
    documentNumber: '1098765432',
    name: 'Ana Torres',
    phone: '3001234567',
    email: 'ana@movilcare.test',
    status: 'active',
  };

  const UNIT: SerializedUnit = {
    id: 7,
    product: 5,
    productId: 5,
    productName: 'Laptop Lenovo',
    serial: 'SN-0007',
    status: 'active',
  };

  async function setup() {
    const fixture = TestBed.createComponent(SaleForm);
    fixture.componentRef.setInput('customers', [CUSTOMER]);
    fixture.componentRef.setInput('units', [UNIT]);
    await fixture.whenStable();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SaleForm],
    });
  });

  it('should emit customerId, zoned saleDate and one item per unit', async () => {
    const fixture = await setup();

    let body: SaleCreatePayload | undefined;
    fixture.componentInstance.saved.subscribe(
      (payload) => (body = payload),
    );

    fixture.componentInstance.form.setValue({
      customerId: 1,
      saleDate: '2026-11-02T15:30',
      unitIds: [7],
    });
    fixture.componentInstance.submit();

    expect(body).toEqual({
      customerId: 1,
      saleDate: toIsoWithOffset('2026-11-02T15:30'),
      items: [{ serializedUnitId: 7 }],
    });
  });

  it('should not emit without units', async () => {
    const fixture = await setup();

    let emitted = false;
    fixture.componentInstance.saved.subscribe(() => (emitted = true));

    fixture.componentInstance.form.setValue({
      customerId: 1,
      saleDate: '2026-11-02T15:30',
      unitIds: [],
    });
    fixture.componentInstance.submit();

    expect(emitted).toBe(false);
  });
});
