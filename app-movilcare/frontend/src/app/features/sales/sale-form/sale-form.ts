import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';

import { toNumber } from '../../../core/models/api.model';
import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import {
  SaleCreatePayload,
} from '../../../core/models/sale.model';
import { SaleDetailInput } from '../../../core/models/sale-detail.model';
import { toIsoWithOffset, toLocalInputValue } from '../sale-date';

@Component({
  selector: 'app-sale-form',
  imports: [
    ButtonModule,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
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
  readonly products = input<Product[]>([]);
  /** Unidades activas por producto: sustituto del `product.quantity` de la guía. */
  readonly stock = input<Map<number, number>>(new Map());
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  readonly resetKey = input(0);

  readonly saved = output<SaleCreatePayload>();
  readonly cancelled = output<void>();

  readonly customerId = signal<number | null>(null);
  readonly saleDate = signal(toLocalInputValue());
  readonly discounts = signal(0);
  readonly productId = signal<number | null>(null);
  readonly quantity = signal(1);
  readonly lines = signal<SaleDetailInput[]>([]);
  readonly draftError = signal<string | null>(null);

  private readonly productMap = computed(
    () => new Map(this.products().map((product) => [product.id, product])),
  );

  /** Vista previa: precio de catálogo por cantidad, sin impuestos (tax = 0). */
  readonly subtotal = computed(() =>
    this.lines().reduce(
      (sum, line) =>
        sum +
        toNumber(this.productMap().get(line.productId)?.price ?? 0) *
          line.quantity,
      0,
    ),
  );

  /** El descuento se resta solo para la vista previa: el total real lo calcula el servidor. */
  readonly totalPreview = computed(
    () => this.subtotal() - (this.discounts() || 0),
  );

  lineSubtotal(line: SaleDetailInput): number {
    return (
      toNumber(this.productMap().get(line.productId)?.price ?? 0) *
      line.quantity
    );
  }

  productPrice(productId: number): string {
    return this.productMap().get(productId)?.price ?? '0.00';
  }

  productName(productId: number): string {
    return this.productMap().get(productId)?.name ?? `Producto #${productId}`;
  }

  constructor() {
    effect(() => {
      this.resetKey();

      this.customerId.set(null);
      this.saleDate.set(toLocalInputValue());
      this.discounts.set(0);
      this.productId.set(null);
      this.quantity.set(1);
      this.lines.set([]);
      this.draftError.set(null);
    });
  }

  addLine(): void {
    const productId = this.productId();
    const quantity = this.quantity();

    if (!productId) {
      this.draftError.set('Selecciona un producto.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      this.draftError.set(
        'La cantidad debe ser un número entero mayor o igual a 1.',
      );
      return;
    }

    if (this.lines().some((line) => line.productId === productId)) {
      this.draftError.set('Ese producto ya está en la venta.');
      return;
    }

    const available = this.stock().get(productId) ?? 0;

    if (quantity > available) {
      this.draftError.set(
        `Solo hay ${available} unidades disponibles de ese producto.`,
      );
      return;
    }

    this.lines.update((lines) => [...lines, { productId, quantity }]);
    this.draftError.set(null);
    this.productId.set(null);
    this.quantity.set(1);
  }

  submit(): void {
    const customerId = this.customerId();

    if (!customerId) {
      this.draftError.set('Selecciona un cliente.');
      return;
    }

    if (!this.saleDate()) {
      this.draftError.set('Selecciona la fecha de la venta.');
      return;
    }

    if (this.lines().length === 0) {
      this.draftError.set('Agrega al menos una línea a la venta.');
      return;
    }

    this.draftError.set(null);

    this.saved.emit({
      customerId,
      saleDate: toIsoWithOffset(this.saleDate()),
      discounts: (this.discounts() || 0).toFixed(2),
      items: this.lines().map(({ productId, quantity }) => ({
        productId,
        quantity,
      })),
    });
  }
}