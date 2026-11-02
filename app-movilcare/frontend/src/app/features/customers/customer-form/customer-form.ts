import {
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import {
  Customer,
  CustomerPayload,
} from '../../../core/models/customer.model';

/** Cuerpo de escritura sin `status`: el alta lo agrega `CustomerList`. */
type CustomerDraft = Omit<CustomerPayload, 'status'>;

@Component({
  selector: 'app-customer-form',
  imports: [
    ButtonModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
  ],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.css',
  host: {
    class: 'block',
  },
})
export class CustomerForm {
  readonly customer = input<Customer | null>(null);
  readonly resetKey = input(0);
  readonly saving = input(false);

  readonly saved = output<CustomerDraft>();
  readonly cancelled = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(150),
      ],
    ],
    documentType: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(30),
      ],
    ],
    documentNumber: [
      '',
      [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(11),
      ],
    ],
    phone: [
      '',
      [
        Validators.pattern(/^[0-9+()\s-]{7,30}$/),
      ],
    ],
    email: [
      '',
      [
        Validators.email,
        Validators.maxLength(150),
      ],
    ],
  });

  constructor() {
    effect(() => {
      const current = this.customer();

      this.resetKey();

      this.form.reset({
        name: current?.name ?? '',
        documentType: current?.documentType ?? '',
        documentNumber: current?.documentNumber ?? '',
        phone: current?.phone ?? '',
        email: current?.email ?? '',
      });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.saved.emit({
      name: value.name.trim(),
      documentType: value.documentType.trim(),
      documentNumber: value.documentNumber.trim(),
      phone: value.phone.trim() || null,
      email: value.email.trim() || null,
    });
  }
}
