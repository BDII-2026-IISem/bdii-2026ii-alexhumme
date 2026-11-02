# ISS-04. CRUD de unidades serializadas con Angular Signals

> **Nota de uso.** Este archivo es un borrador independiente de `proceso.md` para que la unidad del ISS-04 se pueda redactar mientras se desarrolla el ISS-03. Cuando el ISS-03 esté terminado, copia **todo** el contenido de este archivo y pégalo al final de `frontend-Angular/proceso.md` (justo después de la sección «Verificación del ISS» del ISS-03), desarrolla la unidad siguiendo los pasos en orden y, una vez pegado, borra este archivo para que no quede duplicado.
>
> **Evidencias:** las capturas de este ISS se numeran a partir de `image-85.png`, porque la serie `image-75` … `image-84` corresponde al ISS-03.

## Objetivo

Repetir el CRUD del ISS-03 con otra entidad del catálogo para fijar el patrón antes de la primera pantalla con relaciones encadenadas. La lista solo muestra unidades `active`, el formulario no pide estado y la baja es lógica (`DELETE` → 204, la fila queda `inactive`).

Reutilicé la estructura, los componentes compartidos (`PageHeader`, `EmptyState`, `StatusTag`), las utilidades `filterRows` y `toApiMessage`, el servicio `Notification` y el `<p-toast />` / `<p-confirm-dialog />` que se montaron en el shell durante el ISS-03: en esta unidad **no** se toca el layout.

## Nota de adaptación — la entidad: de tipos de producto a unidades serializadas (diferencia con la guía)

La guía original construye el CRUD de **tipos de producto** (`product_types`). MovilCare **no tiene tipos de producto**: el catálogo equivalente y disponible en el esquema es `serialized_units` (unidades serializadas), que es además lo que el menú y la ruta `/unidades-serializadas` ya esperan desde el ISS-02. Por eso este ISS se construye sobre esa entidad.

De hecho, el esquema de MovilCare sí llegó a tener `ProductType`: la migración `apps/product/migrations/0002_remove_product_product_type_remove_product_stock_and_more.py` elimina el modelo `ProductType` (y el campo `product_type` de `Product`) y crea en su lugar la tabla `serialized_units`. El catálogo que hoy vive en la base de datos —con sus restricciones de `status` y su relación con `product`— es el de unidades serializadas.

**Orden de construcción:** aunque las unidades dependen de los productos, este ISS **no** crea la pantalla de productos: el catálogo ya existe en el backend (app `product`) y el formulario solo lo consulta a través de `GET /api/products/available/`. La pantalla `/productos` llega en el ISS-05, siguiendo el orden de la guía; hasta entonces esa ruta conserva el placeholder.

| Guía (tipos de producto) | MovilCare (unidades serializadas) | Efecto en el código |
|---|---|---|
| `features/product-types` (`product-type-list`, `product-type-form`) | `features/serialized-units` (`serialized-unit-list`, `serialized-unit-form`) | mismos comandos `ng generate`, otra ruta |
| `GET /api/product-types/?status=active` | `GET /api/serialized-units/?status=active` | el parámetro `status` lo soporta `CatalogViewSet` del backend |
| entidad simple, **sin relaciones** | FK `product_id` **obligatorio** (el serializador lo exige) | el formulario añade un selector de productos |
| `name` de 2 a 100, **no** único | `name` de 2 a 150, **único** en la base de datos | validadores 2–150; la unicidad **no** se valida en el frontend: si se repite, el backend responde `400` y el toast muestra el mensaje devuelto por `toApiMessage` |
| `description` opcional, vacío → `null` | igual | igual |
| alta con `status: "active"`, edición sin `status`, baja `DELETE` 204 | igual (`StoreLabModel.status` nace `inactive` por defecto) | mismo patrón de `save()` del ISS-03 |
| ruta `/tipos-producto`, título `Tipos de producto · StoreLab` | ruta `/unidades-serializadas`, título `Unidades serializadas · MovilCare` | el título ya está en `app.routes.ts`; solo cambia `loadComponent` |
| ítem de menú ya en `Shell.items` | ítem ya en `menuItems` de `Shell` (`pi pi-barcode`) | no se crea `nav.config.ts` ni se toca el menú |
| `<p-toast />` y `<p-confirm-dialog />` por montar | **ya montados en el ISS-03** | no se toca `shell.ts` ni `shell.html` |

**Sobre el selector de producto:** se alimenta con `ProductApi.available()`, que llama a `GET /api/products/available/` y devuelve **solo productos activos**. Ese endpoint está declarado con `AllowAny` en el backend, así que el selector funciona en las opciones A y C de la nota de autenticación sin tener que abrir el catálogo de productos (la pantalla `/productos` sigue en el placeholder hasta el ISS-05). Si eliges la opción B (backend en el commit `e00936a`), ese endpoint todavía no existía: en ese caso usa `ProductApi.list('active')` en lugar de `available()`.

## Nota de adaptación — autenticación y permisos (diferencia con la guía)

La guía indica que este módulo se prueba contra el backend de Django en su estado de **ISS-09/ISS-10**, con el catálogo abierto, y avisa que contra un backend consolidado —ya con JWT— se verá `401` en el `p-message`: es el comportamiento correcto en esta fase.

En MovilCare el backend ya está consolidado: `SerializedUnitViewSet` y `ProductViewSet` heredan de `CatalogViewSet`, que define `permission_classes = [IsAuthenticated, HasResourceAccess]`, y la configuración de DRF establece `IsAuthenticated` como permiso por defecto. El frontend, en cambio, todavía no tiene login, interceptor ni guards, y no envía la cabecera `Authorization`. Por lo tanto, tal como está hoy, cualquier llamada a `http://127.0.0.1:8000/api/serialized-units/` responde `401` y la pantalla mostrará el mensaje de error en el `p-message`.

Para verificar el CRUD completo durante este ISS, elegí una de estas opciones (las tres son válidas):

| Opción | Procedimiento | Resultado |
|---|---|---|
| **A (recomendada)** | Cambio **temporal y local** en `apps/product/views.py`: importar `AllowAny` y dejar `permission_classes = [AllowAny]` en `CatalogViewSet` (el permiso de la vista sustituye al de la configuración y cubre `ProductViewSet` y `SerializedUnitViewSet`). Después de tomar las evidencias, restauro el archivo con `git restore app-movilcare/backend/apps/product/views.py`. **Este cambio no se commitea.** | El CRUD completo funciona contra el contrato actual del backend (JSON en camelCase, sin paginación) y el selector de productos se carga igual, porque `/products/available/` ya es `AllowAny`. |
| **B** | Ejecutar el backend en el commit `e00936a` («ISS 9 y 10»), donde `CatalogViewSet` tenía `permission_classes = [AllowAny]` y DRF permitía peticiones anónimas: es el «estado de catálogo abierto» que menciona la guía. Uso un worktree temporal (`git worktree add <ruta> e00936a`) copiando el `.env` del backend y conservando la base de datos actual. **Advertencia:** en ese commit aún no existe `GET /api/products/available/`, así que el selector debe alimentarse con `ProductApi.list('active')`. | Igual que la opción A, probando el backend en su estado histórico, con ese ajuste en el formulario. |
| **C** | No modificar el backend y capturar el `401` como comportamiento esperado de esta fase. | Las AC que requieren datos reales (AC-04-01 a AC-04-06) se completan al finalizar el ISS-08/ISS-09 del frontend, cuando exista autenticación. El selector de productos sí se carga, porque `/products/available/` no exige sesión. |

`ng test` y `ng build` no dependen del backend y se ejecutan igual en las tres opciones. Las capturas de las secciones siguientes que requieren datos del backend asumen la opción **A** (o **B**).

## 04.1. Generar los dos componentes

Primero verifiqué que no existieran ya componentes duplicados en la feature:

```bash
ls src/app/features/serialized-units
```

Después generé los componentes `SerializedUnitList` y `SerializedUnitForm`, encargados de mostrar la lista de unidades y gestionar el formulario de creación y edición:

```bash
ng generate component features/serialized-units/serialized-unit-list --skip-tests --defaults
ng generate component features/serialized-units/serialized-unit-form --skip-tests --defaults
```

Los componentes se crearon *standalone*, como en el ISS-03, y los archivos CSS quedaron **sin reglas** (solo el selector), igual que en la unidad anterior.

La estructura resultante fue:

```text
src/app/features/serialized-units/
├── serialized-unit-api.ts
├── serialized-unit-list/
│   ├── serialized-unit-list.ts
│   ├── serialized-unit-list.html
│   └── serialized-unit-list.css
└── serialized-unit-form/
    ├── serialized-unit-form.ts
    ├── serialized-unit-form.html
    └── serialized-unit-form.css
```

Conservé el servicio `serialized-unit-api.ts` existente (creado en el ISS-02) para centralizar las peticiones al backend. Los componentes se generaron con `--skip-tests`; los archivos de pruebas se crean manualmente en la sección 04.10.

### Evidencia

- Captura de `ls src/app/features/serialized-units`.
- Captura de la salida de los dos comandos `ng generate component`.
- Captura de la estructura resultante del explorador de archivos.

## 04.2. Recorrido por incrementos

Desarrollé el CRUD de manera incremental para comprobar el funcionamiento de cada parte antes de continuar con la siguiente:

| Incremento | Implementación | Verificación |
|---|---|---|
| 1 | Lista con datos locales mediante `signal()` | Comprobé la visualización de registros de prueba. |
| 2 | Tabla con PrimeNG | Comprobé la presentación de filas y encabezados. |
| 3 | Consulta mediante `SerializedUnitApi.list('active')` | Verifiqué la respuesta de la API. |
| 4 | Búsqueda con `computed()` | Comprobé el filtrado local. |
| 5 | Formulario reactivo con selector de producto | Verifiqué las validaciones. |
| 6 | Creación de unidades mediante `POST` | Comprobé el registro de nuevas unidades. |
| 7 | Edición mediante `PATCH` | Comprobé la actualización de los datos. |
| 8 | Baja mediante `DELETE` | Verifiqué la respuesta del servidor y el estado de la unidad. |

Este procedimiento me permitió identificar los errores por etapas y conservar el funcionamiento de los componentes que ya estaban implementados.

### Evidencia

- Captura de la lista con datos locales antes de conectar la API.

## 04.3. Modelo y servicio de unidades serializadas

Revisé el modelo `SerializedUnit` y el servicio `SerializedUnitApi` existentes (creados en el ISS-02) para adaptarlos al contrato real de la API de MovilCare.

El modelo representa la información que recibe el frontend desde Django REST Framework. `product`, `name`, `description` y `status` son los campos escribibles; `productId` y `productName` los calcula el backend a partir de la relación (son de solo lectura, igual que `id`, `createdAt` y `updatedAt`). El JSON viaja en camelCase gracias al renderizador y al parser de DRF.

Archivo:

`src/app/core/models/serialized-unit.model.ts`

```typescript
import { Status, Timestamps } from './api.model';

export interface SerializedUnit extends Timestamps {
  id: number;
  product: number;
  productId: number;
  productName: string;
  name: string;
  description: string | null;
  status: Status;
}

export type SerializedUnitPayload = Omit<
  SerializedUnit,
  'id' | 'productId' | 'productName' | 'createdAt' | 'updatedAt'
>;
```

**Cambio respecto del archivo actual:** el tipo de escritura era `Pick<SerializedUnit, 'product' | 'name' | 'description'>`, que no incluía `status`; con él, `create({...payload, status: 'active'})` no compilaba. Ahora el payload se define con `Omit`, igual que `CustomerPayload` del ISS-03: incluye `status`, y el formulario igualmente emite `Omit<SerializedUnitPayload, 'status'>`, porque ese valor lo decide la lista.

A continuación revisé el servicio, que centraliza las operaciones HTTP y utiliza la URL base configurada en `environment.apiUrl` (`http://127.0.0.1:8000/api`, sin barra final; cada método añade la suya):

`src/app/features/serialized-units/serialized-unit-api.ts`

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Status } from '../../core/models/api.model';
import {
  SerializedUnit,
  SerializedUnitPayload,
} from '../../core/models/serialized-unit.model';

@Injectable({ providedIn: 'root' })
export class SerializedUnitApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/serialized-units`;

  list(status?: Status): Observable<SerializedUnit[]> {
    return this.http.get<SerializedUnit[]>(`${this.base}/`, {
      params: status ? { status } : undefined,
    });
  }

  get(id: number): Observable<SerializedUnit> {
    return this.http.get<SerializedUnit>(`${this.base}/${id}/`);
  }

  create(payload: SerializedUnitPayload): Observable<SerializedUnit> {
    return this.http.post<SerializedUnit>(`${this.base}/`, payload);
  }

  update(
    id: number,
    payload: Partial<SerializedUnitPayload>,
  ): Observable<SerializedUnit> {
    return this.http.patch<SerializedUnit>(
      `${this.base}/${id}/`,
      payload,
    );
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }
}
```

**Cambio respecto del archivo actual:** solo `list()` gana el parámetro opcional `status` (y su import de `Status`). El resto del servicio queda intacto, incluido `get(id)`, que se usa en la comprobación de la baja.

**Cómo se divide el estado:**

- `list('active')` → `GET /api/serialized-units/?status=active`: arreglo plano, sin envoltura JSON y sin paginación; el filtro de estado lo aplica `CatalogViewSet` en el backend.
- `create()` → `POST /api/serialized-units/` con `SerializedUnitPayload` completo, incluido `status`. Sin `status` el registro nace `inactive` y no aparecería en la lista.
- `update()` → `PATCH /api/serialized-units/{id}/` con un cuerpo parcial: la edición **no** envía `status`.
- `remove()` → `DELETE /api/serialized-units/{id}/`: baja lógica; `perform_destroy` guarda `status = "inactive"` y responde `204`.
- El selector de productos usa `ProductApi.available()` → `GET /api/products/available/`, que devuelve solo productos activos y **no** cambia en este ISS.

`SerializedUnitPayload` incluye `status` porque el backend lo usa en el alta, pero el formulario no lo pide: el formulario emite `Omit<SerializedUnitPayload, 'status'>` y `SerializedUnitList` agrega `status: 'active'` solo cuando crea un registro, siguiendo el patrón de la guía y del ISS-03.

**Nota:** el backend exige `product_id` (acepta también `product`, que es la forma que usa el frontend) y `name` entre 2 y 150 caracteres. La unicidad de `name` la valida Django con un `400`; el mensaje llega al toast a través de `toApiMessage`, que recorre el cuerpo del error y devuelve el primer campo con su mensaje (`name: ...`).

### Evidencia

- Captura del archivo `serialized-unit.model.ts`.
- Captura del archivo `serialized-unit-api.ts`.
- Captura de la respuesta JSON de `GET /api/serialized-units/?status=active` (opción A o B) o del `401` (opción C).

## 04.4. Filtro local reutilizable

No creé nada nuevo: reutilicé `filterRows`, creada en el ISS-02 y documentada en la sección 03.4, en `src/app/core/utils/filter-rows.ts`.

```typescript
export function filterRows<T>(
  rows: readonly T[],
  query: string,
  pick: (
    row: T,
  ) => Array<string | number | null | undefined>,
): T[]
```

La función normaliza el texto de búsqueda, admite valores nulos y devuelve los registros que coinciden con el término introducido.

Reutilicé esta función desde el componente de lista para buscar unidades por nombre, producto o descripción (`name`, `productName` y `description`).

### Evidencia

- Captura de `src/app/core/utils/filter-rows.ts` sin cambios respecto del ISS-03.

## 04.5. Componente `SerializedUnitList`: gestión del estado

Configuré el componente `SerializedUnitList` para administrar los registros, los estados de carga, los errores, el buscador y el diálogo del formulario. Es la misma estructura de signals, `computed()` y suscripciones que `CustomerList`, con dos diferencias: `load()` pide `list('active')` y `save()` recibe un cuerpo sin `status`.

Archivo:

`src/app/features/serialized-units/serialized-unit-list/serialized-unit-list.ts`

```typescript
import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  SerializedUnit,
  SerializedUnitPayload,
} from '../../../core/models/serialized-unit.model';

import { Notification } from '../../../core/services/notification';
import { filterRows } from '../../../core/utils/filter-rows';
import { toApiMessage } from '../../../core/utils/to-api-message';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';
import { SerializedUnitApi } from '../serialized-unit-api';
import { SerializedUnitForm } from '../serialized-unit-form/serialized-unit-form';

@Component({
  selector: 'app-serialized-unit-list',
  imports: [
    ButtonModule,
    DialogModule,
    EmptyState,
    InputTextModule,
    MessageModule,
    PageHeader,
    StatusTag,
    TableModule,
    TagModule,
    TooltipModule,
    SerializedUnitForm,
  ],
  templateUrl: './serialized-unit-list.html',
  styleUrl: './serialized-unit-list.css',
  host: {
    class: 'block',
  },
})
export class SerializedUnitList {
  private readonly api = inject(SerializedUnitApi);
  private readonly notify = inject(Notification);
  private readonly confirmation = inject(ConfirmationService);

  readonly rows = signal<SerializedUnit[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly filter = signal('');
  readonly dialogVisible = signal(false);
  readonly editing = signal<SerializedUnit | null>(null);
  readonly resetKey = signal(0);

  readonly visibleRows = computed(() =>
    filterRows(
      this.rows(),
      this.filter(),
      (unit) => [
        unit.name,
        unit.productName,
        unit.description,
      ],
    ),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list('active').subscribe({
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

  openCreate(): void {
    this.editing.set(null);
    this.resetKey.update((key) => key + 1);
    this.dialogVisible.set(true);
  }

  openEdit(unit: SerializedUnit): void {
    this.editing.set(unit);
    this.resetKey.update((key) => key + 1);
    this.dialogVisible.set(true);
  }

  save(payload: Omit<SerializedUnitPayload, 'status'>): void {
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
          current ? 'Unidad actualizada' : 'Unidad creada',
        );
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.notify.error(toApiMessage(error));
      },
    });
  }

  remove(unit: SerializedUnit): void {
    this.confirmation.confirm({
      header: 'Dar de baja',
      message: `¿Deseas dar de baja a ${unit.name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',

      accept: () => {
        this.api.remove(unit.id).subscribe({
          next: () => {
            this.notify.warn('Unidad dada de baja');
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

El componente concentra las operaciones del CRUD, mientras que el formulario se encarga de validar y emitir los datos. El fallo de **carga** se muestra en el `p-message` persistente de la plantilla; los fallos de **operación** (guardar o dar de baja), el error de unicidad del nombre y los mensajes de éxito van al toast.

`load()` llama a `list('active')`, de modo que las unidades dadas de baja desaparecen de la tabla sin ningún filtro adicional en el frontend, tal como indica la guía.

**Nota (guía):** la guía denomina `deactivate()` a este método; aquí se mantiene `remove()` por coherencia con `CustomerList` del ISS-03.

**Nota (layout):** `<p-toast />` y `<p-confirm-dialog />` ya están montados en `shell.html` desde el ISS-03 y `MessageService`/`ConfirmationService` ya están registrados en `app.config.ts`, por lo que en esta unidad **no** hizo falta tocar el shell ni los proveedores.

### Evidencia

- Captura del archivo `serialized-unit-list.ts`.

## 04.6. Plantilla de la lista de unidades serializadas

Construí la interfaz de la lista utilizando `p-table` de PrimeNG y las clases de Tailwind CSS, reutilizando los componentes compartidos del ISS-02.

La plantilla incluye el encabezado de la página (`PageHeader` con el contador de registros y el botón de alta), el mensaje de error, el buscador, la tabla de resultados (con la columna **Producto**, que muestra el nombre del producto dueño de la unidad), la etiqueta de estado (`StatusTag`), el estado vacío (`EmptyState`) y el diálogo con el formulario.

Archivo:

`src/app/features/serialized-units/serialized-unit-list/serialized-unit-list.html`

```html
<div class="space-y-6">
  <app-page-header
    title="Unidades serializadas"
    subtitle="Consulta y administra las unidades serializadas registradas."
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
      <span pButtonLabel>Nueva unidad</span>
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
      <input
        pInputText
        type="search"
        class="w-full"
        aria-label="Buscar unidades"
        placeholder="Buscar por nombre, producto o descripción..."
        [value]="filter()"
        (input)="filter.set($any($event.target).value)"
      />
    </ng-template>

    <ng-template #header>
      <tr>
        <th>Nombre</th>
        <th>Producto</th>
        <th>Descripción</th>
        <th>Estado</th>
        <th class="text-right">Acciones</th>
      </tr>
    </ng-template>

    <ng-template #body let-unit>
      <tr>
        <td>{{ unit.name }}</td>
        <td>{{ unit.productName }}</td>
        <td>{{ unit.description || '—' }}</td>

        <td>
          <app-status-tag [status]="unit.status" />
        </td>

        <td class="text-right">
          <button
            pButton
            type="button"
            text
            rounded
            severity="secondary"
            aria-label="Editar unidad"
            pTooltip="Editar"
            (click)="openEdit(unit)"
          >
            <i pButtonIcon class="pi pi-pencil"></i>
          </button>

          <button
            pButton
            type="button"
            text
            rounded
            severity="danger"
            aria-label="Dar de baja a la unidad"
            pTooltip="Dar de baja"
            [disabled]="unit.status === 'inactive'"
            (click)="remove(unit)"
          >
            <i pButtonIcon class="pi pi-trash"></i>
          </button>
        </td>
      </tr>
    </ng-template>

    <ng-template #emptymessage>
      <tr>
        <td colspan="5">
          @if (filter()) {
            <app-empty-state
              icon="pi pi-search"
              title="Sin coincidencias"
              message="Ninguna unidad coincide. Borra el filtro para ver todas."
            />
          } @else {
            <app-empty-state
              icon="pi pi-barcode"
              title="Sin unidades registradas"
              message="Registra la primera unidad con el botón «Nueva unidad»."
            />
          }
        </td>
      </tr>
    </ng-template>
  </p-table>

  <p-dialog
    [visible]="dialogVisible()"
    (visibleChange)="dialogVisible.set($event)"
    [header]="editing() ? 'Editar unidad' : 'Nueva unidad'"
    [modal]="true"
    [draggable]="false"
    [resizable]="false"
    styleClass="w-full max-w-2xl mx-4"
  >
    <app-serialized-unit-form
      [unit]="editing()"
      [saving]="saving()"
      [resetKey]="resetKey()"
      (saved)="save($event)"
      (cancelled)="dialogVisible.set(false)"
    />
  </p-dialog>
</div>
```

La plantilla presenta los resultados de `visibleRows()` con las columnas nombre, producto, descripción, estado y acciones, y distingue entre una lista vacía y una búsqueda sin coincidencias mediante `EmptyState`. También deshabilita la acción de baja para las unidades que ya están inactivas.

**Nota (PrimeNG 22):** las plantillas de `p-table` usan las variables `#caption`, `#header`, `#body` y `#emptymessage`. Con la sintaxis antigua `pTemplate="body"` la compilación pasa, pero la tabla se pinta vacía sin ningún error.

### Evidencia

- Captura del archivo `serialized-unit-list.html`.
- Captura de la lista renderizada con las cinco columnas.

## 04.7. Componente `SerializedUnitForm` con `input()` y `output()`

Implementé un único formulario para registrar y editar unidades, con el selector de producto como diferencia respecto del formulario de clientes.

Utilicé `input()` para recibir la unidad seleccionada, la clave de reinicio y el estado de guardado. Utilicé `output()` para emitir los datos validados y comunicar la cancelación.

**Adaptación al modelo de MovilCare:** la guía trabaja con un formulario de dos campos (`name` y `description`) porque su entidad no tiene relaciones. Aquí el serializador exige el producto, así que el formulario añade un `p-select` con los productos activos. Además, `name` admite entre 2 y 150 caracteres (no 100) y el backend rechaza los nombres repetidos: el formulario **no** comprueba unicidad, solo muestra el mensaje que devuelva el servidor.

El `effect` lee `resetKey()` y luego `unit()`: al abrir el diálogo el padre sube la clave y el formulario se reinicia, aunque `p-dialog` deje el contenido montado.

Archivo:

`src/app/features/serialized-units/serialized-unit-form/serialized-unit-form.ts`

```typescript
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
```

El formulario se reinicia al abrirse y carga los datos cuando recibe una unidad para editar. Cuando se envía, valida los campos, normaliza los valores (recorta el texto y convierte la descripción vacía en `null`) y emite el resultado mediante `saved`, sin `status`: ese valor lo decide `SerializedUnitList`.

El componente no realiza peticiones de escritura: solo consulta el catálogo de productos activos para poblar el selector. La selección entre creación y edición queda a cargo de `SerializedUnitList`.

**Nota:** `ProductApi.available()` ya existía desde el ISS-02 y llama a `GET /api/products/available/`, que el backend declara con `AllowAny`; por eso el selector se carga incluso con el backend consolidado.

### Evidencia

- Captura del archivo `serialized-unit-form.ts`.

## 04.8. Plantilla del formulario

Construí la plantilla del formulario con controles reactivos y componentes de PrimeNG. La plantilla refleja los tres controles del formulario: producto, nombre y descripción.

Archivo:

`src/app/features/serialized-units/serialized-unit-form/serialized-unit-form.html`

```html
<form
  [formGroup]="form"
  (ngSubmit)="submit()"
  class="grid gap-4"
>
  <div class="flex flex-col gap-2">
    <label for="unit-product">
      Producto <span class="text-red-500">*</span>
    </label>

    <p-select
      inputId="unit-product"
      ariaLabel="Producto"
      formControlName="product"
      [options]="productOptions()"
      optionLabel="name"
      optionValue="id"
      placeholder="Selecciona un producto"
      [filter]="true"
      class="w-full"
    />

    @if (
      form.controls.product.touched &&
      form.controls.product.invalid
    ) {
      <p-message
        severity="error"
        size="small"
        variant="simple"
      >
        Selecciona el producto al que pertenece la unidad.
      </p-message>
    }

    @if (productsLoaded() && productOptions().length === 0) {
      <p-message
        severity="warn"
        size="small"
        variant="simple"
      >
        No hay productos activos: registra un producto antes de crear una unidad.
      </p-message>
    }
  </div>

  <div class="flex flex-col gap-2">
    <label for="unit-name">
      Nombre <span class="text-red-500">*</span>
    </label>

    <input
      id="unit-name"
      pInputText
      formControlName="name"
      class="w-full"
      placeholder="Nombre de la unidad"
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
        El nombre es obligatorio y debe tener entre 2 y 150 caracteres.
      </p-message>
    }
  </div>

  <div class="flex flex-col gap-2">
    <label for="unit-description">Descripción</label>

    <textarea
      id="unit-description"
      pTextarea
      formControlName="description"
      rows="3"
      class="w-full"
      placeholder="Descripción de la unidad (opcional)"
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
      [disabled]="saving() || productOptions().length === 0"
    >
      <i pButtonIcon class="pi pi-check"></i>
      <span pButtonLabel>Guardar</span>
    </button>
  </div>
</form>
```

El formulario presenta los mensajes de validación cuando los controles han sido tocados y contienen datos inválidos. El botón de guardado se deshabilita mientras se guarda **o** cuando no hay ningún producto disponible (si la petición de productos falló, no se muestra el aviso: ese error ya lo comunica la lista). Además, el botón refleja el estado de la operación para evitar envíos repetidos.

### Evidencia

- Captura del formulario de creación.
- Captura de los mensajes de validación (sin producto y con nombre corto).
- Captura del formulario de edición con el producto precargado.

## 04.9. Configurar la ruta y el menú

Integré el componente `SerializedUnitList` en la ruta `/unidades-serializadas`, sustituyendo el componente provisional que se utilizaba desde el ISS-02.

En `src/app/app.routes.ts` conservé la estructura de rutas existente y solo cambié la carga del componente (el título `Unidades serializadas · MovilCare` ya estaba definido):

```typescript
{
  path: 'unidades-serializadas',
  title: 'Unidades serializadas · MovilCare',
  loadComponent: () =>
    import('./features/serialized-units/serialized-unit-list/serialized-unit-list')
      .then((module) => module.SerializedUnitList),
}
```

**Importante:** conservé la constante `provisional`, porque las rutas `/productos` y `/ventas` siguen usando el placeholder hasta el ISS-05 y el ISS-06.

También conservé la opción de unidades serializadas en el menú lateral, que ya existía desde el ISS-02. La lista vive en la propiedad `menuItems` de `Shell`, `shell.html` la pasa al `Aside` mediante `[items]="menuItems"` y el `Aside` la recibe a través de su input `items`. La opción correspondiente es:

```typescript
{
  label: 'Unidades serializadas',
  icon: 'pi pi-barcode',
  routerLink: '/unidades-serializadas',
}
```

De esta forma, el usuario puede acceder al CRUD desde el menú lateral y la navegación continúa utilizando el layout existente de MovilCare.

### Evidencia

- Captura de la configuración de `app.routes.ts`.
- Captura de la opción de unidades serializadas en el menú lateral.
- Captura del CRUD abierto en `/unidades-serializadas` dentro del layout de MovilCare.

## 04.10. Pruebas

Preparé las pruebas para comprobar las operaciones principales del CRUD y el comportamiento de los componentes. Como los componentes se generaron con `--skip-tests`, creé manualmente los archivos `*.spec.ts` junto a cada pieza:

- `src/app/features/serialized-units/serialized-unit-api.spec.ts`
- `src/app/features/serialized-units/serialized-unit-list/serialized-unit-list.spec.ts`
- `src/app/features/serialized-units/serialized-unit-form/serialized-unit-form.spec.ts`

Las pruebas se centraron en tres aspectos:

1. Verificar que `SerializedUnitApi` construya la URL con barra final y que `list('active')` envíe el parámetro `status=active`.
2. Verificar que `SerializedUnitList` pida solo unidades activas y muestre las filas recibidas del servicio.
3. Verificar que `SerializedUnitForm` emita los datos normalizados (nombre recortado y descripción vacía en `null`) y no envíe información inválida.

```typescript
// serialized-unit-api.spec.ts: la URL lleva barra final y el filtro de estado
it('should call /api/serialized-units/?status=active', () => {
  api.list('active').subscribe();

  http
    .expectOne(
      'http://127.0.0.1:8000/api/serialized-units/?status=active',
    )
    .flush([]);

  api.list().subscribe();
  http
    .expectOne('http://127.0.0.1:8000/api/serialized-units/')
    .flush([]);

  api.remove(1).subscribe();
  http
    .expectOne('http://127.0.0.1:8000/api/serialized-units/1/')
    .flush(null, { status: 204, statusText: 'No Content' });
});
```

```typescript
// serialized-unit-list.spec.ts: pide solo activos y pinta una fila por unidad
const UNIT: SerializedUnit = {
  id: 1,
  product: 3,
  productId: 3,
  productName: 'Tornillo 8mm',
  name: 'UNI-0001',
  description: 'Unidad de prueba',
  status: 'active',
};

it('should request active units and render one row', async () => {
  const api = {
    list: jasmine.createSpy('list').and.returnValue(of([UNIT])),
  };

  await TestBed.configureTestingModule({
    imports: [SerializedUnitList],
    providers: [
      ConfirmationService,
      { provide: SerializedUnitApi, useValue: api },
      {
        provide: ProductApi,
        useValue: { available: () => of([]) },
      },
      {
        provide: Notification,
        useValue: { success() {}, warn() {}, error() {} },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SerializedUnitList);
  await fixture.whenStable();

  const element = fixture.nativeElement as HTMLElement;

  expect(api.list).toHaveBeenCalledWith('active');
  expect(element.querySelectorAll('tbody tr').length).toBe(1);
  expect(element.textContent).toContain('Tornillo 8mm');
});
```

```typescript
// serialized-unit-form.spec.ts: emite `saved` con el cuerpo normalizado
it('should emit saved with the trimmed body', async () => {
  await TestBed.configureTestingModule({
    imports: [SerializedUnitForm],
    providers: [
      {
        provide: ProductApi,
        useValue: { available: () => of([]) },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SerializedUnitForm);
  await fixture.whenStable();

  let body: Omit<SerializedUnitPayload, 'status'> | undefined;
  fixture.componentInstance.saved.subscribe(
    (payload) => (body = payload),
  );

  fixture.componentInstance.form.setValue({
    product: 3,
    name: ' UNI-0001 ',
    description: '  ',
  });
  fixture.componentInstance.submit();

  expect(body).toEqual({
    product: 3,
    name: 'UNI-0001',
    description: null,
  });
});
```

Los bloques omiten los imports de cada archivo, el `beforeEach` con `provideHttpClientTesting()` y el `afterEach(() => http.verify())` necesarios en el spec del servicio, y el `ProductApi` falso (`available()` → `of([])`) que alimenta el selector en los specs de la lista y del formulario. La URL `http://127.0.0.1:8000/api/serialized-units/` proviene de `environment.apiUrl`, igual en los entornos `production` y `development`.

**Nota sobre el selector:** el spec del formulario deja el `ProductApi` falso devolviendo `of([])`, así que `productOptions()` queda sin opciones y el botón quedaría deshabilitado en la interfaz, aunque `submit()` —llamado directamente en la prueba— sí emite el cuerpo. Para cubrir también el selector, cambia el falso a `of([{ id: 3, ... }])` y comprueba que `p-select` pinta las opciones.

Para ejecutar las pruebas, utilicé:

```bash
ng test --watch=false
```

También revisé que las pruebas existentes (`core/services/notification.spec.ts`, `demo/ejemplo/ejemplo.spec.ts` y las tres del ISS-03) continuaran funcionando.

Cuando la API devuelve una colección vacía, la tabla debe presentar el estado vacío. Cuando la petición falla, debe mostrar el mensaje de error correspondiente.

### Evidencia

- Captura de la ejecución de las pruebas.
- Captura del resultado de las pruebas del servicio, de la lista y del formulario.

## 04.11. Arranque y verificación del CRUD

Inicié el servidor de desarrollo de Angular mediante:

```bash
ng serve
```

Después abrí la siguiente dirección en el navegador:

```text
http://localhost:4200/unidades-serializadas
```

Verifiqué que la pantalla de unidades se integrara con el `Header`, el `Aside` y el `Footer` existentes, manteniendo el comportamiento responsive del layout.

Comprobé el funcionamiento de las operaciones:

- Consultar las unidades activas registradas.
- Buscar unidades por nombre, producto o descripción.
- Abrir el formulario de creación y comprobar que el selector trae los productos activos.
- Validar los datos antes de guardarlos (producto obligatorio y nombre de 2 a 150 caracteres).
- Editar una unidad existente.
- Dar de baja una unidad y comprobar el resultado.

**Nota:** si el backend sigue exigiendo JWT (opción C de la nota de autenticación), la lista mostrará el mensaje de `401` en el `p-message` en lugar de los registros; ese es el comportamiento esperado en esta fase. Con las opciones A o B, las comprobaciones anteriores se realizan contra datos reales.

Finalmente ejecuté la compilación de producción:

```bash
ng build
```

La compilación se considera satisfactoria cuando finaliza con código de salida `0` y no presenta errores (se conserva el aviso de presupuesto del bundle inicial, que ya existía desde el ISS-03).

### Evidencia

- Captura de la pantalla de unidades funcionando.
- Captura de una búsqueda realizada.
- Captura del formulario de creación y edición.
- Captura de la operación de baja.
- Captura de `ng build` finalizado correctamente.

## Cómo probarlo

Realicé las verificaciones funcionales en el siguiente orden:

1. Consulté la lista de unidades y comprobé en la pestaña Network que `GET /api/serialized-units/?status=active` devuelve un arreglo plano en camelCase, sin envoltura (con el backend consolidado sin cambios, este paso muestra el `401` descrito en la nota de autenticación).
2. Busqué una unidad por nombre y por nombre de producto y verifiqué que la tabla se filtrara sin generar nuevas peticiones.
3. Abrí «Nueva unidad» y comprobé que el selector traía los productos activos de `GET /api/products/available/`.
4. Intenté guardar el formulario sin producto o con un nombre de un solo carácter y comprobé que no se enviara ninguna petición y que apareciera el mensaje de validación.
5. Registré una unidad y comprobé que el `POST` enviara `product`, `name`, `description` y `status: "active"`, y que la unidad apareciera en la lista.
6. Edité los datos de una unidad y verifiqué que el `PATCH` **no** enviara `status`.
7. Intenté crear dos unidades con el mismo nombre y comprobé que el backend respondiera `400` y que el toast mostrara el mensaje del campo `name` (la unicidad no se valida en el frontend).
8. Di de baja una unidad, comprobé la confirmación y verifiqué que el `DELETE` respondiera `204`, que la fila desapareciera del listado activo y que `GET /api/serialized-units/{id}/` respondiera `"status": "inactive"`.
9. Detuve el backend y comprobé que la pantalla mostrara «No se pudo conectar con la API de MovilCare.» con la tabla vacía.
10. Ejecuté las pruebas automatizadas y la compilación de Angular.

## Criterios de aceptación

| Código | Criterio | Resultado |
|---|---|---|
| AC-04-01 | La tabla muestra solo las unidades activas recibidas del backend (`?status=active`). | Pendiente de verificación |
| AC-04-02 | El buscador filtra por nombre, producto o descripción sin peticiones adicionales. | Pendiente de verificación |
| AC-04-03 | El formulario exige producto y nombre de 2 a 150 caracteres y no envía datos inválidos. | Pendiente de verificación |
| AC-04-04 | El alta envía `POST` con `status: "active"` y la descripción vacía viaja como `null`. | Pendiente de verificación |
| AC-04-05 | La edición envía `PATCH` sin `status`. | Pendiente de verificación |
| AC-04-06 | La baja confirma, ejecuta `DELETE` y responde `204`; la unidad sale del listado activo. | Pendiente de verificación |
| AC-04-07 | `/unidades-serializadas` carga `SerializedUnitList` dentro de `Shell` con su título. | Pendiente de verificación |
| AC-04-08 | Las pruebas automatizadas y `ng build` finalizan correctamente y los CSS del feature no tienen reglas. | Pendiente de verificación |

**Nota sobre las verificaciones:** las AC-04-01 a AC-04-06 requieren que el backend acepte las peticiones (opción A o B de la nota de autenticación); con la opción C se captura el `401` como comportamiento esperado y esas AC quedan pendientes hasta el ISS-08/ISS-09 del frontend. Las AC-04-07 y AC-04-08 se pueden verificar en cualquier caso.

## Verificación del ISS

Antes de dar por finalizado el ISS-04, comprobaré cada criterio de aceptación y adjuntaré las capturas correspondientes.

El incremento se considerará aprobado cuando todas las verificaciones hayan finalizado correctamente.

```text
Todos los criterios AC-04 aprobados → avanzar al ISS-05.

Algún criterio AC-04 pendiente o fallido → corregir y repetir la prueba.
```
