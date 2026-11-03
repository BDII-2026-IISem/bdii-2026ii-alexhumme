# ISS-07. Detalle de ventas y dashboard

> **Nota de uso.** Este archivo es un borrador independiente de `proceso.md` para que la unidad del ISS-07 se pueda redactar mientras se desarrolla el ISS-06. Cuando el ISS-06 esté terminado, copia **todo** el contenido de este archivo y pégalo al final de `frontend-Angular/proceso.md` (justo después de la sección «Verificación del ISS» del ISS-06), desarrolla la unidad siguiendo los pasos en orden y, una vez pegado, borra este archivo para que no quede duplicado.
>
> **Evidencias:** las capturas de este ISS se numeran a partir de `image-115.png`, porque la serie `image-105` · `image-114` corresponde al ISS-06.

## Objetivo

Abrir una venta desde `/ventas/:id`, ver su cabecera y sus líneas y anularla con confirmación. Listar todas las líneas de todas las ventas en `/detalle-ventas`, con enlace a su detalle. Mostrar el panel del día en `/dashboard`. El inicio de la aplicación sigue siendo `/clientes`.

> **Encaje en las dos fases.** Con esta unidad termina **Fase I · Business**: no hay login, `Authorization`, guard ni menú filtrado. El ISS-08 arranca la autenticación y el ISS-09 aplica guards y RBAC **encima** de estas pantallas, sin reescribirlas.

> **Nada se recalcula en el detalle.** Se muestran `unitPrice`, `lineTotal`, `subtotal` y `total` tal como llegaron en el `GET`. El panel solo deriva cuatro cifras de cuatro `GET`.

## Nota de adaptación - la entidad: de `SaleLine` y `product-sale-list` a `SaleDetail` (diferencia con la guía)

La guía describe el detalle con `SaleLine`, una lista aplanada llamada `product-sale-list` (carpeta `product-sales/`) y un panel que calcula «stock bajo» con `product.quantity <= product.minStock`. En MovilCare el modelo real es `SaleDetail` (`core/models/sale-detail.model.ts`), **no existe `minStock` ni columna de stock** (la migración `product/0002` eliminó `stock`) y las rutas `detalle-ventas` y `dashboard` todavía no existen.

| Guía (frontend2026 Django) | MovilCare (real) | Tratamiento en este ISS |
| --- | --- | --- |
| `clientName` en la cabecera | `customer_name` del serializer → `customerName` | Se usa el campo ya existente de `Sale`; el texto en pantalla dice «Cliente» |
| `SaleLine` con `product` y `productName` | `SaleDetail` con `productId` y `productName` (agregado en el ISS-06) | El nombre de la línea prefiere `productName` y usa el catálogo (`ProductApi.list()`) solo como respaldo |
| No hay `GET /api/product-sales/`: se aplana desde `GET /api/sales/` | Igual en MovilCare, **pero** `SaleDetail` no trae el número de venta | Se agrega el tipo `SaleDetailRow` (`SaleDetail` + `saleId`) y el mapeo `saleId: sale.id, ...item` en `SaleDetailApi.list()` (sección 07.2) |
| «Anular repone el stock **una sola vez**» | **MovilCare no tiene stock:** el docstring de `Sale.void()` lo dice («la anulación no repone cantidad alguna»); solo marca `inactive` la venta y sus líneas | **AC-07-02 adaptada:** tras el `DELETE` el contador de unidades **no cambia**; la anulación sigue siendo idempotente (un segundo `DELETE` responde `204` y no rompe nada) |
| Confirmación «¿Anular la venta \#61? Devolverá 1 unidades…» | No hay nada que devolver | El mensaje de confirmación es «¿Anular la venta \#id? Quedará como inactiva.» |
| `lowStock` = `product.quantity <= product.minStock` | `Product` no tiene `quantity` ni `minStock` | **Regla adaptada:** productos `active` con **0 unidades activas** de `serialized_units`. Etiqueta «Sin unidades activas» (misma del ISS-05) |
| Panel con **tres** `GET` (ventas, productos, clientes) | Hacen falta **cuatro**: las unidades activas sostienen el cálculo de stock | `forkJoin({ sales, products, clients, units })` en `Dashboard` |
| Etiquetas del panel con datos del seeder («Ventas de hoy 30», «31 ventas en total», …) | **No hay seeder de ventas** en MovilCare | Las tarjetas muestran tus datos; la etiqueta «N ventas en total» es `sales().length` y no pide un `GET` extra |
| Placeholders `detalle-ventas` y `dashboard` ya montados en rutas | En MovilCare **esas rutas no existen** todavía; el placeholder de `ventas/:id` lo dejó el ISS-06 | Se crean las dos rutas nuevas en 07.4 y se reemplaza el placeholder de `ventas/:id` |
| «El menú ya está en `Shell.items`» | `menuItems` de `Shell` tiene Clientes, Productos, Unidades serializadas y Ventas; **faltan** Panel y Líneas de venta | Se agregan dos ítems al menú y dos entradas al mapa `pageTitle` (sección 07.4) |
| `GET /api/clients/?status=active` | `GET /api/customers/?status=active` (`CustomerViewSet` filtra `?status=`) | Se usa `CustomerApi.list('active')`, tal como lo dejó el ISS-06 |
| `GET /api/products/` del panel | `ProductApi.list()` (sin argumentos: trae todos los estados) | El filtrado por `status === 'active'` lo hace `lowStock` en el frontend, como la guía |
| Componente `product-sale-list` en `features/product-sales/` | La feature de líneas ya existe como `features/sale-details/sale-detail-api.ts` | El componente nuevo es `features/sale-details/sale-detail-list/` (`SaleDetailList`) |
| Rutas con título «· StoreLab» | Los títulos de MovilCare son «· MovilCare» | `Detalle de venta · MovilCare`, `Líneas de venta · MovilCare`, `Panel · MovilCare` |
| `**` sigue yendo a `construir` | En MovilCare el comodín `**` redirige a `/clientes` | **No se toca**; `/construir` ya está fuera de `Shell` y no llama a `/api` (solo se verifica) |
| Importes con el pipe `currency` | La lista del ISS-06 muestra la cadena cruda del servidor | El detalle y el panel **sí** usan `currency` (formato `$1,234.56`); es solo presentación, no se recalcula nada |

## Nota de adaptación - autenticación y permisos (diferencia con la guía)

La guía asume el backend de Django en su estado de **ISS-09/ISS-10** (catálogo abierto) y avisa de que contra un backend consolidado se verá `401`. En MovilCare el backend está consolidado: las vistas de ventas, clientes y catálogo exigen `[IsAuthenticated, HasResourceAccess]` (`apps/sale/views.py`, `apps/customer/views.py`, `apps/product/views.py`), y la configuración de DRF declara `IsAuthenticated` como permiso por defecto (`config/settings/__init__.py`). El frontend todavía no tiene login, interceptor ni guards, así que hoy cada petición responde `401`.

Endpoints que necesita este ISS y su permiso real:

| Método | Ruta | Vista | Autenticación |
| --- | --- | --- | --- |
| GET | `/api/sales/:id/` | `SaleReadViewSet.retrieve` (cabecera + líneas) | `IsAuthenticated + HasResourceAccess` |
| DELETE | `/api/sales/:id/` | `SaleReadViewSet.destroy` → `Sale.void()` (anulación) | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/sales/` | `SaleCollectionAPIView.get` (aplanado de líneas y panel) | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/products/` | `ProductViewSet` (`CatalogViewSet`) | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/customers/?status=active` | `CustomerViewSet` (filtra `?status=`) | `IsAuthenticated + HasResourceAccess` |
| GET | `/api/serialized-units/?status=active` | `SerializedUnitViewSet` (`CatalogViewSet`) | `IsAuthenticated + HasResourceAccess` |

Para verificar el detalle, la anulación, las líneas y el panel durante este ISS, elige una de estas opciones (las tres son válidas):

- **Opción A (recomendada):** cambio **temporal y local** de `permission_classes` a `[AllowAny]` en **cuatro clases de tres archivos** (importa `AllowAny` donde falte):

  | Archivo | Clases |
  | --- | --- |
  | `backend/apps/sale/views.py` | `SaleReadViewSet`, `SaleCollectionAPIView` |
  | `backend/apps/customer/views.py` | `CustomerViewSet` |
  | `backend/apps/product/views.py` | `CatalogViewSet` (el import ya existe desde el ISS-05) |

  Después de tomar las evidencias, restauro todo de una vez:

  ```bash
  git restore app-movilcare/backend/apps/sale/views.py app-movilcare/backend/apps/customer/views.py app-movilcare/backend/apps/product/views.py
  ```

  **Este cambio no se commitea.** (`SaleRegisterAPIView` no hace falta: este ISS no da de alta ventas.)
- **Opción B (parcial):** ejecutar el backend en el commit `722e18d` («ISS 11»), donde `SaleCollectionAPIView`, `SaleRegisterAPIView`, `CustomerViewSet` y `CatalogViewSet` **ya tenían `permission_classes = [AllowAny]`**. **Advertencia importante:** en ese commit **no existe `GET/DELETE /api/sales/:id/`** (`SaleReadViewSet` llegó después), así que con esta opción solo puedes verificar las secciones **07.2 (líneas)** y **07.3 (panel)**; el detalle y la anulación (07.1) **requieren la opción A**.
- **Opción C:** no modificar el backend y capturar el `401` que muestra `toApiMessage` («La sesión no es válida. Inicia sesión nuevamente.») como comportamiento esperado de esta fase.

`ng test` y `ng build` no dependen del backend y se ejecutan igual en las tres opciones. Las capturas de las secciones siguientes que requieren datos del backend asumen la opción **A** (o la **B** en 07.2/07.3).

## 07.1. Detalle: `sale-detail`

**Generar el componente.**

```bash
cd app-movilcare/frontend
ng generate component features/sales/sale-detail --skip-tests --defaults
```

El componente se crea *standalone*, con el CSS **sin reglas** (solo el selector), igual que en los ISS-03 a ISS-06. El `*.spec.ts` se crea manualmente en la sección 07.5.

**Lectura (`GET /api/sales/{id}/`).** El `SaleReadViewSet.retrieve` devuelve la misma forma que la lista (`SaleSerializer`): `customerId`, `customerName`, `saleDate`, `subtotal`, `tax`, `discounts`, `total`, `status` y `lines[]` con `productName`, `quantity`, `unitPrice` y `lineTotal`. El componente **no recalculará** ningún importe: solo los pinta con el pipe `currency`.

**Anulación (`DELETE /api/sales/{id}/`).** `SaleReadViewSet.destroy` llama a `instance.void()`, que marca `inactive` la venta y sus líneas y responde `204`; es idempotente y **no repone stock** (no existe). El botón de anular se esconde con `@if (!isVoided())` y `voidSale()` no hace nada si la venta ya está anulada.

**Componente `sale-detail.ts`**

```ts
import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Sale } from '../../../core/models/sale.model';
import { Notification } from '../../../core/services/notification';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { ProductApi } from '../../products/product-api';
import { SaleApi } from '../sale-api';

@Component({
  selector: 'app-sale-detail',
  imports: [
    ButtonModule,
    CurrencyPipe,
    DatePipe,
    EmptyState,
    MessageModule,
    PageHeader,
    RouterLink,
    StatusTag,
    TableModule,
    TagModule,
  ],
  templateUrl: './sale-detail.html',
  styleUrl: './sale-detail.css',
  host: {
    class: 'block',
  },
})
export class SaleDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SaleApi);
  private readonly productsApi = inject(ProductApi);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notify = inject(Notification);

  readonly sale = signal<Sale | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly voiding = signal(false);

  private readonly productNames = signal<Map<number, string>>(new Map());

  private readonly saleId = Number(
    this.route.snapshot.paramMap.get('id'),
  );

  readonly isVoided = computed(
    () => this.sale()?.status === 'inactive',
  );

  readonly customerLabel = computed(() => {
    const sale = this.sale();

    if (!sale) {
      return '';
    }

    return sale.customerName || `Cliente #${sale.customerId}`;
  });

  /** Unidades vendidas en la venta: la suma de `quantity` de sus líneas. */
  readonly units = computed(() =>
    (this.sale()?.lines ?? []).reduce(
      (sum, line) => sum + line.quantity,
      0,
    ),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    // La guía une la venta con el catálogo: `productName` ya viene en la
    // línea (ISS-06) y el catálogo solo queda como respaldo.
    forkJoin({
      sale: this.api.get(this.saleId),
      products: this.productsApi.list(),
    }).subscribe({
      next: ({ sale, products }) => {
        this.sale.set(sale);
        this.productNames.set(
          new Map(
            products.map((product) => [product.id, product.name]),
          ),
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.sale.set(null);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  lineName(productId: number, productName: string): string {
    return (
      productName ||
      this.productNames().get(productId) ||
      `Producto #${productId}`
    );
  }

  voidSale(): void {
    const sale = this.sale();

    // Nada que anular si no hay venta o si ya está anulada.
    if (!sale || this.isVoided()) {
      return;
    }

    this.confirmation.confirm({
      header: 'Anular venta',
      message: `¿Anular la venta #${sale.id}? Quedará como inactiva.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Anular',
      rejectLabel: 'Cancelar',

      accept: () => {
        this.voiding.set(true);
        this.api.voidSale(sale.id).subscribe({
          next: () => {
            this.voiding.set(false);
            this.notify.warn('Venta anulada');
            this.load();
          },
          error: (error) => {
            this.voiding.set(false);
            this.notify.error(toApiMessage(error));
          },
        });
      },
    });
  }
}
```

**Puntos clave:**

- El id llega de `ActivatedRoute.snapshot.paramMap` y se lee **una sola vez** en el constructor (la ruta no cambia dentro de la pantalla; si cambia, Angular monta el componente de nuevo). Un id inválido (`/ventas/999`) responde `404` y el mensaje queda en `error`.
- `voidSale()` tiene dos guardas: sin venta y ya anulada (`status === 'inactive'`) → no se abre el diálogo ni se pide el `DELETE`.
- Tras el `204` se vuelve a cargar la venta (`load()`): el estado pasa a Inactivo, la etiqueta lo muestra y el botón desaparece con `@if (!isVoided())`.
- **Adaptación con la guía:** el mensaje de confirmación **no** promete devolver unidades (MovilCare no tiene stock); la anulación es solo lógica (`void()`), idempotente y sin efectos sobre `serialized_units`.

**Plantilla `sale-detail.html`**

```html
<div class="space-y-6">
  @if (error()) {
    <p-message severity="error" styleClass="w-full">
      {{ error() }}
    </p-message>
  }

  @if (sale(); as current) {
    <app-page-header
      [title]="
        '#' + current.id + ' · ' +
        (current.saleDate | date: 'dd/MM/yyyy HH:mm')
      "
      [subtitle]="customerLabel()"
    >
      <p-tag
        [value]="
          units() + ' unidades en ' + current.lines.length + ' líneas'
        "
        severity="info"
        [rounded]="true"
      />

      <app-status-tag [status]="current.status" />

      @if (!isVoided()) {
        <button
          pButton
          type="button"
          severity="danger"
          outlined
          [loading]="voiding()"
          (click)="voidSale()"
        >
          <i pButtonIcon class="pi pi-ban"></i>
          <span pButtonLabel>Anular venta</span>
        </button>
      }

      <a
        pButton
        type="button"
        severity="secondary"
        outlined
        routerLink="/ventas"
      >
        <span pButtonLabel>Volver a ventas</span>
      </a>
    </app-page-header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-slate-100 p-4">
        <p class="text-sm text-slate-500">Subtotal</p>
        <p class="text-lg font-semibold">
          {{ current.subtotal | currency }}
        </p>
      </div>

      <div class="rounded-lg border border-slate-100 p-4">
        <p class="text-sm text-slate-500">Impuesto</p>
        <p class="text-lg font-semibold">
          {{ current.tax | currency }}
        </p>
      </div>

      <div class="rounded-lg border border-slate-100 p-4">
        <p class="text-sm text-slate-500">Descuento</p>
        <p class="text-lg font-semibold">
          {{ current.discounts | currency }}
        </p>
      </div>

      <div class="rounded-lg border border-slate-100 p-4">
        <p class="text-sm text-slate-500">Total</p>
        <p class="text-lg font-semibold">
          {{ current.total | currency }}
        </p>
      </div>
    </div>

    <section class="rounded-lg border border-slate-100 p-4">
      <h2 class="mb-3 font-semibold text-slate-900">Líneas</h2>

      <p-table [value]="current.lines()">
        <ng-template #header>
          <tr>
            <th>Producto</th>
            <th class="text-right">Cantidad</th>
            <th class="text-right">Precio unitario</th>
            <th class="text-right">Total</th>
          </tr>
        </ng-template>

        <ng-template #body let-line>
          <tr>
            <td>
              {{ lineName(line.productId, line.productName) }}
            </td>
            <td class="text-right">{{ line.quantity }}</td>
            <td class="text-right">
              {{ line.unitPrice | currency }}
            </td>
            <td class="text-right">
              {{ line.lineTotal | currency }}
            </td>
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td colspan="4">
              <app-empty-state
                icon="pi pi-list"
                title="Sin líneas en esta venta"
              />
            </td>
          </tr>
        </ng-template>
      </p-table>
    </section>
  } @else if (loading()) {
    <p-message severity="info" styleClass="w-full">
      Cargando la venta…
    </p-message>
  }
</div>
```

**Notas de plantilla:**

- Los importes usan el pipe `currency` (formato `$1,234.56`, locale `en-US` por defecto): es **presentación** de los valores que guardó el servidor, no un cálculo nuevo. `tax` hoy es siempre `0.00` en MovilCare; se muestra igual que los demás importes.
- `<app-status-tag [status]="current.status" />` es el componente compartido desde el ISS-03; el diálogo de confirmación ya está montado en `Shell` (`<p-confirm-dialog />`), por aquí solo se inyecta `ConfirmationService`.
- `sale-detail.css` queda con **solo el selector**, sin reglas.

### Evidencia

- Captura de la ruta `features/sales/sale-detail/` con sus tres archivos.
- Captura de `/ventas/{id}` con la cabecera, las cuatro tarjetas de importes y la tabla de líneas.
- Captura del diálogo de confirmación «Anular venta».

## 07.2. Líneas: `SaleDetailApi` y `sale-detail-list`

No se agrega ningún endpoint: las líneas salen de `GET /api/sales/` aplanadas, igual que la guía. Lo único que falta en MovilCare es el **número de venta** en cada fila, porque `SaleDetail` no lo trae.

**Cambio 1 - `features/sale-details/sale-detail-api.ts`**

```ts
// antes
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SaleDetail } from '../../core/models/sale-detail.model';
import { Sale } from '../../core/models/sale.model';
import { SaleApi } from '../sales/sale-api';

@Injectable({ providedIn: 'root' })
export class SaleDetailApi {
  private readonly sales = inject(SaleApi);

  list(): Observable<SaleDetail[]> {
    return this.sales.list().pipe(
      map((sales: Sale[]) =>
        sales.flatMap((sale) => sale.lines ?? []),
      ),
    );
  }

  bySale(saleId: number): Observable<SaleDetail[]> {
    return this.sales.get(saleId).pipe(
      map((sale) => sale.lines ?? []),
    );
  }
}

// después
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SaleDetail } from '../../core/models/sale-detail.model';
import { Sale } from '../../core/models/sale.model';
import { SaleApi } from '../sales/sale-api';

/** Línea aplanada: `SaleDetail` más el número de la venta que la contiene. */
export interface SaleDetailRow extends SaleDetail {
  saleId: number;
}

@Injectable({ providedIn: 'root' })
export class SaleDetailApi {
  private readonly sales = inject(SaleApi);

  list(): Observable<SaleDetailRow[]> {
    return this.sales.list().pipe(
      map((sales: Sale[]) =>
        sales.flatMap((sale) =>
          (sale.lines ?? []).map((item) => ({
            saleId: sale.id,
            ...item,
          })),
        ),
      ),
    );
  }

  bySale(saleId: number): Observable<SaleDetail[]> {
    return this.sales.get(saleId).pipe(
      map((sale) => sale.lines ?? []),
    );
  }
}
```

**Puntos clave:**

- `SaleDetailRow` es el equivalente a la fila que arma la guía con `{ saleId: sale.id, ...item }`: **el número de venta lo agrega el frontend al aplanar**, porque no viene en la API.
- `bySale()` **no cambia** (devuelve las líneas de una venta concreta); solo cambia la firma de `list()`.
- `SaleDetail` del modelo **no se modifica**: `saleId` vive en el tipo de fila, no en el modelo del backend.

**Generar el componente de la lista.**

```bash
ng generate component features/sale-details/sale-detail-list --skip-tests --defaults
```

**Componente `sale-detail-list.ts`**

```ts
import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { SaleDetailApi, SaleDetailRow } from '../sale-detail-api';

@Component({
  selector: 'app-sale-detail-list',
  imports: [
    CurrencyPipe,
    EmptyState,
    InputTextModule,
    MessageModule,
    PageHeader,
    RouterLink,
    TableModule,
    TagModule,
  ],
  templateUrl: './sale-detail-list.html',
  styleUrl: './sale-detail-list.css',
  host: {
    class: 'block',
  },
})
export class SaleDetailList {
  private readonly api = inject(SaleDetailApi);

  readonly rows = signal<SaleDetailRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');

  /** Búsqueda local por número de venta, nombre de producto o cantidad. */
  readonly filtered = computed(() =>
    filterRows(this.rows(), this.query(), (row) => [
      String(row.saleId),
      row.productName,
      String(row.quantity),
    ]),
  );

  /** Etiqueta del encabezado: unidades de todas las líneas. */
  readonly units = computed(() =>
    this.rows().reduce(
      (sum, row) => sum + row.quantity,
      0,
    ),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (error) => {
        this.rows.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }
}
```

**Plantilla `sale-detail-list.html`**

```html
<div class="space-y-6">
  <app-page-header
    title="Líneas de venta"
    subtitle="Todas las líneas de todas las ventas, enlazadas a su detalle."
  >
    <p-tag
      [value]="units() + ' unidades'"
      severity="info"
      [rounded]="true"
    />

    <input
      pInputText
      type="search"
      aria-label="Buscar línea"
      placeholder="Buscar por venta o producto…"
      class="w-56"
      [value]="query()"
      (input)="query.set($any($event.target).value)"
    />
  </app-page-header>

  @if (error()) {
    <p-message severity="error" styleClass="w-full">
      {{ error() }}
    </p-message>
  }

  <p-table
    [value]="filtered()"
    [loading]="loading()"
    [paginator]="filtered().length > 10"
    [rows]="10"
    [rowHover]="true"
  >
    <ng-template #header>
      <tr>
        <th>Venta</th>
        <th>Producto</th>
        <th class="text-right">Cantidad</th>
        <th class="text-right">Precio unitario</th>
        <th class="text-right">Total</th>
      </tr>
    </ng-template>

    <ng-template #body let-row>
      <tr>
        <td>
          <a
            [routerLink]="['/ventas', row.saleId]"
            class="font-medium text-blue-600 hover:underline"
          >
            #{{ row.saleId }}
          </a>
        </td>
        <td>
          {{ row.productName || 'Producto #' + row.productId }}
        </td>
        <td class="text-right">{{ row.quantity }}</td>
        <td class="text-right">{{ row.unitPrice | currency }}</td>
        <td class="text-right">{{ row.lineTotal | currency }}</td>
      </tr>
    </ng-template>

    <ng-template #emptymessage>
      <tr>
        <td colspan="5">
          <app-empty-state
            icon="pi pi-list"
            title="Sin líneas de venta"
            message="Registra una venta en «Ventas» o ajusta la búsqueda."
          />
        </td>
      </tr>
    </ng-template>
  </p-table>
</div>
```

**Puntos clave:**

- El enlace de cada fila (`/ventas/{saleId}`) **es** el enlace de vuelta al detalle que pide el objetivo de la guía.
- La búsqueda es **local** con `filterRows` (mismo utilitario que los ISS-03 a ISS-05): no dispara peticiones.
- La etiqueta «N unidades» suma `quantity` de **todas** las líneas (antes de filtrar), como en la guía.
- `sale-detail-list.css` queda con **solo el selector**, sin reglas.

### Evidencia

- Captura del cambio en `sale-detail-api.ts` con el tipo `SaleDetailRow`.
- Captura de `/detalle-ventas` con la tabla, la etiqueta de unidades y el buscador.
- Captura de un enlace `#id` apuntando a `/ventas/{id}`.

## 07.3. Panel: `dashboard`

**Generar el componente.**

```bash
ng generate component features/dashboard --skip-tests --defaults
```

El panel carga **cuatro** colecciones (la guía carga tres; en MovilCare las unidades activas hacen falta para el «stock bajo») y deriva de ellas cuatro cifras. Nada se guarda en el servidor: todo es `computed` sobre los `signal`.

**Función `sameDay` (día en hora local)**

Archivo nuevo: `src/app/features/dashboard/dashboard.ts` incluye esta función auxiliar (no necesita archivo aparte):

```ts
/**
 * ¿La venta cayó en el mismo día local (año, mes y día) que `reference`?
 * Se comparan los getters locales de Date: `new Date(iso)` convierte a la
 * hora del navegador antes de comparar.
 */
function sameDay(iso: string, reference: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}
```

**Componente `dashboard.ts`**

```ts
import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { Sale } from '../../../core/models/sale.model';
import { SerializedUnit } from '../../../core/models/serialized-unit.model';
import { toNumber } from '../../../core/models/api.model';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { CustomerApi } from '../customers/customer-api';
import { ProductApi } from '../products/product-api';
import { SaleApi } from '../sales/sale-api';
import { SerializedUnitApi } from '../serialized-units/serialized-unit-api';

/**
 * ¿La venta cayó en el mismo día local (año, mes y día) que `reference`?
 * `new Date(iso)` convierte a la hora del navegador antes de comparar.
 */
function sameDay(iso: string, reference: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

@Component({
  selector: 'app-dashboard',
  imports: [
    ButtonModule,
    CurrencyPipe,
    EmptyState,
    MessageModule,
    PageHeader,
    TableModule,
    TagModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  host: {
    class: 'block',
  },
})
export class Dashboard {
  private readonly salesApi = inject(SaleApi);
  private readonly productsApi = inject(ProductApi);
  private readonly customersApi = inject(CustomerApi);
  private readonly unitsApi = inject(SerializedUnitApi);

  readonly sales = signal<Sale[]>([]);
  readonly products = signal<Product[]>([]);
  readonly clients = signal<Customer[]>([]);
  readonly units = signal<SerializedUnit[]>([]);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      sales: this.salesApi.list(),
      products: this.productsApi.list(),
      clients: this.customersApi.list('active'),
      units: this.unitsApi.list('active'),
    }).subscribe({
      next: ({ sales, products, clients, units }) => {
        this.sales.set(sales);
        this.products.set(products);
        this.clients.set(clients);
        this.units.set(units);
        this.loading.set(false);
      },
      error: (error) => {
        this.sales.set([]);
        this.products.set([]);
        this.clients.set([]);
        this.units.set([]);
        this.error.set(toApiMessage(error));
        this.loading.set(false);
      },
    });
  }

  /** Ventas `active` cuya fecha cayó hoy (hora local). */
  readonly todaySales = computed(() => {
    const reference = new Date();

    return this.sales().filter(
      (sale) =>
        sale.status === 'active' &&
        sameDay(sale.saleDate, reference),
    );
  });

  /** Suma de los totales de `todaySales`, con `toNumber` (Money es string). */
  readonly todayTotal = computed(() =>
    this.todaySales().reduce(
      (sum, sale) => sum + toNumber(sale.total),
      0,
    ),
  );

  /** Unidades activas por producto. */
  private readonly stockByProduct = computed(() => {
    const stock = new Map<number, number>();

    for (const unit of this.units()) {
      stock.set(
        unit.productId,
        (stock.get(unit.productId) ?? 0) + 1,
      );
    }

    return stock;
  });

  /**
   * Adaptación de la guía (`quantity <= minStock`): MovilCare no tiene esas
   * columnas, así que «bajo el mínimo» es un producto `active` sin
   * unidades activas.
   */
  readonly lowStock = computed(() =>
    this.products().filter(
      (product) =>
        product.status === 'active' &&
        (this.stockByProduct().get(product.id) ?? 0) === 0,
    ),
  );
}
```

**Puntos clave:**

- **Cuatro `GET` en un solo `forkJoin`:** ventas (todas), productos (todos los estados), clientes `active` y unidades `active`. Si alguno falla, la pantalla muestra `toApiMessage`.
- `todaySales` filtra por `status === 'active'` **y** por día local; `todayTotal` suma solo ese arreglo con `toNumber` (el total llega como `Money = string`).
- `lowStock` es la adaptación del `quantity <= minStock` de la guía: **productos activos con cero unidades activas**. Un producto `inactive` queda fuera aunque no tenga unidades.
- La cuarta tarjeta es `clients().length` (el `GET` ya pidió solo `active`).
- «Recargar» vuelve a disparar los cuatro `GET` (`load()`), como en la guía.

**Plantilla `dashboard.html`**

```html
<div class="space-y-6">
  <app-page-header
    title="Panel"
    subtitle="Resumen del día en hora local."
  >
    <p-tag
      [value]="sales().length + ' ventas en total'"
      severity="info"
      [rounded]="true"
    />

    <button
      pButton
      type="button"
      severity="secondary"
      outlined
      [loading]="loading()"
      (click)="load()"
    >
      <i pButtonIcon class="pi pi-refresh"></i>
      <span pButtonLabel>Recargar</span>
    </button>
  </app-page-header>

  @if (error()) {
    <p-message severity="error" styleClass="w-full">
      {{ error() }}
    </p-message>
  }

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div class="rounded-lg border border-slate-100 p-4">
      <p class="text-sm text-slate-500">Ventas de hoy</p>
      <p class="text-2xl font-semibold">
        {{ todaySales().length }}
      </p>
    </div>

    <div class="rounded-lg border border-slate-100 p-4">
      <p class="text-sm text-slate-500">Total de hoy</p>
      <p class="text-2xl font-semibold">
        {{ todayTotal() | currency }}
      </p>
    </div>

    <div class="rounded-lg border border-slate-100 p-4">
      <p class="text-sm text-slate-500">Bajo el mínimo</p>
      <p class="text-2xl font-semibold">
        {{ lowStock().length }}
      </p>
    </div>

    <div class="rounded-lg border border-slate-100 p-4">
      <p class="text-sm text-slate-500">Clientes activos</p>
      <p class="text-2xl font-semibold">
        {{ clients().length }}
      </p>
    </div>
  </div>

  <section class="rounded-lg border border-slate-100 p-4">
    <h2 class="mb-3 font-semibold text-slate-900">
      Productos bajo el mínimo
    </h2>

    <p-table [value]="lowStock()" [loading]="loading()">
      <ng-template #header>
        <tr>
          <th>Producto</th>
          <th>SKU</th>
          <th>Existencias</th>
        </tr>
      </ng-template>

      <ng-template #body let-product>
        <tr>
          <td>{{ product.name }}</td>
          <td>{{ product.sku }}</td>
          <td>
            <p-tag
              severity="warn"
              value="Sin unidades activas"
              [rounded]="true"
            />
          </td>
        </tr>
      </ng-template>

      <ng-template #emptymessage>
        <tr>
          <td colspan="3">
            <app-empty-state
              icon="pi pi-box"
              title="Ningún producto activo está bajo el mínimo"
              message="Todos los productos activos tienen unidades disponibles."
            />
          </td>
        </tr>
      </ng-template>
    </p-table>
  </section>
</div>
```

**Notas de plantilla:**

- La columna «Existencias» siempre muestra «Sin unidades activas»: esa tabla **solo** contiene productos con cero unidades (la etiqueta es la misma del ISS-05).
- El mensaje vacío es el de la guía: «Ningún producto activo está bajo el mínimo».
- `dashboard.css` queda con **solo el selector**, sin reglas.

### Evidencia

- Captura de la ruta `features/dashboard/` con `sameDay` y los cuatro `computed`.
- Captura de `/dashboard` con las cuatro tarjetas y la etiqueta de ventas totales.
- Captura de la tabla «Productos bajo el mínimo» (con datos o con su mensaje vacío).
- Captura de la red con los cuatro `GET` del `forkJoin`.

## 07.4. Rutas y menú

**Configurar las rutas.** En `src/app/app.routes.ts` se reemplaza el placeholder que dejó el ISS-06 y se agregan las dos rutas nuevas:

```ts
// antes (estado después del ISS-06)
const provisional = () =>
  import('./features/placeholder/placeholder').then(
    (m) => m.Placeholder,
  );
...
{
  path: 'ventas/:id',
  title: 'Venta · MovilCare',
  loadComponent: provisional,
},

// después
{
  path: 'ventas/:id',
  title: 'Detalle de venta · MovilCare',
  loadComponent: () =>
    import('./features/sales/sale-detail/sale-detail')
      .then((m) => m.SaleDetail),
},
{
  path: 'detalle-ventas',
  title: 'Líneas de venta · MovilCare',
  loadComponent: () =>
    import('./features/sale-details/sale-detail-list/sale-detail-list')
      .then((m) => m.SaleDetailList),
},
{
  path: 'dashboard',
  title: 'Panel · MovilCare',
  loadComponent: () =>
    import('./features/dashboard/dashboard')
      .then((m) => m.Dashboard),
},
```

**Notas:**

- Al reemplazar `ventas/:id`, la constante `provisional` **queda sin uso**: bórrala del archivo (en MovilCare el comodín `**` redirige a `/clientes`, así que el placeholder ya no representa la intención de la guía). La carpeta `features/placeholder/` puedes eliminarla también **después de comprobar** que ningún archivo la referencia; no afecta al build si se queda.
- `{ path: '', pathMatch: 'full', redirectTo: 'clientes' }` **no se toca**: el inicio sigue entrando a `/clientes` dentro de `Shell`.
- `{ path: 'construir' }` **sigue fuera de `Shell`** y no llama a `/api` (se verifica en «Cómo probarlo»; en MovilCare ya era así, no se modifica).
- `{ path: '**', redirectTo: 'clientes' }` **no se toca** (en la guía va a `construir`; esa es una diferencia de MovilCare ya contemplada en la nota de adaptación).

**Configurar el menú.** En `src/app/layout/shell/shell.ts` la guía dice que «el menú ya está en `Shell.items`», pero en MovilCare `menuItems` solo tiene Clientes, Productos, Unidades serializadas y Ventas. Se agregan dos ítems:

```ts
// antes
readonly menuItems: MenuItem[] = [
  {
    label: 'Gestión',
    items: [
        {
          label: 'Clientes',
          icon: 'pi pi-users',
          routerLink: '/clientes',
        },
        {
          label: 'Productos',
          icon: 'pi pi-box',
          routerLink: '/productos',
        },
        {
          label: 'Unidades serializadas',
          icon: 'pi pi-barcode',
          routerLink: '/unidades-serializadas',
        },
        {
          label: 'Ventas',
          icon: 'pi pi-shopping-cart',
          routerLink: '/ventas',
        },
      ],
    },
  ];

// después
readonly menuItems: MenuItem[] = [
  {
    label: 'Gestión',
    items: [
        {
          label: 'Panel',
          icon: 'pi pi-home',
          routerLink: '/dashboard',
        },
        {
          label: 'Clientes',
          icon: 'pi pi-users',
          routerLink: '/clientes',
        },
        {
          label: 'Productos',
          icon: 'pi pi-box',
          routerLink: '/productos',
        },
        {
          label: 'Unidades serializadas',
          icon: 'pi pi-barcode',
          routerLink: '/unidades-serializadas',
        },
        {
          label: 'Ventas',
          icon: 'pi pi-shopping-cart',
          routerLink: '/ventas',
        },
        {
          label: 'Líneas de venta',
          icon: 'pi pi-list',
          routerLink: '/detalle-ventas',
        },
      ],
    },
  ];
```

Y se actualiza el mapa de títulos del encabezado (`pageTitle`), que hoy no conoce las rutas nuevas ni el detalle con id:

```ts
// antes
readonly pageTitle = computed(() => {
  const url = this.currentUrl()
    .split('?')[0]
    .replace(/\/+$/, '');

  const titles: Record<string, string> = {
    '/clientes': 'Clientes',
    '/productos': 'Productos',
    '/unidades-serializadas': 'Unidades serializadas',
    '/ventas': 'Ventas',
  };

  return titles[url] ?? 'MovilCare';
});

// después
readonly pageTitle = computed(() => {
  const url = this.currentUrl()
    .split('?')[0]
    .replace(/\/+$/, '');

  const titles: Record<string, string> = {
    '/dashboard': 'Panel',
    '/clientes': 'Clientes',
    '/productos': 'Productos',
    '/unidades-serializadas': 'Unidades serializadas',
    '/ventas': 'Ventas',
    '/detalle-ventas': 'Líneas de venta',
  };

  // `/ventas/61` no está en el mapa: se resuelve por prefijo.
  if (url.startsWith('/ventas/')) {
    return 'Detalle de venta';
  }

  return titles[url] ?? 'MovilCare';
});
```

**Notas:**

- «Panel» va primero en el menú (es la nueva portada de consulta) y «Líneas de venta» cierra la lista, junto a «Ventas».
- El `if (url.startsWith('/ventas/'))` evita que el detalle muestre el título genérico «MovilCare» en el encabezado del shell.
- `<p-toast />` y `<p-confirm-dialog />` ya están montados en `Shell` desde el ISS-03: no se toca `shell.html`.

### Evidencia

- Captura de `app.routes.ts` con las tres rutas cargando sus componentes.
- Captura del menú con los ítems «Panel» y «Líneas de venta».
- Captura del encabezado del shell mostrando «Detalle de venta» dentro de `/ventas/{id}`.

## 07.5. Pruebas

Como los componentes se generaron con `--skip-tests`, creo manualmente los archivos `*.spec.ts` junto a cada pieza:

- `src/app/features/sales/sale-api.spec.ts`
- `src/app/features/dashboard/dashboard.spec.ts`

Las pruebas se centran en dos aspectos:

1. Verificar que `SaleApi.get(60)` sea un `GET` a `/api/sales/60/` y que `voidSale(60)` sea un **`DELETE`** de esa misma URL (patrón HTTP testing de `customer-api.spec.ts`).
2. Verificar los cuatro `computed` del panel: de tres ventas, `todaySales` se queda con la activa de hoy; `todayTotal` suma solo esa; `lowStock` ignora el producto inactivo y el que tiene unidades; y la tarjeta de clientes cuenta el arreglo activo.

**`sale-api.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { SaleApi } from './sale-api';

describe('SaleApi', () => {
  let api: SaleApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(SaleApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should GET /api/sales/{id}/ for get()', () => {
    api.get(60).subscribe();
    http
      .expectOne(
        (request) =>
          request.method === 'GET' &&
          request.url === 'http://127.0.0.1:8000/api/sales/60/',
      )
      .flush({ id: 60 });
  });

  it('should DELETE /api/sales/{id}/ for voidSale()', () => {
    api.voidSale(60).subscribe();
    http
      .expectOne(
        (request) =>
          request.method === 'DELETE' &&
          request.url === 'http://127.0.0.1:8000/api/sales/60/',
      )
      .flush(null, {
        status: 204,
        statusText: 'No Content',
      });
  });
});
```

**`dashboard.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Dashboard } from './dashboard';
import { Customer } from '../../core/models/customer.model';
import { Product } from '../../core/models/product.model';
import { Sale } from '../../core/models/sale.model';
import { CustomerApi } from '../customers/customer-api';
import { ProductApi } from '../products/product-api';
import { SaleApi } from '../sales/sale-api';
import {
  toIsoWithOffset,
  toLocalInputValue,
} from '../sales/sale-date';
import { SerializedUnitApi } from '../serialized-units/serialized-unit-api';

function yesterday(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

const CUSTOMERS: Customer[] = [
  {
    id: 1,
    documentType: 'CC',
    documentNumber: '1098765432',
    name: 'Ana Torres',
    phone: '3001234567',
    email: 'ana@movilcare.test',
    status: 'active',
  },
  {
    id: 2,
    documentType: 'CC',
    documentNumber: '1087654321',
    name: 'Luis Ríos',
    phone: '3007654321',
    email: 'luis@movilcare.test',
    status: 'active',
  },
];

const SALE_TODAY: Sale = {
  id: 1,
  customerId: 1,
  customerName: 'Ana Torres',
  saleDate: toIsoWithOffset(toLocalInputValue()),
  subtotal: '150.00',
  tax: '0.00',
  discounts: '0.00',
  total: '150.00',
  status: 'active',
  lines: [],
};

const SALE_VOIDED_TODAY: Sale = {
  ...SALE_TODAY,
  id: 2,
  total: '999.00',
  status: 'inactive',
};

const SALE_OLD: Sale = {
  ...SALE_TODAY,
  id: 3,
  saleDate: toIsoWithOffset(toLocalInputValue(yesterday())),
  total: '777.00',
};

const PRODUCTS: Product[] = [
  {
    id: 10,
    sku: 'SKU-010',
    name: 'Producto inactivo sin unidades',
    description: null,
    price: '10.00',
    status: 'inactive',
  },
  {
    id: 11,
    sku: 'SKU-011',
    name: 'Producto con unidades',
    description: null,
    price: '20.00',
    status: 'active',
  },
  {
    id: 12,
    sku: 'SKU-012',
    name: 'Producto sin unidades',
    description: null,
    price: '30.00',
    status: 'active',
  },
];

const UNITS = [
  {
    id: 100,
    product: 11,
    productId: 11,
    productName: 'Producto con unidades',
    name: 'UNI-100',
    description: null,
    status: 'active' as const,
  },
];

async function setup() {
  const salesApi = {
    list: jasmine
      .createSpy('list')
      .and.returnValue(
        of([SALE_TODAY, SALE_VOIDED_TODAY, SALE_OLD]),
      ),
  };
  const productsApi = {
    list: jasmine.createSpy('list').and.returnValue(of(PRODUCTS)),
  };
  const customersApi = {
    list: jasmine
      .createSpy('list')
      .and.returnValue(of(CUSTOMERS)),
  };
  const unitsApi = {
    list: jasmine.createSpy('list').and.returnValue(of(UNITS)),
  };

  await TestBed.configureTestingModule({
    imports: [Dashboard],
    providers: [
      { provide: SaleApi, useValue: salesApi },
      { provide: ProductApi, useValue: productsApi },
      { provide: CustomerApi, useValue: customersApi },
      { provide: SerializedUnitApi, useValue: unitsApi },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Dashboard);
  await fixture.whenStable();

  return { fixture, salesApi, productsApi, customersApi, unitsApi };
}

it('should keep only the active sale of today', async () => {
  const { fixture } = await setup();

  const todaySales = fixture.componentInstance.todaySales();

  expect(todaySales.length).toBe(1);
  expect(todaySales[0].id).toBe(1);
  expect(fixture.componentInstance.todayTotal()).toBe(150);
});

it('should ignore inactive products and products with units in lowStock', async () => {
  const { fixture, customersApi } = await setup();

  const lowStockIds = fixture.componentInstance
    .lowStock()
    .map((product) => product.id);

  // El inactivo (10) se ignora aunque no tenga unidades; el 11 tiene
  // unidades; solo queda el 12, activo y sin unidades.
  expect(lowStockIds).toEqual([12]);

  // La tarjeta de clientes cuenta el arreglo activo.
  expect(fixture.componentInstance.clients().length).toBe(2);
  expect(customersApi.list).toHaveBeenCalledWith('active');
});
```

Los bloques omiten los imports de cada archivo y los tipos `Sale`, `Product`, `Customer` y los servicios falsos. La fecha «de hoy» se arma con `toIsoWithOffset(toLocalInputValue())` (el helper del ISS-06) para que funcione en cualquier zona horaria, y la de ayer restando un día.

Para ejecutar las pruebas, utilizo:

```bash
ng test --watch=false
```

También reviso que las pruebas existentes (las de `core/services`, `demo/ejemplo` y las de los ISS-03 a ISS-06) continúen funcionando.

### Evidencia

- Captura de la ejecución de las pruebas.
- Captura de los resultados de `sale-api.spec.ts` y `dashboard.spec.ts`.

## Cómo probarlo

Realiza las verificaciones funcionales en el siguiente orden (con el backend en la opción A de la nota de autenticación, salvo que se indique otro caso):

1. Desde `/ventas`, abre la venta registrada en el ISS-06 (clic en su número). En la pestaña Network verás `GET /api/sales/{id}/` y `GET /api/products/`; la cabecera muestra el total del servidor con el pipe `currency` y la línea, su precio unitario y su total, **sin recalcular**.
2. Comprueba la cabecera: número con fecha (`#id · dd/MM/yyyy HH:mm`), nombre del cliente, etiqueta «N unidades en M líneas» y el estado de la venta con `app-status-tag`.
3. Pulsa «Anular venta» y confirma. El `DELETE /api/sales/{id}/` responde `204`, el estado pasa a Inactivo, aparece el toast «Venta anulada», el botón **desaparece** y las unidades **no cambian** (MovilCare no tiene stock que reponer). Recarga la página: la venta sigue inactiva y sin botón.
4. Abre una venta que ya esté anulada (o repite el paso tras recargar): `voidSale()` no abre el diálogo ni dispara el `DELETE`; un segundo `DELETE` manual seguiría respondiendo `204` porque `void()` es idempotente.
5. Entra a `/detalle-ventas` desde el menú. La red muestra un solo `GET /api/sales/`; cada fila enlaza a `/ventas/{id}` (comprueba el `href`), la etiqueta del encabezado cuenta las unidades de **todas** las líneas y el buscador filtra localmente por número de venta o nombre de producto.
6. Entra a `/dashboard` desde el menú. La red muestra **cuatro** `GET`: `/api/sales/`, `/api/products/`, `/api/customers/?status=active` y `/api/serialized-units/?status=active`. Las cuatro tarjetas (Ventas de hoy, Total de hoy, Bajo el mínimo, Clientes activos) coinciden con esas respuestas y la etiqueta del encabezado dice «N ventas en total».
7. Revisa la tabla «Productos bajo el mínimo»: si hay productos activos sin unidades aparecen con la etiqueta «Sin unidades activas»; si no hay ninguno, se muestra «Ningún producto activo está bajo el mínimo». Registra una venta nueva con el último producto disponible y pulsa «Recargar»: los cuatro `GET` se repiten y el producto entra en la tabla.
8. Comprueba el día local: crea una venta con fecha de ayer y verifica que **no** suma en «Ventas de hoy» ni en «Total de hoy» (`sameDay` compara en hora local).
9. Visita `http://localhost:4200/`: termina en `/clientes` dentro de `app-shell`. Visita `/construir`: muestra el prototipo **sin** `app-shell` y con **0** peticiones a `/api` en la pestaña Network. Escribe `/ventas/999` en la barra de direcciones: el detalle muestra el mensaje de `toApiMessage` (con la opción C sería el `401`).
10. Ejecuta `ng test --watch=false` y `ng build`.

## Criterios de aceptación

| Código | Criterio | Resultado |
|---|---|---|
| AC-07-01 | El detalle muestra los importes guardados de `GET /api/sales/{id}/` (subtotal, impuesto, descuento, total y las líneas), pintados con `currency` y sin recalcular. | Pendiente de verificación |
| AC-07-02 | **Adaptada:** anular confirma, hace `DELETE`, deja la venta `inactive`, esconde el botón y **no cambia el stock** (MovilCare no lo tiene); un segundo `DELETE` sigue respondiendo `204` (idempotente). | Pendiente de verificación |
| AC-07-03 | `/detalle-ventas` lista las líneas aplanadas de `GET /api/sales/` con su `saleId` y cada fila enlaza a `/ventas/:id`. | Pendiente de verificación |
| AC-07-04 | **Adaptada:** el panel deriva de cuatro `GET` las ventas **activas** de hoy (día local), su total con `toNumber`, los productos activos **sin unidades activas** y los clientes activos. | Pendiente de verificación |
| AC-07-05 | `/` sigue entrando a `/clientes` dentro de `Shell` y el menú llega a las pantallas nuevas. | Pendiente de verificación |
| AC-07-06 | `/construir` queda fuera del shell y no llama a `/api`. | Pendiente de verificación |
| AC-07-07 | `ng test --watch=false` y `ng build` pasan, y los CSS de `sale-detail`, `sale-detail-list` y `dashboard` no tienen reglas. | Pendiente de verificación |

**Nota sobre las verificaciones:** las AC-07-01 a AC-07-04 requieren que el backend acepte las peticiones (opción A de la nota de autenticación; la opción B solo sirve para AC-07-03 y AC-07-04 porque el commit `722e18d` no tiene `GET/DELETE /api/sales/:id/`); con la opción C se captura el `401` como comportamiento esperado y esas AC quedan pendientes hasta el ISS-08/ISS-09 del frontend. Las AC-07-05 a AC-07-07 se pueden verificar en cualquier caso.

## Verificación del ISS

Antes de dar por finalizado el ISS-07, comprobaré cada criterio de aceptación y adjuntaré las capturas correspondientes (`image-115.png` en adelante). Con esta unidad se cierra **Fase I · Business** del frontend.

El incremento se considerará aprobado cuando todas las verificaciones hayan finalizado correctamente.

```text
Todos los criterios AC-07 aprobados → Fase I cerrada; avanzar al ISS-08.
Algún criterio AC-07 pendiente o fallido → corregir y repetir la prueba.
```
