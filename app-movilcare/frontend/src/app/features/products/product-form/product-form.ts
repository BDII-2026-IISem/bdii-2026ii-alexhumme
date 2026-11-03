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
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';

import {
  Product,
  ProductPayload,
} from '../../../core/models/product.model';

/** Cuerpo de escritura sin `status`: el alta lo agrega `ProductList`. */
type ProductDraft = Omit<ProductPayload, 'status'>;

@Component({
  selector: 'app-product-form',
  imports: [
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    TextareaModule,
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
  host: {
    class: 'block',
  },
})
export class ProductForm {
  readonly product = input<Product | null>(null);
  readonly resetKey = input(0);
  readonly saving = input(false);

  readonly saved = output<ProductDraft>();
  readonly cancelled = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    sku: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
      ],
    ],
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ],
    ],
    description: [
      '',
      [Validators.maxLength(255)],
    ],
    price: [
      0,
      [Validators.required, Validators.min(0.01)],
    ],
  });

  constructor() {
    effect(() => {
      const current = this.product();

      this.resetKey();

      this.form.reset({
        sku: current?.sku ?? '',
        name: current?.name ?? '',
        description: current?.description ?? '',
        price: Number(current?.price ?? 0),
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
      sku: value.sku.trim(),
      name: value.name.trim(),
      description: value.description.trim() || null,
      price: value.price.toFixed(2),
    });
  }
}
