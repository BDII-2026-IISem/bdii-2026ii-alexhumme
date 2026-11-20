import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { SerializedUnit } from '../../../core/models/serialized-unit.model';
import { Notification } from '../../../core/services/notification';
import { ProductApi } from '../../products/product-api';
import { SerializedUnitApi } from '../serialized-unit-api';
import { SerializedUnitList } from './serialized-unit-list';

describe('SerializedUnitList', () => {
  const UNIT: SerializedUnit = {
    id: 1,
    product: 3,
    productId: 3,
    productName: 'Tornillo 8mm',
    serial: 'UNI-0001',
    status: 'active',
  };

  it('should request active units and render one row', async () => {
    const api = {
      list: vi.fn().mockReturnValue(of([UNIT])),
    };

    await TestBed.configureTestingModule({
      imports: [SerializedUnitList],
      providers: [
        ConfirmationService,
        { provide: SerializedUnitApi, useValue: api },
        {
          provide: ProductApi,
          useValue: { available: () => of([]) },
        },
        {
          provide: Notification,
          useValue: { success() {}, warn() {}, error() {} },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SerializedUnitList);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;

    expect(api.list).toHaveBeenCalledWith('active');
    expect(element.querySelectorAll('tbody tr').length).toBe(1);
    expect(element.textContent).toContain('Tornillo 8mm');
  });
});
