import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { Product } from '../../../core/models/product.model';
import {
  SerializedUnit,
  SerializedUnitPayload,
} from '../../../core/models/serialized-unit.model';
import { ProductApi } from '../../products/product-api';

/** Cuerpo de escritura sin `status`: el alta lo agrega `SerializedUnitList`. */
type SerializedUnitDraft = Omit<SerializedUnitPayload, 'status'>;

@Component({
  selector: 'app-serialized-unit-form',
  imports: [
    ButtonModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './serialized-unit-form.html',
  styleUrl: './serialized-unit-form.css',
  host: {
    class: 'block',
  },
})
export class SerializedUnitForm {
  readonly unit = input<SerializedUnit | null>(null);
  readonly resetKey = input(0);
  readonly saving = input(false);

  readonly saved = output<SerializedUnitDraft>();
  readonly cancelled = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productApi = inject(ProductApi);

  readonly products = signal<Product[]>([]);

  /** Solo se avisa de la falta de productos si la petición terminó bien. */
  readonly productsLoaded = signal(false);

  readonly form = this.fb.group({
    product: this.fb.control<number | null>(null, {
      validators: [Validators.required],
    }),
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(150),
      ],
    ],
    description: [
      '',
      [Validators.maxLength(255)],
    ],
  });

  /**
   * Productos activos para el selector. Si la unidad en edición apunta a un
   * producto que ya no está activo, se añade a la lista para que el `p-select`
   * pueda mostrar su nombre en lugar de quedarse en blanco.
   */
  readonly productOptions = computed(() => {
    const options = this.products().map((product) => ({
      id: product.id,
      name: product.name,
    }));

    const current = this.unit();

    if (
      current &&
      !options.some((option) => option.id === current.product)
    ) {
      options.push({
        id: current.product,
        name: `${current.productName} (producto inactivo)`,
      });
    }

    return options;
  });

  constructor() {
    this.productApi.available().subscribe({
      next: (products) => {
        this.products.set(products);
        this.productsLoaded.set(true);
      },
      error: () => this.products.set([]),
    });

    effect(() => {
      const current = this.unit();

      this.resetKey();

      this.form.reset({
        product: current?.product ?? null,
        name: current?.name ?? '',
        description: current?.description ?? '',
      });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { product, name, description } = this.form.getRawValue();

    if (product === null) {
      return;
    }

    this.saved.emit({
      product,
      name: name.trim(),
      description: description.trim() || null,
    });
  }
}