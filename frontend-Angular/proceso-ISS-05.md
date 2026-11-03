# ISS-05. CRUD de productos

> **Nota de uso.** Este archivo es un borrador independiente de `proceso.md` para que la unidad del ISS-05 se pueda redactar mientras se desarrolla el ISS-04. Cuando el ISS-04 esté terminado, copia **todo** el contenido de este archivo y pégalo al final de `frontend-Angular/proceso.md` (justo después de la sección «Verificación del ISS» del ISS-04), desarrolla la unidad siguiendo los pasos en orden y, una vez pegado, borra este archivo para que no quede duplicado.
>
> **Evidencias:** las capturas de este ISS se numeran a partir de `image-95.png`, porque la serie `image-85` · `image-94` corresponde al ISS-04.

## Objetivo

Implementar el CRUD completo de **productos** en `app-movilcare/frontend`: crear, leer, actualizar y dar de baja lógica los productos del catálogo, con formulario en diálogo, tabla con búsqueda, filtro «Solo disponibles», marcador de productos sin unidades activas y ruta propia dentro del Shell.

## Nota de adaptación - la entidad: de tipos de producto a productos (diferencia con la guía)

La guía está escrita para una entidad `Product` con marca, cantidad, stock mínimo y una relación `productTypeId` hacia `product_types`. En MovilCare ese modelo no existe: la migración `product/0002` eliminó `stock` y `ProductType`, y la relación con unidades está **invertida** (`serialized_units.product_id → products.id`), relación que ya se implementó en el ISS-04. Por tanto:

| Guía (frontend2026 Django) | MovilCare (real) | Tratamiento en este ISS |
| --- | --- | --- |
| `brand` (marca) | No existe en `Product` | Se omite el campo. |
| `quantity` (cantidad) | No existe (`stock` eliminado en `product/0002`) | Se sustituye por el **número de unidades activas**, calculado en el frontend con `forkJoin` sobre `SerializedUnitApi.list('active')`. |
| `minStock` (stock mínimo) | No existe | Se sustituye por el marcador **«Sin unidades activas»** (producto `active` sin ninguna unidad `active`). |
| `productTypeId` (FK a `product_types`) | No existe `ProductType`; la FK inversa `product` vive en `SerializedUnit` (ya hecha en el ISS-04) | El formulario **no lleva `<p-select>`**: el producto se crea/edita como entidad plana. |
| `sku`, `name`, `description`, `price`, `status` | `Product(sku, name, description, price, status)` | Se implementan tal cual (ver tabla de validaciones). |
| Selector del menú lateral | El ítem **Productos** (`pi pi-box`, `/productos`) ya existe en `shell.ts` | No se toca `shell.ts`; solo se reemplaza la ruta `provisional`. |

**Validaciones (contrato real):**

| Campo | Tipo de control | Reglas en el formulario | Backend (`ProductSerializer` / `Product`) |
| --- | --- | --- | --- |
| `sku` | texto, requerido | `required`, 2–100 caracteres | `unique`, `max_length=100`, `MinLengthValidator(2)` |
| `name` | texto, requerido | `required`, 2–120 caracteres | `unique`, `extra_kwargs: min_length=2, max_length=120` |
| `description` | texto opcional | `maxLength(255)`; vacío → `null` | `required=False`, `allow_null=True`; vacío en blanco → `None` |
| `price` | numérico (`p-inputnumber`) | `required`, `min(0.01)`, 2 decimales; se envía con `toFixed(2)` (tipo `Money = string`) | `DecimalField` con `MinValueValidator(0)`, 2 decimales |
| `status` | no está en el formulario | Se agrega en `ProductList.save()` como `status: 'active'` en el alta | Campo del modelo, heredado de `StoreLabModel` |

> **Modelo sin cambios:** `ProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>` **ya incluye `status`**, así que `core/models/product.model.ts` **no se modifica** en este ISS (a diferencia de la guía, que sí reescribe su modelo).

## Nota de adaptación - autenticación y permisos (diferencia con la guía)

`ProductViewSet` y `SerializedUnitViewSet` heredan de `CatalogViewSet`, que exige `[IsAuthenticated, HasResourceAccess]` (`backend/apps/product/views.py`). El ISS necesita dos peticiones autenticadas en paralelo (`GET /api/products/` y `GET /api/serialized-units/?status=active`) además de `GET /api/products/available/`. Opciones:

- **Opción A (recomendada):** marca temporalmente en `backend/apps/product/views.py`:

  ```python
  class CatalogViewSet(viewsets.ModelViewSet):
      permission_classes = [AllowAny]  # ISS-05: temporal, revertir tras la evidencia
  ```

  Como `AllowAny` ya está importado en ese archivo, basta con cambiar la línea. Cubre productos **y** unidades (el `forkJoin` del ISS-05). Después de capturar la evidencia: `git restore app-movilcare/backend/apps/product/views.py`.
- **Opción C:** no toques el backend y captura el `401` que mostraría `toApiMessage` («La sesión no es válida. Inicia sesión nuevamente.») como evidencia del control de acceso.
- **Opción B (NO aplica aquí):** usar un commit antiguo con catálogo abierto no sirve. El endpoint `AvailableProductListAPIView` se añadió en `50a6d8b`, cuando `CatalogViewSet` ya exigía autenticación; en `4721a18` y `e00936a` esa clase aún no existía. **Ningún commit histórico** combina catálogo abierto con el endpoint `/available/`.

## 05.1. Contrato con la API

**Generar la estructura.**

```bash
cd app-movilcare/frontend
ng generate component features/products/product-form --skip-tests --defaults
ng generate component features/products/product-list --skip-tests --defaults
```

Se esperan tres archivos por componente (`ts`, `html`, `css`) bajo `src/app/features/products/`, con los CSS **sin reglas** (solo el selector), igual que en el ISS-04. Los `*.spec.ts` se crean manualmente en la sección 05.4.

**Endpoints involucrados.**

| Método | Ruta | Uso en este ISS | Autenticación |
| --- | --- | --- | --- |
| GET | `/api/products/` | Lista completa (con `?status=` opcional) | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/products/available/` | Filtro «Solo disponibles» | `AllowAny` (solo devuelve productos `active`) |
| GET | `/api/products/:id/` | Detalle (`ProductApi.get`, ya existe) | `IsAuthenticated + HasResourceAccess` |
| POST | `/api/products/` | Alta | `IsAuthenticated + HasResourceAccess` |
| PUT/PATCH | `/api/products/:id/` | Edición | `IsAuthenticated + HasResourceAccess` |
| DELETE | `/api/products/:id/` | Baja lógica (`perform_destroy` pone `status = inactive`) | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/products/:id/units/` | Unidades por producto (`ProductApi.units`, ya existe) | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/serialized-units/?status=active` | Conteo de unidades activas para el marcador | `IsAuthenticated + HasResourceAccess` |

**Ajustar `product-api.ts`.**

Archivo: `src/app/features/products/product-api.ts`. El archivo ya tiene `list()`, `get()`, `available()`, `create()`, `update()`, `remove()` y `units()`. El único cambio de este ISS es que `list()` acepte el estado opcional (patrón ya usado en `SerializedUnitApi.list`).

**Cambio 1** — agrega el import del tipo `Status` (junto a los imports de modelos que ya existen):

```ts
import { Status } from '../../core/models/api.model';
```

**Cambio 2** — reemplaza la firma actual de `list()`:

```ts
// antes
list(): Observable<Product[]> {
  return this.http.get<Product[]>(`${this.base}/`);
}

// después
list(status?: Status): Observable<Product[]> {
  return this.http.get<Product[]>(`${this.base}/`, {
    params: status ? { status } : {},
  });
}
```

El resto del archivo (`get`, `available`, `create`, `update`, `remove`, `units`) **no se modifica**.

**Verificación del contrato:** `ng build` debe seguir compilando sin errores; `Status` se usa en la firma del nuevo parámetro `status`.

### Evidencia

- Captura de los archivos generados en `src/app/features/products/`.
- Captura del endpoint `/api/products/` respondiendo (o del `401` con la opción C).

## 05.2. Formulario de producto

**Componente `product-form.ts`.**

Archivo: `src/app/features/products/product-form/product-form.ts`. Sigue el mismo patrón que `CustomerForm`: inputs `product`/`resetKey`/`saving`, outputs `saved`/`cancelled`, y el alta agrega `status` en la lista (no en el formulario).

```ts
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
```

**Puntos clave:**

- `price` es un control numérico (`Number(current?.price)` porque `Money` es `string`) y se serializa de vuelta con `toFixed(2)`, que es el formato que espera el `DecimalField` del backend.
- `description` vacío se envía como `null`, igual que lo que exige `ProductSerializer.validate_description`.
- No hay campo `product`: la relación la aporta `SerializedUnit` (ISS-04).

**Plantilla `product-form.html`.**

Archivo: `src/app/features/products/product-form/product-form.html`:

```html
<form
  [formGroup]="form"
  (ngSubmit)="submit()"
  class="grid gap-4"
>
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="flex flex-col gap-2">
      <label for="product-sku">
        SKU <span class="text-red-500">*</span>
      </label>

      <input
        id="product-sku"
        pInputText
        formControlName="sku"
        class="w-full"
        placeholder="SKU del producto"
        autocomplete="off"
      />

      @if (
        form.controls.sku.touched &&
        form.controls.sku.invalid
      ) {
        <p-message
          severity="error"
          size="small"
          variant="simple"
        >
          El SKU es obligatorio y debe tener entre 2 y 100 caracteres.
        </p-message>
      }
    </div>

    <div class="flex flex-col gap-2">
      <label for="product-name">
        Nombre <span class="text-red-500">*</span>
      </label>

      <input
        id="product-name"
        pInputText
        formControlName="name"
        class="w-full"
        placeholder="Nombre del producto"
        autocomplete="off"
      />

      @if (
        form.controls.name.touched &&
        form.controls.name.invalid
      ) {
        <p-message
          severity="error"
          size="small"
          variant="simple"
        >
          El nombre es obligatorio y debe tener entre 2 y 120 caracteres.
        </p-message>
      }
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <label for="product-description">Descripción</label>

    <textarea
      id="product-description"
      pTextarea
      formControlName="description"
      rows="3"
      class="w-full"
      placeholder="Descripción del producto (opcional)"
    ></textarea>

    @if (
      form.controls.description.touched &&
      form.controls.description.invalid
    ) {
      <p-message
        severity="error"
        size="small"
        variant="simple"
      >
        La descripción no puede superar los 255 caracteres.
      </p-message>
    }
  </div>

  <div class="flex flex-col gap-2">
    <label for="product-price">
      Precio <span class="text-red-500">*</span>
    </label>

    <p-inputnumber
      inputId="product-price"
      formControlName="price"
      mode="decimal"
      [maxFractionDigits]="2"
      placeholder="0.00"
    />

    @if (
      form.controls.price.touched &&
      form.controls.price.invalid
    ) {
      <p-message
        severity="error"
        size="small"
        variant="simple"
      >
        El precio es obligatorio y debe ser mayor que 0.
      </p-message>
    }
  </div>

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
      <span pButtonLabel>Guardar</span>
    </button>
  </div>
</form>
```

> **Nota sobre `p-inputnumber`:** en PrimeNG 22 los atributos disponibles son `inputId`, `mode`, `maxFractionDigits`, `min` (heredado de `BaseInput`), `placeholder`, etc.; **no existe `styleClass`** como en versiones antiguas, por eso el componente se queda sin clase de ancho en el ejemplo. Si al probarlo el ancho no se ajusta al resto del formulario, envuélvelo en `<div class="w-full">` o agrega `[fluid]="true"`.

### Evidencia

- Captura del formulario vacío con sus etiquetas.
- Captura de los mensajes de validación (SKU, nombre y precio).

## 05.3. Lista de productos

**Componente `product-list.ts`.**

Archivo: `src/app/features/products/product-list/product-list.ts`. Es la contraparte de `CustomerList`, con tres diferencias:

1. **Carga dual con `forkJoin`:** trae los productos y las unidades `active` para calcular cuántas unidades tiene cada producto (sustituto de `quantity`).
2. **Filtro «Solo disponibles»:** al activarlo consulta `GET /api/products/available/` (endpoint `AllowAny`) y deja solo los productos que además tienen unidades activas.
3. **Marcador «Sin unidades activas»:** el sustituto de la alerta de `minStock` de la guía.

```ts
import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import {
  Product,
  ProductPayload,
} from '../../../core/models/product.model';

import { Notification } from '../../../core/services/notification';
import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { SerializedUnitApi } from '../../serialized-units/serialized-unit-api';
import { ProductApi } from '../product-api';
import { ProductForm } from '../product-form/product-form';

@Component({
  selector: 'app-product-list',
  imports: [
    ButtonModule,
    DialogModule,
    EmptyState,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    StatusTag,
    TableModule,
    TagModule,
    ToggleSwitchModule,
    TooltipModule,
    ProductForm,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
  host: {
    class: 'block',
  },
})
export class ProductList {
  private readonly api = inject(ProductApi);
  private readonly unitsApi = inject(SerializedUnitApi);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);

  readonly rows = signal<Product[]>([]);
  /** Copia sin filtrar para restaurar el toggle «Solo disponibles». */
  private readonly allRows = signal<Product[]>([]);
  /** Conteo de unidades `active` por `productId`. */
  readonly unitCounts = signal<Map<number, number>>(new Map());

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly filter = signal('');
  readonly availableOnly = signal(false);
  readonly dialogVisible = signal(false);
  readonly editing = signal<Product | null>(null);
  readonly resetKey = signal(0);

  readonly visibleRows = computed(() =>
    filterRows(
      this.rows(),
      this.filter(),
      (product) => [
        product.sku,
        product.name,
        product.description,
      ],
    ),
  );

  /** Productos `active` sin ninguna unidad `active`. */
  readonly withoutUnits = computed(() => {
    const counts = this.unitCounts();

    return new Set(
      this.allRows()
        .filter(
          (product) =>
            product.status === 'active' &&
            (counts.get(product.id) ?? 0) === 0,
        )
        .map((product) => product.id),
    );
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      products: this.api.list(),
      units: this.unitsApi.list('active'),
    }).subscribe({
      next: ({ products, units }) => {
        const counts = new Map<number, number>();

        for (const unit of units) {
          counts.set(
            unit.productId,
            (counts.get(unit.productId) ?? 0) + 1,
          );
        }

        this.unitCounts.set(counts);
        this.allRows.set(products);
        this.rows.set(
          this.availableOnly()
            ? products.filter(
                (product) => (counts.get(product.id) ?? 0) > 0,
              )
            : products,
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.allRows.set([]);
        this.rows.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  toggleAvailableOnly(checked: boolean): void {
    this.availableOnly.set(checked);

    if (!checked) {
      this.rows.set(this.allRows());
      return;
    }

    this.loading.set(true);

    this.api.available().subscribe({
      next: (products) => {
        const counts = this.unitCounts();
        this.rows.set(
          products.filter(
            (product) => (counts.get(product.id) ?? 0) > 0,
          ),
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.resetKey.update((key) => key + 1);
    this.dialogVisible.set(true);
  }

  openEdit(product: Product): void {
    this.editing.set(product);
    this.resetKey.update((key) => key + 1);
    this.dialogVisible.set(true);
  }

  save(payload: Omit<ProductPayload, 'status'>): void {
    const current = this.editing();

    this.saving.set(true);

    const request = current
      ? this.api.update(current.id, payload)
      : this.api.create({
          ...payload,
          status: 'active',
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.notify.success(
          current ? 'Producto actualizado' : 'Producto creado',
        );
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.notify.error(toApiMessage(error));
      },
    });
  }

  remove(product: Product): void {
    this.confirmation.confirm({
      header: 'Dar de baja',
      message: `¿Deseas dar de baja el producto ${product.name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',

      accept: () => {
        this.api.remove(product.id).subscribe({
          next: () => {
            this.notify.warn('Producto dado de baja');
            this.load();
          },
          error: (error) => {
            this.notify.error(toApiMessage(error));
          },
        });
      },
    });
  }
}
```

**Notas:**

- `save()` emite `Omit<ProductPayload, 'status'>`: en el alta se agrega `status: 'active'` y en la edición se manda sin `status` (el backend conserva el actual con `PATCH`), así que **no aparece el error `TS2345` de «'status' does not exist»** que tuvo que corregirse en el ISS-03.
- `withoutUnits()` se calcula sobre `allRows()` (no sobre `rows()`) para que el marcador no desaparezca cuando el toggle «Solo disponibles» oculta filas.
- El endpoint `/api/serialized-units/?status=active` es el que sostiene la columna «Unidades activas».

**Plantilla `product-list.html`.**

Archivo: `src/app/features/products/product-list/product-list.html`:

```html
<div class="space-y-6">
  <app-page-header
    title="Productos"
    subtitle="Consulta y administra los productos del catálogo."
  >
    <p-tag
      [value]="rows().length + ' registros'"
      severity="info"
      [rounded]="true"
    />

    <button
      pButton
      type="button"
      (click)="openCreate()"
    >
      <i pButtonIcon class="pi pi-plus"></i>
      <span pButtonLabel>Nuevo producto</span>
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
    [value]="visibleRows()"
    [loading]="loading()"
    dataKey="id"
    [paginator]="visibleRows().length > 10"
    [rows]="10"
    [rowHover]="true"
  >
    <ng-template #caption>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          pInputText
          type="search"
          class="w-full sm:flex-1"
          aria-label="Buscar productos"
          placeholder="Buscar por SKU, nombre o descripción..."
          [value]="filter()"
          (input)="filter.set($any($event.target).value)"
        />

        <div class="flex items-center gap-2">
          <p-toggleswitch
            inputId="available-only"
            [ngModel]="availableOnly()"
            (ngModelChange)="toggleAvailableOnly($event)"
            [ngModelOptions]="{ standalone: true }"
          />
          <label for="available-only" class="text-sm">
            Solo disponibles
          </label>
        </div>
      </div>
    </ng-template>

    <ng-template #header>
      <tr>
        <th>SKU</th>
        <th>Nombre</th>
        <th>Precio</th>
        <th>Unidades activas</th>
        <th>Estado</th>
        <th class="text-right">Acciones</th>
      </tr>
    </ng-template>

    <ng-template #body let-product>
      <tr>
        <td>{{ product.sku }}</td>
        <td>{{ product.name }}</td>
        <td>{{ product.price }}</td>

        <td>
          @if (withoutUnits().has(product.id)) {
            <p-tag
              value="Sin unidades activas"
              severity="danger"
            />
          } @else {
            {{ unitCounts().get(product.id) ?? 0 }}
          }
        </td>

        <td>
          <app-status-tag [status]="product.status" />
        </td>

        <td class="text-right">
          <button
            pButton
            type="button"
            text
            rounded
            severity="secondary"
            aria-label="Editar producto"
            pTooltip="Editar"
            (click)="openEdit(product)"
          >
            <i pButtonIcon class="pi pi-pencil"></i>
          </button>

          <button
            pButton
            type="button"
            text
            rounded
            severity="danger"
            aria-label="Dar de baja al producto"
            pTooltip="Dar de baja"
            [disabled]="product.status === 'inactive'"
            (click)="remove(product)"
          >
            <i pButtonIcon class="pi pi-trash"></i>
          </button>
        </td>
      </tr>
    </ng-template>

    <ng-template #emptymessage>
      <tr>
        <td colspan="6">
          @if (filter() || availableOnly()) {
            <app-empty-state
              icon="pi pi-search"
              title="Sin coincidencias"
              message="Ningún producto coincide. Borra el filtro o desactiva «Solo disponibles»."
            />
          } @else {
            <app-empty-state
              icon="pi pi-box"
              title="Sin productos registrados"
              message="Registra el primer producto con el botón «Nuevo producto»."
            />
          }
        </td>
      </tr>
    </ng-template>
  </p-table>

  <p-dialog
    [visible]="dialogVisible()"
    (visibleChange)="dialogVisible.set($event)"
    [header]="editing() ? 'Editar producto' : 'Nuevo producto'"
    [modal]="true"
    [draggable]="false"
    [resizable]="false"
    styleClass="w-full max-w-2xl mx-4"
  >
    <app-product-form
      [product]="editing()"
      [saving]="saving()"
      [resetKey]="resetKey()"
      (saved)="save($event)"
      (cancelled)="dialogVisible.set(false)"
    />
  </p-dialog>
</div>
```

### Evidencia

- Captura de la lista con la columna «Unidades activas» y el marcador «Sin unidades activas».
- Captura del toggle «Solo disponibles» activado.
- Captura del diálogo de confirmación de baja.

## 05.4. Ruta y pruebas

### Configurar la ruta

En `src/app/app.routes.ts` se reemplaza el `loadComponent` provisional de `/productos`:

```ts
// antes
{
  path: 'productos',
  title: 'Productos · MovilCare',
  loadComponent: provisional,
},

// después
{
  path: 'productos',
  title: 'Productos · MovilCare',
  loadComponent: () =>
    import('./features/products/product-list/product-list')
      .then((m) => m.ProductList),
},
```

La constante `provisional` **se conserva**: todavía la usa la ruta `/ventas`. El ítem de menú **Productos** (`pi pi-box`, `/productos`) ya existe en `shell.ts`, así que **no se toca el layout**, igual que en el ISS-04. De esta forma el usuario accede al CRUD desde el menú lateral y la navegación continúa dentro del layout de MovilCare.

### Evidencia

- Captura de la configuración de `app.routes.ts`.
- Captura de la opción Productos en el menú lateral.
- Captura de `/productos` dentro del layout de MovilCare.

### Pruebas

Preparé las pruebas para comprobar las operaciones principales del CRUD. Como los componentes se generaron con `--skip-tests`, creo manualmente los archivos `*.spec.ts` junto a cada pieza:

- `src/app/features/products/product-api.spec.ts`
- `src/app/features/products/product-list/product-list.spec.ts`
- `src/app/features/products/product-form/product-form.spec.ts`

Las pruebas se centraron en tres aspectos:

1. Verificar que `ProductApi` construya la URL con barra final y que `list('active')` envíe el parámetro `status=active`.
2. Verificar que `ProductList` pida productos y unidades en el `forkJoin`, pinte una fila por producto y marque «Sin unidades activas» cuando no hay unidades.
3. Verificar que `ProductForm` emite los datos normalizados (SKU y nombre recortados, descripción vacía en `null`, precio con dos decimales) y no envíe información inválida.

```typescript
// product-api.spec.ts: la URL lleva barra final y el filtro de estado
it('should call /api/products/?status=active', () => {
  api.list('active').subscribe();

  http
    .expectOne(
      'http://127.0.0.1:8000/api/products/?status=active',
    )
    .flush([]);

  api.list().subscribe();
  http
    .expectOne('http://127.0.0.1:8000/api/products/')
    .flush([]);

  api.available().subscribe();
  http
    .expectOne('http://127.0.0.1:8000/api/products/available/')
    .flush([]);
});
```

```typescript
// product-list.spec.ts: pinta una fila y marca el producto sin unidades
const PRODUCT: Product = {
  id: 1,
  sku: 'SKU-001',
  name: 'Laptop Lenovo',
  description: null,
  price: '1099.99',
  status: 'active',
};

it('should render one row and mark the product without units', async () => {
  const fixture = TestBed.createComponent(ProductList);
  await fixture.whenStable();

  const element = fixture.nativeElement as HTMLElement;

  expect(element.querySelectorAll('tbody tr').length).toBe(1);
  expect(element.textContent).toContain('SKU-001');
  expect(element.textContent).toContain('Sin unidades activas');
});
```

```typescript
// product-form.spec.ts: emite `saved` con el precio en formato money
it('should emit saved with the trimmed body', async () => {
  const fixture = TestBed.createComponent(ProductForm);
  await fixture.whenStable();

  let body: Omit<ProductPayload, 'status'> | undefined;
  fixture.componentInstance.saved.subscribe(
    (payload) => (body = payload),
  );

  fixture.componentInstance.form.setValue({
    sku: ' SKU-001 ',
    name: ' Laptop Lenovo ',
    description: '  ',
    price: 1099.5,
  });
  fixture.componentInstance.submit();

  expect(body).toEqual({
    sku: 'SKU-001',
    name: 'Laptop Lenovo',
    description: null,
    price: '1099.50',
  });
});

it('should not emit when the price is zero', async () => {
  const fixture = TestBed.createComponent(ProductForm);
  await fixture.whenStable();

  let emitted = false;
  fixture.componentInstance.saved.subscribe(() => (emitted = true));

  fixture.componentInstance.form.setValue({
    sku: 'SKU-001',
    name: 'Laptop Lenovo',
    description: '',
    price: 0,
  });
  fixture.componentInstance.submit();

  expect(emitted).toBe(false);
});
```

Los bloques omiten los imports de cada archivo, el `beforeEach` con `provideHttpClientTesting()` y el `afterEach(() => http.verify())` necesarios en el spec del servicio, y los servicios falsos del spec de la lista: `ProductApi` (`list: () => of([PRODUCT])`, `available: () => of([PRODUCT])`), `SerializedUnitApi` (`list: () => of([])`), `Notification` (`success() {}`, `warn() {}`, `error() {}`) y `ConfirmationService`. La URL `http://127.0.0.1:8000/api/products/` proviene de `environment.apiUrl`, igual en los entornos `production` y `development`.

**Nota sobre el spec de la lista:** como el falso de `SerializedUnitApi.list` devuelve `of([])`, el producto queda sin unidades activas y por eso la prueba espera el texto «Sin unidades activas». Si devuelves una unidad (`of([{ productId: 1, ... }])`), el mismo caso debe pintar `1` en la columna.

Para ejecutar las pruebas, utilizo:

```bash
ng test --watch=false
```

También reviso que las pruebas existentes (`core/services/notification.spec.ts`, `demo/ejemplo/ejemplo.spec.ts` y las tres del ISS-03) continúen funcionando.

### Evidencia

- Captura de la ejecución de las pruebas.
- Captura del resultado de las pruebas del servicio, de la lista y del formulario.

## Cómo probarlo

Realiza las verificaciones funcionales en el siguiente orden (con el backend en la opción A de la nota de autenticación, salvo que se indique otro caso):

1. Entra a `/productos` desde el menú lateral y comprueba en la pestaña Network que el `forkJoin` dispara `GET /api/products/` y `GET /api/serialized-units/?status=active` en camelCase, sin envolver.
2. Revisa la columna «Unidades activas»: debe mostrar el conteo de unidades por producto y el tag rojo «Sin unidades activas» en los productos activos que no tienen ninguna.
3. Busca por SKU, nombre o descripción y verifica que la tabla se filtra sin generar nuevas peticiones.
4. Activa «Solo disponibles» y comprueba que se llama `GET /api/products/available/` y que solo quedan los productos con unidades activas; al desactivarlo se restaura la lista completa.
5. Pulsa «Nuevo producto» e intenta guardar con un SKU de un solo carácter, un nombre de un solo carácter y precio `0`: no debe enviarse ninguna petición y deben aparecer los mensajes de validación.
6. Registra un producto y comprueba que el `POST` envía `sku`, `name`, `description`, `price` con dos decimales (por ejemplo `"1099.50"`) y `status: "active"`, y que el toast muestra «Producto creado».
7. Edita los datos de un producto y verifica que el `PATCH` **no** envía `status`.
8. Intenta crear otro producto con el mismo `sku` y comprueba que el backend responde `400` y que el toast muestra el mensaje del campo devuelto por `toApiMessage` (la unicidad no se valida en el frontend).
9. Da de baja un producto, comprueba la confirmación y verifica que el `DELETE` responde `204`, que la fila queda con estado inactiva y que el botón de baja se deshabilita.
10. Detén el backend y comprueba que la pantalla muestra «No se pudo conectar con la API de MovilCare.» con la tabla vacía; después ejecuta `ng test --watch=false` y `ng build`.

## Criterios de aceptación

| Código | Criterio | Resultado |
|---|---|---|
| AC-05-01 | La tabla muestra SKU, nombre, precio, unidades activas y estado de cada producto, con el tag «Sin unidades activas» donde corresponde. | Pendiente de verificación |
| AC-05-02 | El alta envía `POST` con `status: "active"`, precio con dos decimales y descripción vacía como `null`. | Pendiente de verificación |
| AC-05-03 | La edición precarga el formulario y envía `PATCH` sin `status`. | Pendiente de verificación |
| AC-05-04 | La baja confirma, ejecuta `DELETE` y responde `204`; el producto queda inactivo en la lista. | Pendiente de verificación |
| AC-05-05 | La búsqueda filtra por SKU, nombre o descripción sin peticiones y el toggle «Solo disponibles» usa `/api/products/available/` ocultando los productos sin unidades. | Pendiente de verificación |
| AC-05-06 | `/productos` carga `ProductList` dentro de `Shell` con su título, reemplazando el placeholder y sin tocar `shell.ts`. | Pendiente de verificación |
| AC-05-07 | Las pruebas automatizadas y `ng build` finalizan correctamente, los mensajes del backend se muestran con `toApiMessage` y los CSS del feature no tienen reglas. | Pendiente de verificación |

**Nota sobre las verificaciones:** las AC-05-01 a AC-05-05 requieren que el backend acepte las peticiones (opción A de la nota de autenticación); con la opción C se captura el `401` como comportamiento esperado y esas AC quedan pendientes hasta el ISS-08/ISS-09 del frontend. Las AC-05-06 y AC-05-07 se pueden verificar en cualquier caso.

## Verificación del ISS

Antes de dar por finalizado el ISS-05, comprobaré cada criterio de aceptación y adjuntaré las capturas correspondientes (`image-95.png` en adelante).

El incremento se considerará aprobado cuando todas las verificaciones hayan finalizado correctamente.

```text
Todos los criterios AC-05 aprobados → avanzar al ISS-06.

Algún criterio AC-05 pendiente o fallido → corregir y repetir la prueba.
```
