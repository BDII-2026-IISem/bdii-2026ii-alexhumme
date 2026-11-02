import { TestBed } from '@angular/core/testing';

import { CustomerPayload } from '../../../core/models/customer.model';
import { CustomerForm } from './customer-form';

describe('CustomerForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CustomerForm],
    });
  });

  it('should emit saved with the trimmed body', async () => {
    const fixture = TestBed.createComponent(CustomerForm);
    await fixture.whenStable();

    let body: Omit<CustomerPayload, 'status'> | undefined;
    fixture.componentInstance.saved.subscribe(
      (payload) => (body = payload),
    );

    fixture.componentInstance.form.setValue({
      name: ' Ana ',
      documentType: ' CC ',
      documentNumber: ' 1098765432',
      phone: '',
      email: '',
    });
    fixture.componentInstance.submit();

    expect(body).toEqual({
      name: 'Ana',
      documentType: 'CC',
      documentNumber: '1098765432',
      phone: null,
      email: null,
    });
  });
});
