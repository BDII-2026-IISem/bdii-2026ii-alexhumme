import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { Notification } from '../../../core/services/notification';
import { CustomerApi } from '../customer-api';
import { CustomerList } from './customer-list';

describe('CustomerList', () => {
  const CUSTOMER: Customer = {
    id: 1,
    documentType: 'CC',
    documentNumber: '1098765432',
    name: 'Ana Torres',
    phone: '3001234567',
    email: 'ana@movilcare.test',
    status: 'active',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CustomerList],
      providers: [
        ConfirmationService,
        {
          provide: CustomerApi,
          useValue: { list: () => of([CUSTOMER]) },
        },
        {
          provide: Notification,
          useValue: { success() {}, warn() {}, error() {} },
        },
      ],
    });
  });

  it('should render one row per customer', async () => {
    const fixture = TestBed.createComponent(CustomerList);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('tbody tr').length).toBe(1);
    expect(element.textContent).toContain('CC 1098765432');
  });
});

// customer-list.spec.ts: una fila por cliente del servicio simulado
const CUSTOMER: Customer = {
  id: 1,
  documentType: 'CC',
  documentNumber: '1098765432',
  name: 'Ana Torres',
  phone: '3001234567',
  email: 'ana@movilcare.test',
  status: 'active',
};

it('should render one row per customer', async () => {
  await TestBed.configureTestingModule({
    imports: [CustomerList],
    providers: [
      ConfirmationService,
      { provide: CustomerApi, useValue: { list: () => of([CUSTOMER]) } },
      {
        provide: Notification,
        useValue: { success() {}, warn() {}, error() {} },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CustomerList);
  await fixture.whenStable();

  const element = fixture.nativeElement as HTMLElement;

  expect(element.querySelectorAll('tbody tr').length).toBe(1);
  expect(element.textContent).toContain('CC 1098765432');
});