import { TestBed } from '@angular/core/testing';

import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { SaleCreatePayload } from '../../../core/models/sale.model';
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

  const PRODUCT: Product = {
    id: 5,
    sku: 'SKU-005',
    name: 'Laptop Lenovo',
    description: null,
    price: '1099.99',
    status: 'active',
  };

  async function setup() {
    const fixture = TestBed.createComponent(SaleForm);
    fixture.componentRef.setInput('customers', [CUSTOMER]);
    fixture.componentRef.setInput('products', [PRODUCT]);
    fixture.componentRef.setInput('stock', new Map([[5, 10]]));
    await fixture.whenStable();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SaleForm],
    });
  });

  it('should keep one line when the product is repeated', async () => {
    const fixture = await setup();

    fixture.componentInstance.productId.set(5);
    fixture.componentInstance.quantity.set(2);
    fixture.componentInstance.addLine();

    // `addLine()` limpia el selector al agregar: se vuelve a elegir el mismo
    // producto para que el segundo intento llegue al chequeo de duplicado.
    fixture.componentInstance.productId.set(5);
    fixture.componentInstance.quantity.set(2);
    fixture.componentInstance.addLine();

    expect(fixture.componentInstance.lines().length).toBe(1);
    expect(fixture.componentInstance.draftError()).toBe(
      'Ese producto ya está en la venta.',
    );

    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('ya está en la venta');
  });

  it('should emit customerId, zoned saleDate, discounts and items', async () => {
    const fixture = await setup();

    fixture.componentInstance.customerId.set(1);
    fixture.componentInstance.saleDate.set('2026-11-02T15:30');
    fixture.componentInstance.discounts.set(10);
    fixture.componentInstance.productId.set(5);
    fixture.componentInstance.quantity.set(2);
    fixture.componentInstance.addLine();

    let body: SaleCreatePayload | undefined;
    fixture.componentInstance.saved.subscribe(
      (payload) => (body = payload),
    );
    fixture.componentInstance.submit();

    expect(body).toEqual({
      customerId: 1,
      saleDate: toIsoWithOffset('2026-11-02T15:30'),
      discounts: '10.00',
      items: [{ productId: 5, quantity: 2 }],
    });
  });
});
