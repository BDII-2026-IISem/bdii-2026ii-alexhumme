import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { Notification } from './notification';

describe('Notification', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        Notification,
        MessageService,
      ],
    });
  });

  it('should be created', () => {
    const service = TestBed.inject(Notification);

    expect(service).toBeTruthy();
  });
});