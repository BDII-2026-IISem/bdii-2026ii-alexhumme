import { Component, computed, effect, inject, input, output } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';

import { Customer } from '../../../core/models/customer.model';
import { SaleCreatePayload } from '../../../core/models/sale.model';
import { SerializedUnit } from '../../../core/models/serialized-unit.model';
import { toIsoWithOffset, toLocalInputValue } from '../sale-date';

/**
 * Alta de venta (modelo.md): cliente + fecha + unidades serializadas.
 * Cada unidad elegida es una línea con `quantity` 1; no hay descuentos.
 */
@Component({
  selector: 'app-sale-form',
  imports: [
    ButtonModule,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
    ReactiveFormsModule,
    SelectModule,
  ],
  templateUrl: './sale-form.html',
  styleUrl: './sale-form.css',
  host: {
    class: 'block',
  },
})
export class SaleForm {
  readonly customers = input<Customer[]>([]);
  /** Unidades `active` disponibles para la venta. */
  readonly units = input<SerializedUnit[]>([]);
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  /** Cambiar el `resetKey` limpia el formulario (otra venta). */
  readonly resetKey = input(0);

  readonly saved = output<SaleCreatePayload>();
  readonly cancelled = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    customerId: [null as number | null, [Validators.required]],
    saleDate: [toLocalInputValue(), [Validators.required]],
    unitIds: [[] as number[], [Validators.required]],
  });

  readonly customerOptions = computed(() =>
    this.customers().map((customer) => ({
      value: customer.id,
      label: `${customer.name} · ${customer.documentNumber}`,
    })),
  );

  readonly unitOptions = computed(() =>
    this.units().map((unit) => ({
      value: unit.id,
      label: `${unit.serial} — ${unit.productName}`,
    })),
  );

  constructor() {
    effect(() => {
      this.resetKey();
      this.form.reset({
        customerId: null,
        saleDate: toLocalInputValue(),
        unitIds: [],
      });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { customerId, saleDate, unitIds } = this.form.getRawValue();

    // `required` en el array ya lo cubre, pero el guard evita el non-null.
    if (customerId === null || unitIds.length === 0) {
      return;
    }

    this.saved.emit({
      customerId,
      saleDate: toIsoWithOffset(saleDate),
      items: unitIds.map((serializedUnitId) => ({ serializedUnitId })),
    });
  }
}
