import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SerializedUnitPayload } from '../../../core/models/serialized-unit.model';
import { ProductApi } from '../../products/product-api';
import { SerializedUnitForm } from './serialized-unit-form';

describe('SerializedUnitForm', () => {
  it('should emit saved with the trimmed body', async () => {
    await TestBed.configureTestingModule({
      imports: [SerializedUnitForm],
      providers: [
        {
          provide: ProductApi,
          useValue: { available: () => of([]) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SerializedUnitForm);
    await fixture.whenStable();

    let body: Omit<SerializedUnitPayload, 'status'> | undefined;
    fixture.componentInstance.saved.subscribe(
      (payload) => (body = payload),
    );

    fixture.componentInstance.form.setValue({
      product: 3,
      name: ' UNI-0001 ',
      description: '  ',
    });
    fixture.componentInstance.submit();

    expect(body).toEqual({
      product: 3,
      name: 'UNI-0001',
      description: null,
    });
  });
});
