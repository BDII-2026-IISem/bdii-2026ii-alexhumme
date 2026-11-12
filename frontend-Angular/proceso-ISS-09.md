# ISS-09. Guards y RBAC en la UI

> **Nota de uso.** Este archivo es un borrador independiente de `proceso.md` para que la unidad del ISS-09 se redacte sin bloquear el resto del trabajo. Cuando el ISS-09 esté terminado, copia **todo** el contenido de este archivo y pégalo al final de `frontend-Angular/proceso.md` (justo después de la sección «Verificación del ISS» del ISS-08) y, una vez pegado, borra este archivo para que no quede duplicado.

> **Evidencias:** las capturas de este ISS van de `image-160.png` a `image-167.png`; la serie anterior termina en `image-159.png`. Las capturas se tomaron con Chrome headless (Playwright) contra `ng serve` en `:4200` y el backend Django en `:8000`.

## Objetivo

ISS-08 dejó la sesión real —login, tokens, perfil y permisos en `SessionStore`— pero nada la usa para decidir: cualquiera con la URL entra a cualquier pantalla. Esta ISS la convierte en **autorización visible**: se cierra la puerta (`authGuard`), se decide qué se abre (`permissionGuard`), se filtra el menú y se ocultan las acciones que la matriz no concede (`*appHasPermission`).

> **Regla de convivencia.** Esta ISS **no reescribe** las pantallas de Fase I: solo agrega `canActivate` y `data` a sus rutas y envuelve sus botones. Si una pantalla necesita lógica nueva para protegerse, la protección está mal planteada.

> **La UI no es la seguridad.** Django vuelve a validar con `HasResourceAccess` y responde `401` sin identidad o `403` con identidad y sin concesión. No hay interruptor: este bloque se construye con el backend ya en su RBAC (ISS-08 aplicó `seed_rbac`, 53/53 concesiones para `admin`).

## Nota de adaptación — de StoreLab a MovilCare (diferencias con la guía)

| Guía (StoreLab / Django) | MovilCare (este workspace) |
| --- | --- |
| Claves sobre `/api/clients` | Claves sobre `/api/customers` (`GET /api/customers`, `PATCH /api/customers/:id`, …) |
| Ruta `/tipos-producto` + `GET /api/product-types` | **No existe**: MovilCare no tiene catálogo de tipos de producto; la ruta y su entrada de menú se omiten |
| Ruta `/ventas/nueva` con `POST /api/sales` | El alta de venta es un **diálogo** dentro de `/ventas`; no hay ruta propia que proteger, se protege el botón «Nueva venta» con `POST /api/sales` |
| Grupo de menú «Operación» | Grupo **«Gestión»** (el nombre que la Fase I ya usaba). El grupo «Seguridad» llega en ISS-10, cuando existan sus rutas |
| Pantallas: Clientes, Tipos, Productos, Ventas, Detalle | Clientes, Productos, Unidades serializadas, Ventas, Detalle de venta (`/ventas/:id`), Líneas de venta (`/detalle-ventas`) |
| Botones de la tabla 09.6 | Además de los mismos, MovilCare envuelve **«Anular venta»** (`DELETE /api/sales/:id`) en `/ventas/:id`, acción que la guía no tiene |
| Usuarios de prueba `admin` (ADMIN) y `seller` (SELLER) | `admin` (rol `admin`, 53 concesiones) y `vendedor` (rol `vendedor`, **4 concesiones**: solo `GET` de clientes y ventas), creados con un script de `manage.py shell` (ver «Cómo probarlo») |
| Tras el login se vuelve al `returnUrl` | Igual, con **respaldo `/clientes`** (decisión ISS-08). El `guestGuard` de `/login` manda a `/dashboard` (decisión ISS-09) |
| `GET /api/products/available` exige concesión | En MovilCare ese endpoint sigue en `AllowAny` (brecha conocida del ISS-04; sin concesión que declarar en el formulario) |

`login` queda **fuera** del árbol del Shell con `guestGuard` y `**` redirige a `/dashboard` (ambas cosas, igual que la guía): si `login` viviera bajo el Shell, `authGuard` y `guestGuard` entrarían en bucle.

## 09.1. Los cuatro guards

Cuatro funciones en `src/app/core/guards/`, todas devolviendo `router.createUrlTree(...)` —la redirección se resuelve **antes** de activar el componente— y ninguna con `navigate`:

- `auth-guard.ts` → `authGuard`: sin sesión no hay ruta; va a `/login` con `returnUrl: state.url`.
- `guest-guard.ts` → `guestGuard`: con sesión abierta, `/login` no tiene nada que ofrecer; va a `/dashboard`.
- `permission-guard.ts` → `permissionGuard`: lee `route.data['permission']`; si la clave no está declarada **o** `session.canPermission()` la concede, pasa; en otro caso va a `/forbidden?permission=<clave>`.
- `auth-only-guard.ts` → `authOnlyGuard = authGuard`: mismo cuerpo, otra intención — `/perfil` exige sesión y **ningún** permiso, para que no reciba un `permissionGuard` por inercia.

```ts
// src/app/core/guards/permission-guard.ts
export const permissionGuard: CanActivateFn = (route) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const permission = route.data?.['permission'] as string | undefined;
  if (!permission || session.canPermission(permission)) return true;
  return router.createUrlTree(['/forbidden'], { queryParams: { permission } });
};
```

## 09.2. La directiva `*appHasPermission`

`src/app/shared/directives/has-permission.ts` es estructural: recibe `TemplateRef` y `ViewContainerRef`, escucha con `effect()` y pinta/destruye la vista embebida según `session.canPermission()`. Un flag `rendered` evita crear y destruir la vista en cada lectura; el `effect()` se reejecuta al cambiar `permissions()` —login, logout, refresh y «Actualizar permisos»—, así que el botón aparece y desaparece **sin recargar**.

```ts
@Directive({ selector: '[appHasPermission]' })
export class HasPermission {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly session = inject(SessionStore);
  readonly permission = input.required<string>({ alias: 'appHasPermission' });
  private rendered = false;

  constructor() {
    effect(() => {
      const allowed = this.session.canPermission(this.permission());
      if (allowed && !this.rendered) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.rendered = true;
      } else if (!allowed && this.rendered) {
        this.viewContainer.clear();
        this.rendered = false;
      }
    });
  }
}
```

## 09.3. Permisos: de dónde salen y cómo se escribe la clave

La única fuente es `GET /api/auth/permissions/`, que devuelve una fila por concesión con `method`, `path` y `roleName` (la misma consulta que autoriza en Django). Esa lista vive en `SessionStore.permissions()` y la pregunta se hace con `canPermission()` (ISS-08).

La clave se escribe `MÉTODO /api/recurso`, **sin barra final**, con `:id` en el detalle. En MovilCare `canPermission()` compara contra las rutas Django reales (`api/customers/<int:pk>/`, **sin barra inicial**): parte la cadena por segmentos, los conversores `<…>` (y `:id`) valen por cualquier segmento, la query y la barra final se ignoran, y cuando nada coincide la respuesta es **deny by default**.

**No hay permisos por rol en el cliente.** En ningún sitio se escribe `if (rol === 'admin')`: el nombre del rol solo pinta la etiqueta del header y del lateral; la concesión se pregunta por su clave. El lateral muestra `admin · 53 permisos` y `vendedor · 4 permisos` porque `permissionCount()` lo cuenta, no porque el rol autorice nada.

## 09.4. Rutas con su permiso exacto

`src/app/app.routes.ts` importa los cuatro guards; cada ruta de negocio declara `canActivate: [permissionGuard]` y `data.permission` con la clave exacta:

| Ruta | `data.permission` | Guard |
| --- | --- | --- |
| `/login` (fuera del Shell) | — | `guestGuard` |
| `/dashboard` | `GET /api/sales` | `permissionGuard` |
| `/clientes` | `GET /api/customers` | `permissionGuard` |
| `/productos` | `GET /api/products` | `permissionGuard` |
| `/unidades-serializadas` | `GET /api/serialized-units` | `permissionGuard` |
| `/ventas` | `GET /api/sales` | `permissionGuard` |
| `/ventas/:id` | `GET /api/sales/:id` | `permissionGuard` |
| `/detalle-ventas` | `GET /api/sales` | `permissionGuard` |
| `/perfil` | — (sin `data`) | `authOnlyGuard` |
| `/forbidden` | — (sin `data`) | sin guard propio; el `authGuard` del Shell exige sesión |
| `''` | redirige a `dashboard` | — |
| `**` | redirige a `dashboard` | — |

Ni el panel ni las líneas inventan permisos: ambos se protegen con `GET /api/sales`, porque no existe `GET /api/dashboard` y las líneas viajan dentro de cada venta. `/ventas/:id` usa `GET /api/sales/:id`, que `samePath()` casa contra `api/sales/<int:pk>/`. El Shell entero (raíz `''`) va con `authGuard`: sin sesión no se pinta ni el lateral.

## 09.5. Botones de acción de cada pantalla

La matriz concede lo que la tabla pide: se envuelve el botón existente con `*appHasPermission` y se agrega `HasPermission` a los `imports` del componente. **La lógica de Fase I no cambia**: solo el contenedor del botón.

| Pantalla | Crear | Editar | Baja / anular |
| --- | --- | --- | --- |
| Clientes | `POST /api/customers` | `PATCH /api/customers/:id` | `DELETE /api/customers/:id` |
| Productos | `POST /api/products` | `PATCH /api/products/:id` | `DELETE /api/products/:id` |
| Unidades serializadas | `POST /api/serialized-units` | `PATCH /api/serialized-units/:id` | `DELETE /api/serialized-units/:id` |
| Ventas (lista) | `POST /api/sales` | — | — |
| Detalle de venta | — | — | `DELETE /api/sales/:id` («Anular venta») |

```html
<ng-container *appHasPermission="'POST /api/customers'">
  <button pButton type="button" (click)="openCreate()">
    <i pButtonIcon class="pi pi-plus"></i>
    <span pButtonLabel>Nuevo cliente</span>
  </button>
</ng-container>
```

El detalle de ventas y el dashboard no tienen más acciones que ocultar; la búsqueda, el «Recargar» del panel y «Volver a ventas» son de lectura y no se envuelven. El formulario de productos no pide `GET /api/products/available` con concesión porque ese endpoint sigue en `AllowAny` (brecha conocida ya anotada en el ISS-04).

## 09.6. Menú filtrado en el Shell

`src/app/layout/shell/nav.config.ts` —nuevo en MovilCare para esta ISS— concentra el catálogo (`NAV`), los tipos `NavGroupConfig`/`NavItemConfig` y la función pura de filtrado, sin Angular, para poder probarla:

```ts
export function visibleNav(can: (permission: string) => boolean): NavGroupConfig[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);
}
```

Cada entrada lleva su permiso: Panel y Ventas y Líneas de venta → `GET /api/sales`; Clientes → `GET /api/customers`; Productos → `GET /api/products`; Unidades serializadas → `GET /api/serialized-units`. Una entrada sin `permission` siempre sería visible (hoy no hay ninguna).

`shell.ts` —el arreglo fijo `menuItems` pasa a `computed`:

- `navGroups()` llama `visibleNav((p) => this.session.canPermission(p))` y lo mapea a `MenuItem[]`; en `shell.html` se cambia `[items]="menuItems"` por `[items]="navGroups()"`. Un grupo sin entradas visibles no se pinta (el filtro lo elimina entero). El `Aside` sigue sin conocer permisos.
- `userItems()` (popup del header): **Mi sesión** → `/perfil`, **Actualizar permisos** → `refreshPermissions()` (repite `auth.me()`, que trae perfil + permisos; `SessionStore` cambia sus signals y el menú se repinta solo), **Cerrar sesión** → `logout()`.
- `initials()` calcula las dos letras del avatar a partir del usuario de la sesión.

## 09.7. Página `/forbidden`

Componente nuevo en `src/app/features/auth/forbidden/` (`ts`, `html`, `css`): lee `queryParamMap.get('permission')` —la URL llega ya decodificada— y muestra «Permiso requerido» con la clave en `<code>` más un botón «Ir al panel».

```html
@if (permission) {
  <div class="rounded-xl bg-slate-900 px-4 py-3">
    <p class="m-0 text-[11px] uppercase text-slate-400">Permiso requerido</p>
    <code class="text-sm text-emerald-300">{{ permission }}</code>
  </div>
}
```

`/forbidden` no lleva `data.permission` (cualquier sesión autenticada puede verla) y el mapa de títulos del Shell la registra como «Acceso denegado».

## 09.8. Pruebas

Tres archivos nuevos, **siete pruebas** en total (Vitest, no Jasmine: `vi.fn()` donde la guía usa `jasmine.createSpy`):

| Archivo | Pruebas | Qué comprueba |
| --- | --- | --- |
| `core/guards/rbac-guards.spec.ts` | 3 | `authGuard` devuelve `UrlTree` con `returnUrl`; `permissionGuard` deja pasar con la concesión y desvía a `/forbidden` con la clave que falta |
| `shared/directives/has-permission.spec.ts` | 2 | Pinta el botón con el permiso; no pinta nada sin él (con `SessionStore` simulado) |
| `layout/shell/nav.config.spec.ts` | 2 | Con todos los permisos se ven las seis entradas; sin concesiones el grupo entero desaparece |

Con ellos la suite queda en **21 archivos / 35 pruebas en verde** con `ng test --watch=false`, y `ng build` termina con **código 0** (solo el warning preexistente de presupuesto: 575.04 kB frente a 500 kB).

## Cómo probarlo

**Previo:** backend en `:8000` (`manage.py runserver`), `ng serve` en `:4200`, `admin` con el rol `admin` (53 concesiones) y el usuario de solo lectura. Crea `vendedor` una sola vez desde `app-movilcare/backend`:

```python
# manage.py shell
from apps.common.status import RecordStatus
from apps.security.models import User, Role, RoleUser, Resource, ResourceRole

user, created = User.objects.get_or_create(username="vendedor",
    defaults={"email": "vendedor@movilcare.test"})
if created:
    user.set_password("vendedor123")
user.status = RecordStatus.ACTIVE
user.save()

role, _ = Role.objects.get_or_create(name="vendedor",
    defaults={"description": "Solo lectura de clientes y ventas", "status": RecordStatus.ACTIVE})
role.status = RecordStatus.ACTIVE
role.save()
RoleUser.objects.get_or_create(role=role, user=user, defaults={"status": RecordStatus.ACTIVE})

for res in Resource.objects.filter(method="GET", status=RecordStatus.ACTIVE).filter(
        route__startswith="api/customer") | Resource.objects.filter(
        method="GET", status=RecordStatus.ACTIVE).filter(route__startswith="api/sales"):
    ResourceRole.objects.get_or_create(resource=res, role=role,
        defaults={"status": RecordStatus.ACTIVE})
```

Realiza las verificaciones en el siguiente orden:

1. Con `curl` y el token de `vendedor`: `GET /api/auth/permissions/` → las cuatro concesiones (`method`, `path`, `roleName`), tal como las lee `SessionStore`.
2. Ventana incógnita (sin sesión), entra a `http://localhost:4200/`: la URL queda en `/login?returnUrl=%2Fdashboard`. Con sesión abierta, entra a `/login`: te devuelve a `/dashboard`.
3. Login `admin` → `/clientes`: el menú muestra las **seis** entradas de «Gestión», «Nuevo cliente» y los iconos de editar y dar de baja; el header y el lateral dicen `admin · 53 permisos`.
4. Cierra sesión y entra con `vendedor` / `vendedor123` → `/clientes`: el menú se reduce a **cuatro** entradas (sin Productos ni Unidades serializadas), la tabla sigue completa y **no hay ningún botón de escritura**; el lateral dice `vendedor · 4 permisos`.
5. Con `vendedor`, escribe `/productos` en la barra de direcciones: caes en `/forbidden?permission=GET%20%2Fapi%2Fproducts` y la página muestra `GET /api/products`. Entra también a `/perfil`: se abre (exige sesión y ningún permiso).
6. En la pestaña Network (o con `curl`), `GET /api/auth/permissions/` responde `200` con la matriz de la sesión.
7. Con el token de `vendedor`, `POST /api/customers/` → **403** `{"detail":"No tiene autorización para ejecutar esta operación."}`; el `GET` de la misma URL → `200`. La UI ya no ofrece ese botón, pero el backend no se fiaba de la UI.
8. En el menú del header, «Actualizar permisos» → repite `GET /auth/profile/` + `GET /auth/permissions/` y avisa «Permisos actualizados»; si cambias la matriz en Django y lo repites, el menú se repinta sin recargar.
9. Ejecuta `ng test --watch=false` (21 archivos, 35 pruebas) y `ng build` (código 0).

## Criterios de aceptación

| Código | Criterio | Resultado |
|---|---|---|
| AC-09-01 | Sin sesión, cualquier ruta del Shell redirige a `/login` con el destino en `returnUrl` (obs.: `/` → `/login?returnUrl=%2Fdashboard`). | Pendiente de verificación |
| AC-09-02 | Con sesión abierta, `/login` redirige a `/dashboard` (`guestGuard`). | Pendiente de verificación |
| AC-09-03 | Las rutas de negocio declaran `canActivate: [permissionGuard]` y `data.permission` con la clave exacta de la sección 09.4. | Pendiente de verificación |
| AC-09-04 | Sin la concesión, una ruta de negocio termina en `/forbidden?permission=…` y la página muestra ese permiso. | Pendiente de verificación |
| AC-09-05 | `/perfil` exige sesión y ningún permiso; `/forbidden` se ve con sesión y sin concesiones. | Pendiente de verificación |
| AC-09-06 | Los botones de crear, editar y dar de baja aparecen y desaparecen según la concesión, sin recargar. | Pendiente de verificación |
| AC-09-07 | El menú se filtra con `computed` y un grupo sin entradas visibles no se pinta. | Pendiente de verificación |
| AC-09-08 | No hay permisos por rol en el cliente; la clave se pregunta a `canPermission()` y sale de `/api/auth/permissions/`. | Pendiente de verificación |
| AC-09-09 | Las pantallas de Fase I conservan su lógica; el cambio se limita a rutas y plantillas de botones. | Pendiente de verificación |
| AC-09-10 | Las siete pruebas pasan y `ng build` termina con código 0. | Pendiente de verificación |

**Nota sobre las verificaciones:** AC-09-03, AC-09-06, AC-09-07, AC-09-08 y AC-09-09 se comprueban con las pruebas unitarias y leyendo `app.routes.ts` y las plantillas; AC-09-01, AC-09-02, AC-09-04, AC-09-05 y AC-09-10 necesitan el backend en `:8000` con `seed_rbac` aplicado y los dos usuarios (`admin` y `vendedor`).

## Evidencias

- **EVI-09-01**: menú con `admin` y con `vendedor`, y el `/forbidden` con el permiso faltante:
  - `image-160.png` — sin sesión, `/` queda en `/login?returnUrl=%2Fdashboard` (AC-09-01).
  - `image-161.png` — `admin` en `/clientes`: las seis entradas del menú, «Nuevo cliente» y los iconos de editar y dar de baja; `admin · 53 permisos`.
  - `image-162.png` — con sesión, `/login` termina en `/dashboard` (AC-09-02).
  - `image-163.png` — `vendedor` en `/clientes`: el menú sin Productos ni Unidades serializadas; `vendedor · 4 permisos`.
  - `image-164.png` — `vendedor` en `/productos` por URL → `/forbidden?permission=GET%20%2Fapi%2Fproducts`, con la clave `GET /api/products` en pantalla.

- **EVI-09-02**: `/clientes` con `vendedor`: tabla visible y ningún botón de escritura (la columna «Acciones» queda vacía y no hay «Nuevo cliente»):
  - `image-163.png` — misma captura del menú filtrado, contraste directo con `image-161.png`.

- **EVI-09-03**: respuesta de `/api/auth/permissions/`, del `403` por `curl` y de `ng build`:
  - `image-165.png` — `GET http://127.0.0.1:8000/api/auth/permissions/` → `200 OK` con las cuatro filas de `vendedor` (`method`, `path`, `roleName`), la respuesta real de la sesión.
  - `image-166.png` — terminal con el `curl` real: login `200` (tokens recortados), `POST /api/customers/` → **403** `{"detail":"No tiene autorización para ejecutar esta operación."}` y `GET /api/customers/` → `200`.
  - `image-167.png` — terminal con `ng build`: «Application bundle generation complete», el warning de presupuesto (575.04 kB) y `EXIT_CODE=0`.

## Verificación del ISS

Durante la automatización de esta unidad se ejecutaron las siguientes comprobaciones sobre el workspace real (backend `:8000` + `ng serve` `:4200`, Chrome headless):

| Comprobación | Resultado observado |
| --- | --- |
| Sin sesión en `/` | URL final `/login?returnUrl=%2Fdashboard` |
| `admin` en `/clientes` | Menú de 6 entradas; «Nuevo cliente» presente (1); iconos de editar (2); aside `admin · 53 permisos` |
| Con sesión en `/login` | URL final `/dashboard` |
| `vendedor` en `/clientes` | Menú de 4 entradas (sin Productos ni Unidades); «Nuevo cliente» (0); iconos de editar (0); aside `vendedor · 4 permisos` |
| `vendedor` en `/perfil` | Se abre sin redirigir (sesión y ningún permiso de ruta) |
| `vendedor` en `/productos` | `/forbidden?permission=GET%20%2Fapi%2Fproducts` y la página muestra `GET /api/products` |
| `GET /api/auth/permissions/` con `vendedor` | `200` con 4 concesiones |
| `curl` con token de `vendedor` | `POST /api/customers/` → `403` con `detail`; `GET /api/customers/` → `200` |
| `ng test --watch=false` | 21 archivos / 35 pruebas en verde |
| `ng build` | `EXIT_CODE=0` (warning preexistente de presupuesto) |

Antes de dar por finalizado el ISS-09, el revisor confirma cada criterio de aceptación contra estas capturas (`image-160.png` en adelante). Con esta unidad la autorización queda visible en la UI: puertas (`authGuard`/`guestGuard`), permisos por ruta (`permissionGuard`), menú filtrado y botones que solo existen cuando la matriz los concede; la administración de la matriz (usuarios, roles y concesiones) será el ISS-10.

```text
Todos los criterios AC-09 aprobados → avanzar al ISS-10 (Administración RBAC).
Algún criterio AC-09 pendiente o fallido → corregir y repetir la prueba.
```
