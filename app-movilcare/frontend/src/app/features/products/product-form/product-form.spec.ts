import { TestBed } from '@angular/core/testing';

import { ProductPayload } from '../../../core/models/product.model';
import { ProductForm } from './product-form';

describe('ProductForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductForm],
    });
  });

  it('should emit saved with the trimmed body', async () => {
    const fixture = TestBed.createComponent(ProductForm);
    await fixture.whenStable();

    let body: Omit<ProductPayload, 'status'> | undefined;
    fixture.componentInstance.saved.subscribe(
      (payload) => (body = payload),
    );

    fixture.componentInstance.form.setValue({
      sku: ' SKU-001 ',
      name: ' Laptop Lenovo ',
      description: '  ',
      price: 1099.5,
    });
    fixture.componentInstance.submit();

    expect(body).toEqual({
      sku: 'SKU-001',
      name: 'Laptop Lenovo',
      description: null,
      price: '1099.50',
    });
  });

  it('should not emit when the price is zero', async () => {
    const fixture = TestBed.createComponent(ProductForm);
    await fixture.whenStable();

    let emitted = false;
    fixture.componentInstance.saved.subscribe(() => (emitted = true));

    fixture.componentInstance.form.setValue({
      sku: 'SKU-001',
      name: 'Laptop Lenovo',
      description: '',
      price: 0,
    });
    fixture.componentInstance.submit();

    expect(emitted).toBe(false);
  });
});
