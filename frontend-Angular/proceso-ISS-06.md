# ISS-06. Ventas y detalle en memoria

> **Nota de uso.** Este archivo es un borrador independiente de `proceso.md` para que la unidad del ISS-06 se pueda redactar mientras se desarrolla el ISS-05. Cuando el ISS-05 esté terminado, copia **todo** el contenido de este archivo y pégalo al final de `frontend-Angular/proceso.md` (justo después de la sección «Verificación del ISS» del ISS-05), desarrolla la unidad siguiendo los pasos en orden y, una vez pegado, borra este archivo para que no quede duplicado.
>
> **Evidencias:** las capturas de este ISS se numeran a partir de `image-105.png`, porque la serie `image-95` · `image-104` corresponde al ISS-05.

## Objetivo

Listar las ventas y registrar una nueva desde un borrador en memoria. El borrador rechaza producto repetido, cantidad inválida y cantidad por encima de las unidades disponibles. Un `400` del `POST` se queda en el diálogo. La anulación no se hace aquí: el número de la venta enlaza a `/ventas/:id`, que construye el ISS-07.

> **Encaje en las dos fases.** Este ISS es **Fase I · Business**: sin login y sin interceptor. El backend calcula impuesto, precios y totales al responder `201`.

## Nota de adaptación - el contrato: de `client` a `customer` y de líneas a ítems (diferencia con la guía)

La guía describe una venta con `client`, `clientName`, `clientId` y un `SaleCreatePayload` con `items`. En MovilCare el modelo `Sale` y sus serializers ya existen (`core/models/sale.model.ts` y `backend/apps/sale/`), pero con el nombre de la entidad **cliente** y con una diferencia importante en la escritura. Además, MovilCare **no tiene columna de stock**: el propio docstring de `Sale.void()` lo dice («MovilCare no tiene columna de stock, así que la anulación no repone cantidad alguna»).

| Guía (frontend2026 Django) | MovilCare (real) | Tratamiento en este ISS |
| --- | --- | --- |
| `client` (número) y `clientName` (texto) | `customer_id` / `customer_name` del serializer → `customerId` y `customerName` en camelCase | Se usan los campos **ya existentes** de `Sale`; el texto en pantalla dice «Cliente» |
| `SaleCreatePayload.lines: { productId, quantity }[]` | `SaleRegisterSerializer` exige **`items`** (`items = SaleItemSerializer(many=True)`); no existe `/product-sales/` | **Cambio de modelo:** en `sale.model.ts` la propiedad `lines` de `SaleCreatePayload` se renombra a `items` |
| `SaleLine` con `product` y `productName` | `SaleDetail` del frontend solo trae `productId`; el backend sí devuelve `product_name` | **Cambio de modelo:** se agrega `productName: string` a `SaleDetail` (solo lectura) |
| `product.quantity` = stock conocido | `Product` no tiene cantidad (la migración `product/0002` eliminó `stock`); el stock real son las **unidades activas** de `serialized_units` | El stock se calcula en el frontend con `SerializedUnitApi.list('active')` y se pasa al formulario. **Regla solo frontend:** el backend `Sale.objects.register` valida producto activo y cantidad ≥ 1, pero **no** valida cantidad contra stock ni descuenta nada |
| «El servidor calcula impuesto, precios, totales y **descuenta el stock**» | El servidor calcula `subtotal`, `tax = 0.00`, `discounts`, `total` y crea las líneas, pero **no toca existencias** (no existen) | **AC-06-05 adaptada:** el `201` recarga la lista y la venta aparece con los totales del servidor; el contador de unidades disponibles **no cambia** tras el alta |
| `GET /api/clients/?status=active` | `GET /api/customers/?status=active` (`CustomerViewSet` filtra `?status=`) | **Cambio de API:** `CustomerApi.list()` gana el parámetro opcional `status` (mismo patrón que `ProductApi.list` en el ISS-05); `customer-list` sigue funcionando sin argumentos |
| `forkJoin` con **tres** `GET` (ventas, clientes, productos) | Hacen falta **cuatro**: las unidades activas sostienen el control de stock y la etiqueta de disponibles | `forkJoin({ sales, customers, products, units })` en `SaleList` |
| `sale-date.ts` con `toIsoWithOffset` | No existe en `core/utils/` | Se crea `src/app/features/sales/sale-date.ts` (sección 06.2) |
| Seeded de 30 ventas («filas del seeder») | **No hay seeder de ventas** en MovilCare (solo `seed_rbac` para permisos) | El primer paso de la prueba muestra el estado vacío o las ventas creadas por ti en las pruebas |
| Ruta `/ventas/:id` inexistente y comodín → `/construir` | En MovilCare el comodín `**` redirige a `/clientes` | Se agrega `ventas/:id` → `provisional` en este ISS para que el enlace no salte a clientes; el ISS-07 lo reemplaza por `SaleDetail` |
| Ítem de menú ya en `Shell.items` | Ítem ya en `menuItems` de `Shell` (`pi pi-shopping-cart`, `/ventas`) | No se toca `shell.ts`; `<p-toast />` y `<p-confirm-dialog />` ya están montados desde el ISS-03 |
| Recurso `GET /api/sales/{id}/` disponible | En el estado consolidado sí existe (`SaleReadViewSet`), pero el commit histórico de la opción B no lo tiene | No se necesita en este ISS; la lectura del detalle llega con el ISS-07 |

## Nota de adaptación - autenticación y permisos (diferencia con la guía)

La guía asume el backend de Django en su estado de **ISS-09/ISS-10** (catálogo abierto) y avisa de que contra un backend consolidado se verá `401`. En MovilCare el backend está consolidado: las vistas de ventas, clientes y catálogo exigen `[IsAuthenticated, HasResourceAccess]` (`apps/sale/views.py`, `apps/customer/views.py`, `apps/product/views.py`), y la configuración de DRF declara `IsAuthenticated` como permiso por defecto (`config/settings/__init__.py`). El frontend todavía no tiene login, interceptor ni guards, así que hoy cada petición responde `401`.

Endpoints que necesita este ISS y su permiso real:

| Método | Ruta | Vista | Autenticación |
| --- | --- | --- | --- |
| GET | `/api/sales/` | `SaleCollectionAPIView.get` → reutiliza `SaleReadViewSet.list` | `IsAuthenticated + HasResourceAccess` |
| POST | `/api/sales/` | `SaleCollectionAPIView.post` → `SaleRegisterAPIView` | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/sales/:id/` | `SaleReadViewSet.retrieve` (se usa en ISS-07) | `IsAuthenticated + HasResourceAccess` |
| DELETE | `/api/sales/:id/` | `SaleReadViewSet.destroy` → `Sale.void()` (anulación, ISS-07) | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/customers/?status=active` | `CustomerViewSet` (filtra `?status=`) | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/products/available/` | `AvailableProductListAPIView` | `AllowAny` (solo productos `active`) |
| GET | `/api/serialized-units/?status=active` | `SerializedUnitViewSet` (`CatalogViewSet`) | `IsAuthenticated + HasResourceAccess` |

Para verificar el CRUD completo durante este ISS, elige una de estas opciones (las tres son válidas):

- **Opción A (recomendada):** cambio **temporal y local** de `permission_classes` a `[AllowAny]` en **cinco clases de tres archivos** (importa `AllowAny` donde falte):

  | Archivo | Clases |
  | --- | --- |
  | `backend/apps/sale/views.py` | `SaleRegisterAPIView`, `SaleReadViewSet`, `SaleCollectionAPIView` |
  | `backend/apps/customer/views.py` | `CustomerViewSet` |
  | `backend/apps/product/views.py` | `CatalogViewSet` (el import ya existe desde el ISS-05) |

  Después de tomar las evidencias, restauro todo de una vez:

  ```bash
  git restore app-movilcare/backend/apps/sale/views.py app-movilcare/backend/apps/customer/views.py app-movilcare/backend/apps/product/views.py
  ```

  **Este cambio no se commitea.**
- **Opción B (válida aquí, a diferencia del ISS-05):** ejecutar el backend en el commit `722e18d` («ISS 11»), donde `SaleCollectionAPIView`, `SaleRegisterAPIView`, `CustomerViewSet` y `CatalogViewSet` **ya tenían `permission_classes = [AllowAny]`** y las migraciones `product/0001` y `product/0002` ya existen, así que la BD actual sirve. Uso un worktree temporal (`git worktree add <ruta> 722e18d`) copiando el `.env` del backend. **Dos advertencias:** en ese commit aún no existe `GET /api/products/available/` (usa `ProductApi.list('active')`, que con `CatalogViewSet` abierto y el filtro `?status=` devuelve lo mismo) y tampoco existe `GET /api/sales/:id/` (no hace falta hasta el ISS-07).
- **Opción C:** no modificar el backend y capturar el `401` que muestra `toApiMessage` («La sesión no es válida. Inicia sesión nuevamente.») como comportamiento esperado de esta fase.

`ng test` y `ng build` no dependen del backend y se ejecutan igual en las tres opciones. Las capturas de las secciones siguientes que requieren datos del backend asumen la opción **A** (o **B**).

## 06.1. Dos formas del mismo recurso

**Generar los componentes.**

```bash
cd app-movilcare/frontend
ng generate component features/sales/sale-list --skip-tests --defaults
ng generate component features/sales/sale-form --skip-tests --defaults
```

Los componentes se crean *standalone*, con los CSS **sin reglas** (solo el selector), igual que en los ISS-03 a ISS-05. El archivo `sale-date.ts` no lo genera el CLI: se crea a mano en la sección 06.2. Los `*.spec.ts` se crean manualmente en la sección 06.5.

**Lectura (`GET /api/sales/` y `GET /api/sales/{id}/`).** El `SaleSerializer` del backend expone `customer_id`, `customer_name`, `sale_date`, `subtotal`, `tax`, `discounts`, `total`, `status` y `lines[]` (con `product_id`, `product_name`, `quantity`, `unit_price`, `line_total`); el parser camelCase los entrega como `customerId`, `customerName`, `saleDate`… Ya coincide con `core/models/sale.model.ts`, salvo un detalle: `SaleDetail` no declara `productName`.

**Escritura (`POST /api/sales/`).** `SaleRegisterSerializer` recibe `customer_id`, `sale_date`, `discounts` (opcional, por defecto `0.00`) e `items: [{ product_id, quantity }]`. El parser camelCase traduce `customerId` y `productId`. El frontend tenía `SaleCreatePayload.lines`, que **no** existe en el backend: un `POST` con `lines` responde `400`.

**Cambio 1 - `core/models/sale.model.ts`**

```ts
// antes
export interface SaleCreatePayload {
  customerId: number;
  saleDate: string;
  discounts: Money;
  lines: SaleDetailInput[];
}

// después
export interface SaleCreatePayload {
  customerId: number;
  saleDate: string;
  discounts: Money;
  items: SaleDetailInput[];
}
```

`Sale` (interfaz de lectura) **no cambia**: `customerId`, `customerName`, `saleDate`, `subtotal`, `tax`, `discounts`, `total`, `status` y `lines` ya son los campos que devuelve el serializer.

**Cambio 2 - `core/models/sale-detail.model.ts`**

```ts
// antes
export interface SaleDetail {
  productId: number;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

// después
export interface SaleDetail {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}
```

`SaleDetailInput` (`{ productId, quantity }`) **no cambia**: es el elemento de `items`.

**Cambio 3 - `features/customers/customer-api.ts`**

Mismo patrón que `ProductApi.list` del ISS-05. Agrega el import:

```ts
import { Status } from '../../core/models/api.model';
```

y reemplaza la firma:

```ts
// antes
list(): Observable<Customer[]> {
  return this.http.get<Customer[]>(`${this.base}/`);
}

// después
list(status?: Status): Observable<Customer[]> {
  return this.http.get<Customer[]>(`${this.base}/`, {
    params: status ? { status } : {},
  });
}
```

`CustomerApi.get` no existe (el detalle de cliente no lo usa nadie); `create`, `update` y `remove` **no se modifican**. `features/sales/sale-api.ts` **tampoco se modifica**: `list()`, `get()`, `create(payload: SaleCreatePayload)` y `voidSale()` ya están; con el cambio 1, `create` ya envía `items`.

### Evidencia

- Captura de los dos componentes generados en `src/app/features/sales/`.
- Captura del `POST /api/sales/` con el cuerpo `items` (o del `401` con la opción C).

## 06.2. Fecha con zona

Archivo nuevo: `src/app/features/sales/sale-date.ts`. La venta se registra con `sale_date = DateTimeField()` del backend, y el formato que acepta —y el que espera el parser camelCase— es ISO con la zona horaria del navegador (`±HH:mm`), **no** la `Z` de UTC que emite `date.toISOString()`.

```ts
function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Valor inicial para <input type="datetime-local">:
 * `YYYY-MM-DDTHH:mm` en la hora local del navegador.
 */
export function toLocalInputValue(date: Date = new Date()): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Convierte el valor del input (`YYYY-MM-DDTHH:mm`, interpretado como hora
 * local) a `YYYY-MM-DDTHH:mm:ss±HH:mm` con el desfase de `getTimezoneOffset()`.
 * No usar `toISOString()`: esa cadena termina en `Z` y no es la zona local.
 */
export function toIsoWithOffset(value: string): string {
  const date = new Date(value);

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
  );
}
```

**Notas:**

- `new Date('2026-11-02T15:30')` (cadena sin zona) se interpreta como **hora local** en JavaScript, por lo que `toIsoWithOffset` conserva la hora elegida por el usuario y solo le agrega el desfase.
- El desfase de `getTimezoneOffset()` está invertido (minutos al este): por eso se usa `-date.getTimezoneOffset()` y el signo `+` cuando el resultado es positivo.
- Un ejemplo de salida para el laboratorio (UTC-5): `2026-11-02T15:30:00-05:00`.

### Evidencia

- Captura de la función y de un `POST` cuyo `saleDate` termina en `-05:00` (o en la zona de tu máquina) y **no** en `Z`.

## 06.3. Borrador: `sale-form`

El formulario **no usa `ReactiveFormsModule`**: cliente, fecha, descuento, producto, cantidad y líneas son *signals*. Los datos (clientes activos, productos disponibles y el mapa de unidades) llegan como `input()` desde la lista, que es quien hace los `GET`.

**Componente `sale-form.ts`**

```ts
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
```

**Puntos clave:**

- `addLine()` exige producto seleccionado, cantidad entera `>= 1`, que el producto **no** esté ya en `lines` (mensaje «ya está en la venta») y que la cantidad **no supere las unidades activas** conocidas (`stock`). Esta última regla es solo del frontend: el backend no tiene stock que validar.
- `discounts` se emite con `toFixed(2)` (tipo `Money = string`), igual que en la guía; el backend lo recibe como `DecimalField` opcional.
- `items` se deriva de `lines` mapeando `{ productId, quantity }`: la interfaz de lectura (`lines` de `Sale`) y la de escritura (`items`) **no comparten campos**, como avisa la guía.
- `error` es una `input()` que la lista llena con `toApiMessage` cuando el `POST` falla: el mensaje **permanece en el diálogo**.

**Plantilla `sale-form.html`**

```html
<form (ngSubmit)="submit()" class="grid gap-4">
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="flex flex-col gap-2">
      <label for="sale-customer">
        Cliente <span class="text-red-500">*</span>
      </label>

      <p-select
        inputId="sale-customer"
        ariaLabel="Cliente"
        [options]="customers()"
        optionLabel="name"
        optionValue="id"
        placeholder="Selecciona un cliente"
        [filter]="true"
        class="w-full"
        [ngModel]="customerId()"
        (ngModelChange)="customerId.set($event)"
        [ngModelOptions]="{ standalone: true }"
      />
    </div>

    <div class="flex flex-col gap-2">
      <label for="sale-date">
        Fecha <span class="text-red-500">*</span>
      </label>

      <input
        id="sale-date"
        type="datetime-local"
        class="w-full"
        [value]="saleDate()"
        (input)="saleDate.set($any($event.target).value)"
      />
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <label for="sale-discounts">Descuento</label>

    <p-inputnumber
      inputId="sale-discounts"
      mode="decimal"
      [maxFractionDigits]="2"
      [min]="0"
      placeholder="0.00"
      [ngModel]="discounts()"
      (ngModelChange)="discounts.set($event)"
      [ngModelOptions]="{ standalone: true }"
    />
  </div>

  <div
    class="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto_auto]"
  >
    <div class="flex flex-col gap-2">
      <label for="sale-product">
        Producto <span class="text-red-500">*</span>
      </label>

      <p-select
        inputId="sale-product"
        ariaLabel="Producto"
        [options]="products()"
        optionLabel="name"
        optionValue="id"
        placeholder="Selecciona un producto disponible"
        [filter]="true"
        class="w-full"
        [ngModel]="productId()"
        (ngModelChange)="productId.set($event)"
        [ngModelOptions]="{ standalone: true }"
      />
    </div>

    <div class="flex flex-col gap-2">
      <label for="sale-quantity">Cantidad</label>

      <p-inputnumber
        inputId="sale-quantity"
        [min]="1"
        [showButtons]="true"
        [ngModel]="quantity()"
        (ngModelChange)="quantity.set($event)"
        [ngModelOptions]="{ standalone: true }"
      />
    </div>

    <div class="flex flex-col justify-end">
      <button
        pButton
        type="button"
        severity="secondary"
        outlined
        (click)="addLine()"
      >
        <i pButtonIcon class="pi pi-plus"></i>
        <span pButtonLabel>Agregar línea</span>
      </button>
    </div>
  </div>

  @if (draftError()) {
    <p-message severity="error" size="small" variant="simple">
      {{ draftError() }}
    </p-message>
  }

  @if (error()) {
    <p-message severity="error" variant="simple">
      {{ error() }}
    </p-message>
  }

  @if (lines().length > 0) {
    <table class="w-full text-left text-sm">
      <thead>
        <tr class="border-b border-slate-200 text-slate-500">
          <th class="py-2">Producto</th>
          <th class="py-2 text-right">Cantidad</th>
          <th class="py-2 text-right">Precio</th>
          <th class="py-2 text-right">Total</th>
        </tr>
      </thead>

      <tbody>
        @for (line of lines(); track line.productId) {
          <tr class="border-b border-slate-100">
            <td class="py-2">{{ productName(line.productId) }}</td>
            <td class="py-2 text-right">{{ line.quantity }}</td>
            <td class="py-2 text-right">
              {{ productPrice(line.productId) }}
            </td>
            <td class="py-2 text-right">{{ lineSubtotal(line) }}</td>
          </tr>
        }
      </tbody>
    </table>

    <dl
      class="flex flex-col gap-1 text-sm sm:items-end"
    >
      <div class="flex gap-4">
        <dt class="text-slate-500">Subtotal</dt>
        <dd class="font-medium">{{ subtotal() }}</dd>
      </div>

      <div class="flex gap-4">
        <dt class="text-slate-500">Total (con descuento)</dt>
        <dd class="font-medium">{{ totalPreview() }}</dd>
      </div>
    </dl>
  }

  <div
    class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"
  >
    <button
      pButton
      type="button"
      severity="secondary"
      outlined
      (click)="cancelled.emit()"
    >
      <span pButtonLabel>Cancelar</span>
    </button>

    <button
      pButton
      type="submit"
      [loading]="saving()"
      [disabled]="saving()"
    >
      <i pButtonIcon class="pi pi-check"></i>
      <span pButtonLabel>Registrar venta</span>
    </button>
  </div>
</form>
```

> **Nota de plantilla:** el total de la tabla es una **vista previa** calculada con el precio de catálogo (`productPrice`, `lineSubtotal`, `subtotal`, `totalPreview`); el total de la lista es el que devolvió el servidor. Con `tax = 0.00` (regla actual del backend), el total previsto es `subtotal - discounts`.

### Evidencia

- Captura del borrador vacío (cliente, fecha y descuento).
- Captura de la línea agregada con el aviso «ya está en la venta» al repetir el producto.

## 06.4. Lista: `sale-list` y ruta

**Componente `sale-list.ts`**

```ts
import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import {
  Sale,
  SaleCreatePayload,
} from '../../../core/models/sale.model';

import { Notification } from '../../../core/services/notification';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { CustomerApi } from '../../customers/customer-api';
import { ProductApi } from '../../products/product-api';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { SaleApi } from '../sale-api';
import { SaleForm } from '../sale-form/sale-form';

@Component({
  selector: 'app-sale-list',
  imports: [
    ButtonModule,
    DatePipe,
    DialogModule,
    EmptyState,
    MessageModule,
    PageHeader,
    RouterLink,
    StatusTag,
    TableModule,
    TagModule,
    SaleForm,
  ],
  templateUrl: './sale-list.html',
  styleUrl: './sale-list.css',
  host: {
    class: 'block',
  },
})
export class SaleList {
  private readonly api = inject(SaleApi);
  private readonly customersApi = inject(CustomerApi);
  private readonly productsApi = inject(ProductApi);
  private readonly unitsApi = inject(SerializedUnitApi);
  private readonly notify = inject(Notification);

  readonly sales = signal<Sale[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly products = signal<Product[]>([]);
  readonly stock = signal<Map<number, number>>(new Map());

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  /** Error del `POST`: vive en el diálogo, no en la lista. */
  readonly saleError = signal<string | null>(null);

  readonly dialogVisible = signal(false);
  readonly resetKey = signal(0);

  private readonly customerMap = computed(
    () => new Map(this.customers().map((c) => [c.id, c.name])),
  );

  /** Unidades activas de los productos disponibles: la etiqueta del encabezado. */
  readonly availableUnits = computed(() => {
    const available = new Set(this.products().map((product) => product.id));
    let total = 0;

    for (const [productId, quantity] of this.stock()) {
      if (available.has(productId)) {
        total += quantity;
      }
    }

    return total;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      sales: this.api.list(),
      customers: this.customersApi.list('active'),
      products: this.productsApi.available(),
      units: this.unitsApi.list('active'),
    }).subscribe({
      next: ({ sales, customers, products, units }) => {
        const stock = new Map<number, number>();

        for (const unit of units) {
          stock.set(
            unit.productId,
            (stock.get(unit.productId) ?? 0) + 1,
          );
        }

        this.sales.set(sales);
        this.customers.set(customers);
        this.products.set(products);
        this.stock.set(stock);
        this.loading.set(false);
      },
      error: (error) => {
        this.sales.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  /** Nombre visible: el que trae la venta, luego el mapa, por último el id. */
  customerName(sale: Sale): string {
    return (
      sale.customerName ||
      this.customerMap().get(sale.customerId) ||
      `Cliente #${sale.customerId}`
    );
  }

  openCreate(): void {
    this.resetKey.update((key) => key + 1);
    this.saleError.set(null);
    this.dialogVisible.set(true);
  }

  save(payload: SaleCreatePayload): void {
    this.saving.set(true);
    this.saleError.set(null);

    this.api.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.notify.success('Venta registrada');
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.saleError.set(toApiMessage(error));
      },
    });
  }
}
```

**Puntos clave:**

- **Cuatro `GET` en un solo `forkJoin`:** ventas, clientes `active`, productos `available` y unidades `active`. Si alguno falla, la pantalla muestra el mensaje de `toApiMessage` en el `p-message` de la lista.
- `save()` hace el `POST`; si responde, cierra el diálogo, avisa y **recarga los cuatro `GET`** (el stock de unidades y la lista de disponibles vuelven a leerse del servidor). Si falla, `saleError` queda **dentro del diálogo** y el borrador se conserva.
- `customerName(sale)` replica la lógica de la guía con los nombres de MovilCare: primero `sale.customerName` (lo trae el serializer), luego el mapa de clientes activos y, si falta, `Cliente #id`.
- No hay búsqueda ni anulación en este ISS: la columna del número es un enlace y la baja (`DELETE`) llega con el ISS-07.

**Plantilla `sale-list.html`**

```html
<div class="space-y-6">
  <app-page-header
    title="Ventas"
    subtitle="Consulta las ventas y registra una nueva."
  >
    <p-tag
      [value]="sales().length + ' registros'"
      severity="info"
      [rounded]="true"
    />

    <p-tag
      [value]="availableUnits() + ' unidades disponibles'"
      severity="success"
      [rounded]="true"
    />

    <button
      pButton
      type="button"
      (click)="openCreate()"
    >
      <i pButtonIcon class="pi pi-plus"></i>
      <span pButtonLabel>Nueva venta</span>
    </button>
  </app-page-header>

  @if (error()) {
    <p-message
      severity="error"
      styleClass="mb-4 w-full"
    >
      {{ error() }}
    </p-message>
  }

  <p-table
    [value]="sales()"
    [loading]="loading()"
    dataKey="id"
    [paginator]="sales().length > 10"
    [rows]="10"
    [rowHover]="true"
  >
    <ng-template #header>
      <tr>
        <th>Número</th>
        <th>Cliente</th>
        <th>Fecha</th>
        <th>Total</th>
        <th>Estado</th>
      </tr>
    </ng-template>

    <ng-template #body let-sale>
      <tr>
        <td>
          <a
            [routerLink]="['/ventas', sale.id]"
            class="font-medium text-blue-600 hover:underline"
          >
            #{{ sale.id }}
          </a>
        </td>
        <td>{{ customerName(sale) }}</td>
        <td>{{ sale.saleDate | date: 'dd/MM/yyyy HH:mm' }}</td>
        <td>{{ sale.total }}</td>

        <td>
          <app-status-tag [status]="sale.status" />
        </td>
      </tr>
    </ng-template>

    <ng-template #emptymessage>
      <tr>
        <td colspan="5">
          <app-empty-state
            icon="pi pi-shopping-cart"
            title="Sin ventas registradas"
            message="Registra la primera venta con el botón «Nueva venta»."
          />
        </td>
      </tr>
    </ng-template>
  </p-table>

  <p-dialog
    [visible]="dialogVisible()"
    (visibleChange)="dialogVisible.set($event)"
    header="Nueva venta"
    [modal]="true"
    [draggable]="false"
    [resizable]="false"
    styleClass="w-full max-w-3xl mx-4"
  >
    <app-sale-form
      [customers]="customers()"
      [products]="products()"
      [stock]="stock()"
      [saving]="saving()"
      [error]="saleError()"
      [resetKey]="resetKey()"
      (saved)="save($event)"
      (cancelled)="dialogVisible.set(false)"
    />
  </p-dialog>
</div>
```

**Configurar la ruta**

En `src/app/app.routes.ts` se reemplaza el `loadComponent` provisional de `/ventas` y se agrega la ruta del detalle (aún placeholder):

```ts
// antes
{
  path: 'ventas',
  title: 'Ventas · MovilCare',
  loadComponent: provisional,
},

// después
{
  path: 'ventas',
  title: 'Ventas · MovilCare',
  loadComponent: () =>
    import('./features/sales/sale-list/sale-list')
      .then((m) => m.SaleList),
},
{
  path: 'ventas/:id',
  title: 'Venta · MovilCare',
  loadComponent: provisional,
},
```

**Notas:**

- La constante `provisional` **se conserva**: ahora solo la usa `ventas/:id` (el ISS-05 la deja de usar en `/productos`). En MovilCare el comodín `**` redirige a `/clientes`, así que sin esta ruta el enlace `#61` rebotaría a la lista de clientes; con ella muestra el placeholder hasta el ISS-07, igual que la intención de la guía con `/construir`.
- El ítem de menú **Ventas** (`pi pi-shopping-cart`, `/ventas`) ya existe en `shell.ts`; **no se toca el layout**.

### Evidencia

- Captura de la lista con las columnas Número, Cliente, Fecha, Total y Estado, más la etiqueta de unidades disponibles.
- Captura del enlace `#id` apuntando a `/ventas/{id}`.
- Captura de la configuración de `app.routes.ts`.

## 06.5. Pruebas

Preparo las pruebas para comprobar el borrador y la lista. Como los componentes se generaron con `--skip-tests`, creo manualmente los archivos `*.spec.ts` junto a cada pieza:

- `src/app/features/sales/sale-form/sale-form.spec.ts`
- `src/app/features/sales/sale-list/sale-list.spec.ts`

Las pruebas se centraron en dos aspectos:

1. Verificar que `SaleForm` **no** agregue la línea duplicada (mensaje «ya está en la venta») y que `submit()` emita `customerId`, `saleDate` con `toIsoWithOffset`, `discounts` con dos decimales e `items`.
2. Verificar que `SaleList` haga los cuatro `GET` iniciales (clientes con `status=active`, `/products/available/`, unidades con `status=active` y ventas), que el `POST` lleve ese cuerpo y que la recarga deje la venta nueva en `sales()`.

```typescript
// sale-form.spec.ts: la línea duplicada no crece y submit() emite `items`
const CUSTOMER: Customer = {
  id: 1,
  documentType: 'CC',
  documentNumber: '1098765432',
  name: 'Ana Torres',
  phone: '3001234567',
  email: 'ana@movilcare.test',
  status: 'active',
};

const PRODUCT: Product = {
  id: 5,
  sku: 'SKU-005',
  name: 'Laptop Lenovo',
  description: null,
  price: '1099.99',
  status: 'active',
};

async function setup() {
  const fixture = TestBed.createComponent(SaleForm);
  fixture.componentRef.setInput('customers', [CUSTOMER]);
  fixture.componentRef.setInput('products', [PRODUCT]);
  fixture.componentRef.setInput('stock', new Map([[5, 10]]));
  await fixture.whenStable();
  return fixture;
}

it('should keep one line when the product is repeated', async () => {
  const fixture = await setup();

  fixture.componentInstance.productId.set(5);
  fixture.componentInstance.quantity.set(2);
  fixture.componentInstance.addLine();
  fixture.componentInstance.addLine();

  expect(fixture.componentInstance.lines().length).toBe(1);

  const element = fixture.nativeElement as HTMLElement;
  expect(element.textContent).toContain('ya está en la venta');
});

it('should emit customerId, zoned saleDate, discounts and items', async () => {
  const fixture = await setup();

  fixture.componentInstance.customerId.set(1);
  fixture.componentInstance.saleDate.set('2026-11-02T15:30');
  fixture.componentInstance.discounts.set(10);
  fixture.componentInstance.productId.set(5);
  fixture.componentInstance.quantity.set(2);
  fixture.componentInstance.addLine();

  let body: SaleCreatePayload | undefined;
  fixture.componentInstance.saved.subscribe(
    (payload) => (body = payload),
  );
  fixture.componentInstance.submit();

  expect(body).toEqual({
    customerId: 1,
    saleDate: toIsoWithOffset('2026-11-02T15:30'),
    discounts: '10.00',
    items: [{ productId: 5, quantity: 2 }],
  });
});
```

```typescript
// sale-list.spec.ts: los cuatro GET, el POST y la recarga
const SALE: Sale = {
  id: 61,
  customerId: 1,
  customerName: 'Ana Torres',
  saleDate: '2026-11-02T10:00:00-05:00',
  subtotal: '2199.98',
  tax: '0.00',
  discounts: '10.00',
  total: '2189.98',
  status: 'active',
  lines: [],
};

it('should load the four collections and reload after the POST', async () => {
  const salesApi = {
    list: jasmine
      .createSpy('list')
      .and.returnValues(of([]), of([SALE])),
    create: jasmine.createSpy('create').and.returnValue(of(SALE)),
  };
  const customersApi = {
    list: jasmine.createSpy('list').and.returnValue(of([CUSTOMER])),
  };
  const productsApi = {
    available: jasmine.createSpy('available').and.returnValue(of([PRODUCT])),
  };
  const unitsApi = {
    list: jasmine.createSpy('list').and.returnValue(of([])),
  };

  await TestBed.configureTestingModule({
    imports: [SaleList],
    providers: [
      { provide: SaleApi, useValue: salesApi },
      { provide: CustomerApi, useValue: customersApi },
      { provide: ProductApi, useValue: productsApi },
      { provide: SerializedUnitApi, useValue: unitsApi },
      {
        provide: Notification,
        useValue: { success() {}, warn() {}, error() {} },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SaleList);
  await fixture.whenStable();

  expect(salesApi.list).toHaveBeenCalledTimes(1);
  expect(customersApi.list).toHaveBeenCalledWith('active');
  expect(productsApi.available).toHaveBeenCalled();
  expect(unitsApi.list).toHaveBeenCalledWith('active');

  fixture.componentInstance.save({
    customerId: 1,
    saleDate: '2026-11-02T15:30:00-05:00',
    discounts: '10.00',
    items: [{ productId: 5, quantity: 2 }],
  });
  await fixture.whenStable();

  expect(salesApi.create).toHaveBeenCalled();
  expect(salesApi.list).toHaveBeenCalledTimes(2);
  expect(fixture.componentInstance.sales().length).toBe(1);
});
```

Los bloques omiten los imports de cada archivo (el spec de la lista necesita `of` de `rxjs` y los servicios falsos anteriores) y los tipos `Customer`, `Product`, `Sale`, `SaleCreatePayload`, `SaleApi`, `CustomerApi`, `ProductApi`, `SerializedUnitApi`, `Notification` y `toIsoWithOffset`. En el spec del formulario no hace falta ningún proveedor: `SaleForm` no inyecta servicios, solo recibe `input()`s.

Para ejecutar las pruebas, utilizo:

```bash
ng test --watch=false
```

También reviso que las pruebas existentes (`core/services/notification.spec.ts`, `demo/ejemplo/ejemplo.spec.ts` y las de los ISS-03 a ISS-05) continúen funcionando.

### Evidencia

- Captura de la ejecución de las pruebas.
- Captura del resultado de las pruebas del formulario y de la lista.

## Cómo probarlo

Realiza las verificaciones funcionales en el siguiente orden (con el backend en la opción A de la nota de autenticación, salvo que se indique otro caso):

1. Abre `/ventas` desde el menú y comprueba en la pestaña Network que el `forkJoin` dispara **cuatro** `GET`: `/api/sales/`, `/api/customers/?status=active`, `/api/products/available/` y `/api/serialized-units/?status=active`, todos en camelCase y sin envolver. Si aún no hay ventas, se muestra el estado vacío «Sin ventas registradas».
2. Comprueba la etiqueta del encabezado: «N unidades disponibles» es la suma de las unidades activas de los productos disponibles.
3. Pulsa «Nueva venta» y verifica que el selector de clientes ofrece solo clientes activos y el de productos solo productos disponibles.
4. Elige cliente y producto, agrega la línea y vuelve a agregar el **mismo** producto: debe aparecer «Ese producto ya está en la venta.» y seguir habiendo **una** sola línea.
5. Intenta agregar una cantidad `0` o decimal, y luego una cantidad mayor que las unidades disponibles: ambos casos deben rechazarse con su mensaje y no crear línea.
6. Registra la venta y revisa el `POST /api/sales/`: lleva `customerId`, `saleDate` con la zona del navegador (por ejemplo `2026-11-02T15:30:00-05:00`, **sin** `Z`), `discounts` con dos decimales e `items: [{ productId, quantity }]`. La respuesta trae `subtotal`, `tax`, `discounts` y `total` calculados por el servidor y la lista se recarga con los cuatro `GET`.
7. Verifica que la venta nueva aparezca en la tabla con su número enlazando a `/ventas/{id}` (hasta el ISS-07 esa ruta muestra el placeholder).
8. Pon un descuento mayor que el subtotal y registra: el backend responde `400` («El descuento no puede superar el subtotal.»), el diálogo **permanece abierto** mostrando el mensaje con `toApiMessage` y el borrador conserva las líneas.
9. Detén el backend y comprueba que la lista muestra «No se pudo conectar con la API de MovilCare.» y que el diálogo conserva el error del `POST`.
10. Ejecuta `ng test --watch=false` y `ng build`.

## Criterios de aceptación

| Código | Criterio | Resultado |
|---|---|---|
| AC-06-01 | La tabla sale de `GET /api/sales/` y muestra `customerName` (con el mapa de clientes o `Cliente #id` como respaldo), fecha, total y estado. | Pendiente de verificación |
| AC-06-02 | El alta carga clientes `active`, productos `available` y unidades `active` (los cuatro `GET` del `forkJoin`). | Pendiente de verificación |
| AC-06-03 | El borrador rechaza la línea duplicada con el mensaje «ya está en la venta» y no la agrega. | Pendiente de verificación |
| AC-06-04 | El `POST` envía `customerId`, `saleDate` con zona horaria local (sin `Z`), `discounts` con dos decimales e `items[{ productId, quantity }]`. | Pendiente de verificación |
| AC-06-05 | **Adaptada:** el `201` cierra el diálogo, recarga la lista y la venta aparece con los totales calculados por el servidor (MovilCare no descuenta stock, así que el contador de unidades no cambia). | Pendiente de verificación |
| AC-06-06 | El número de la venta enlaza a `/ventas/:id` (placeholder en este ISS; la pantalla real llega en el ISS-07). | Pendiente de verificación |
| AC-06-07 | Las pruebas del feature pasan, `ng build` finaliza correctamente y los CSS de `sale-list` y `sale-form` no tienen reglas. | Pendiente de verificación |

**Nota sobre las verificaciones:** las AC-06-01 a AC-06-05 requieren que el backend acepte las peticiones (opción A o B de la nota de autenticación); con la opción C se captura el `401` como comportamiento esperado y esas AC quedan pendientes hasta el ISS-08/ISS-09 del frontend. Las AC-06-06 y AC-06-07 se pueden verificar en cualquier caso.

## Verificación del ISS

Antes de dar por finalizado el ISS-06, comprobaré cada criterio de aceptación y adjuntaré las capturas correspondientes (`image-105.png` en adelante).

El incremento se considerará aprobado cuando todas las verificaciones hayan finalizado correctamente.

```text
Todos los criterios AC-06 aprobados → avanzar al ISS-07.

Algún criterio AC-06 pendiente o fallido → corregir y repetir la prueba.
```
