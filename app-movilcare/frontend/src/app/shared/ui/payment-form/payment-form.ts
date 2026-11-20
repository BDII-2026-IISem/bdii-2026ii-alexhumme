import { Component, effect, inject, input, output } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';

import {
  PaymentMethod,
  PaymentPayload,
  PaymentReferenceType,
} from '../../../core/models/payment.model';
import { todayLocalDate } from '../../../features/sales/sale-date';

/** Etiquetas de los métodos de pago del backend (`PaymentMethod`). */
export const PAYMENT_METHOD_OPTIONS: Array<{
  label: string;
  value: PaymentMethod;
}> = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Tarjeta', value: 'card' },
  { label: 'Transferencia', value: 'transfer' },
  { label: 'Pago móvil', value: 'mobile' },
];

/**
 * Formulario de alta de un pago; la referencia (venta u orden) la pone el
 * contenedor. Se comparte entre la vista de ventas y la de órdenes.
 */
@Component({
  selector: 'app-payment-form',
  imports: [
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    SelectModule,
  ],
  templateUrl: './payment-form.html',
  styleUrl: './payment-form.css',
  host: { class: 'block' },
})
export class PaymentForm {
  readonly referenceType = input.required<PaymentReferenceType>();
  readonly referenceId = input.required<number>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  /** Cambiar el `resetKey` limpia el formulario (alta de otro pago). */
  readonly resetKey = input(0);

  readonly saved = output<PaymentPayload>();
  readonly cancelled = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  readonly methodOptions = PAYMENT_METHOD_OPTIONS;

  readonly form = this.fb.group({
    method: ['cash' as PaymentMethod, [Validators.required]],
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    paymentDate: [todayLocalDate(), [Validators.required]],
  });

  constructor() {
    effect(() => {
      this.resetKey();
      this.form.reset({
        method: 'cash',
        amount: null,
        paymentDate: todayLocalDate(),
      });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { method, amount, paymentDate } = this.form.getRawValue();

    if (amount === null) {
      return;
    }

    this.saved.emit({
      referenceType: this.referenceType(),
      referenceId: this.referenceId(),
      method,
      // Money es string con dos decimales: el backend acepta `0.01` mínimo.
      amount: amount.toFixed(2),
      paymentDate,
      status: 'active',
    });
  }
}
