# ISS-08. Autenticación JWT y refresh

> **Nota de uso.** Este archivo es un borrador independiente de `proceso.md` para que la unidad del ISS-08 se pueda redactar mientras se desarrolla el ISS-07. Cuando el ISS-07 esté terminado, copia **todo** el contenido de este archivo y pégalo al final de `frontend-Angular/proceso.md` (justo después de la sección «Verificación del ISS» del ISS-07), desarrolla la unidad siguiendo los pasos en orden y, una vez pegado, borra este archivo para que no quede duplicado.
>
> **Evidencias:** las capturas de este ISS se numeran a partir de `image-125.png`, porque la serie `image-115` · `image-124` corresponde al ISS-07.

## Objetivo

Construir la **sesión del cliente** contra `/api/auth/`: modelos, `SessionStore`, `AuthService`, los dos interceptores y las pantallas `/login` y `/perfil`. La pieza central es el encadenamiento: el login **no** devuelve identidad, devuelve un par de tokens; con ese `access` se piden perfil y matriz de permisos en paralelo (`forkJoin`) y solo entonces emite. A partir de este ISS, sin sesión el primer `401` de negocio limpia y navega a `/login?returnUrl=…`.

> **Encaje en las dos fases.** Arranca **Fase II · Auth con RBAC**. Sin guards ni directiva de permisos: eso es ISS-09. Aquí la protección es un **efecto del interceptor**, no una decisión tomada antes de pintar la pantalla. Las pantallas de negocio de la Fase I (ISS-03 a ISS-07) **no se reescriben**: solo cambia de dónde sale el `Authorization`.

> **Adelanto importante.** A diferencia de la guía (cuyo backend está en `API_ACCESS=open` y el negocio no responde `401` hasta el ISS-09), en MovilCare **el negocio siempre exigió JWT + concesión RBAC** (`[IsAuthenticated, HasResourceAccess]` en todas las vistas). Por eso este ISS es el que hace visible en el navegador algo que ya existía en el servidor. Antes de empezar, **deshaz los toggles `AllowAny` provisionales** que hayan quedado de los ISS-04 a ISS-07 (si `git status` del backend está limpio y solo ves el `AllowAny` de `/api/products/available/`, omite el paso):

```bash
git restore app-movilcare/backend/apps/sale/views.py app-movilcare/backend/apps/customer/views.py app-movilcare/backend/apps/product/views.py
```

Verificación final de que el negocio quedó estricto: `grep -rn "AllowAny" app-movilcare/backend/apps` solo debe encontrar la importación de `auth_views.py` (login/refresh/logout, que son abiertos por diseño) y `AvailableProductListAPIView` (`/api/products/available/`, AllowAny por diseño). Si aparece en `CatalogViewSet`, `SaleReadViewSet`, `CustomerViewSet`, …, vuelve a poner `[IsAuthenticated, HasResourceAccess]`.

## Nota de adaptación - el contrato: de `storelab` a MovilCare y el permiso que había que crear (diferencia con la guía)

La guía asume un backend con **cinco** respuestas de autenticación, entre ellas `GET /api/auth/permissions/`, que devuelve la matriz efectiva del usuario. El backend real de MovilCare (`apps/security/`) trae **cuatro** (`login`, `refresh`, `logout`, `profile`): **no existe** `/api/auth/permissions/` ni ningún endpoint que devuelva la matriz del usuario. Tras la pregunta al desarrollador, la decisión fue **agregar ese endpoint en el backend** (sección 08.1, con el código completo), de modo que el flujo de la guía queda intacto.

| Guía (frontend2026 Django) | MovilCare (real) | Tratamiento en este ISS |
| --- | --- | --- |
| `POST /api/auth/login/` devuelve `{access, refresh, tokenType, accessExpiresIn}` | Idéntico: `token_payload()` en `auth_views.py`; `ACCESS_TOKEN_LIFETIME = 60 min` → `accessExpiresIn: 3600` | Sin cambios; el login **no** trae identidad |
| `GET /api/auth/profile/` → usuario directo con `avatar` | `ProfileSerializer`: `id`, `username`, `email`, `first_name`, `last_name`, `status` → `firstName`, `lastName`; **sin `avatar`** | `SessionUser` se adapta: sin `avatar`, con `firstName`/`lastName` |
| `GET /api/auth/permissions/` → `{permissions: […]}` | **No existe en MovilCare** (verificado en `apps/security/urls.py` y en el historial de git) | **Endpoint nuevo en el backend:** vista `PermissionsAPIView` + ruta `auth/permissions/` + serializers, con el código en la sección 08.1 |
| `path: "/api/clients/:id"` (estilo de la guía) | `resource.route` guarda la ruta Django de `resolve()`, por ejemplo `api/customers/<int:pk>/`: **sin barra inicial** y con conversores `<…>` | `samePath()` se adapta: quita barras iniciales/finales y convierte `<int:pk>` (y `:id`) en comodín de un segmento (sección 08.3) |
| `client` / `/api/clients/` | `customer` / `/api/customers/` | Todas las rutas, fixtures y pruebas usan `customers` |
| Clave de almacenamiento `storelab.session.v1` | — | `movilcare.session.v1` |
| `returnUrl` por defecto `/dashboard` | El inicio de MovilCare es `/clientes` (el comodín `''` redirige allí) | El interceptor y `/login` usan `/clientes` como respaldo |
| `NotificationService` con `.info()` | Servicio `Notification` (`success`, `info`, `warn`, `error`) en `core/services/notification.ts` | Cambio de nombre de import; `.info()` existe |
| `toApiMessage` en `core/utils/api-error` | Está en `core/utils/to-api-message.ts` | Ruta de import ajustada (misma función y mensajes) |
| `provideHttpClient()` existente desde el ISS-02, que se **sustituye** | En MovilCare **no existe** `provideHttpClient` en `app.config.ts` (Angular 22 trae `HttpBackend → FetchBackend` por defecto, por eso la app funcionaba sin él) | Se **agrega por primera vez** ya con los interceptores: `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))` |
| Prueba del interceptor con `ClientApi` | No hay `ClientApi`; el CRUD de referencia es `CustomerApi` | La prueba usa `CustomerApi` contra `/api/customers/` |
| Usuarios `admin` y `seller` del workspace de la guía | MovilCare no siembra usuarios: hace falta un usuario `active` con el rol `admin` de `seed_rbac` | Paso de prueba: `python manage.py seed_rbac --username <tu_usuario>` |
| Negocio con `API_ACCESS=open`: no responde `401` hasta el ISS-09 | **El negocio ya exige JWT + `HasResourceAccess` siempre**; además `MovilCareJWTAuthentication` rechaza usuarios inactivos (401 «El usuario no está active.») | Se restauran los toggles `AllowAny` (arriba); sin sesión → `401` → `/login`; con sesión pero **sin rol** → `403` (lo avisa `errorInterceptor`) |
| Rotación de refresh en el backend de la guía | `RefreshAPIView` rota a nivel de aplicación: marca `replaced_by` y, ante reuso, **revoca la familia entera** (`_revoke_family`); simplejwt va con `ROTATE_REFRESH_TOKENS=False` porque la rotación la implementa el propio código | Mismo comportamiento que asume la guía: nunca lanzar dos refresh a la vez |
| Credenciales inválidas → `401 {"detail": "Credenciales inválidas."}` | Idéntico en `LoginAPIView`; sin username ni email → `400` con `non_field_errors` | El formulario muestra el `detail` con `toApiMessage`; `errorInterceptor` no toastea las rutas de auth |
| `User` y `SessionTokens` dejados en el ISS-02 | `auth.model.ts` hoy tiene `User`, `SessionTokens` y `EffectivePermission`; **nadie los importa aún** (verificado) | Se renombran a `SessionUser` y `TokenPair` (+ `accessExpiresIn`) y se agrega `LoginRequest` (sección 08.2) |
| Ítem de menú para `/perfil` | La guía no toca el menú en este ISS | Acceso a `/perfil` **por URL** en este ISS; el menú se toca en el ISS-09 |

## Nota de adaptación - autenticación y permisos (diferencia con la guía)

Los endpoints de sesión son abiertos **por diseño** en MovilCare (no hace falta ningún cambio `AllowAny` para ellos); lo que exige permisos es el negocio y la matriz.

| Método | Ruta | Vista | Acceso real |
| --- | --- | --- | --- |
| POST | `/api/auth/login/` | `LoginAPIView` | `AllowAny` **y** `authentication_classes = []` (sin Bearer) |
| POST | `/api/auth/refresh/` | `RefreshAPIView` | `AllowAny` y sin Bearer: el refresh va en el cuerpo |
| POST | `/api/auth/logout/` | `LogoutAPIView` | `AllowAny` y sin Bearer; responde `204` |
| GET | `/api/auth/profile/` | `ProfileAPIView` | `IsAuthenticated` (sin `HasResourceAccess`: cualquier usuario ve su propio perfil) |
| GET | `/api/auth/permissions/` | `PermissionsAPIView` (**nuevo, sección 08.1**) | `IsAuthenticated` |
| GET/POST/PATCH/DELETE | `/api/customers/`, `/api/products/`, `/api/sales/`, … | vistas de negocio | `IsAuthenticated + HasResourceAccess`: JWT **y** concesión del rol en la matriz |

**Qué implica en pantalla:**

- **Sin sesión:** la primera petición de negocio responde `401` → `authInterceptor` no tiene refresh → limpia, avisa «Sesión vencida» y navega a `/login?returnUrl=…`.
- **Con sesión pero sin el rol `admin`:** el negocio responde `403` («No tiene autorización para ejecutar esta operación.») → `errorInterceptor` muestra «Acceso denegado». Solución: `python manage.py seed_rbac --username <usuario>` para que el usuario reciba el rol `admin` con todas las concesiones.
- **Usuario inactivo:** el login ya lo rechaza (`401`), y si la sesión estaba viva el JWT muere con `401` «El usuario no está active.».
- `ng test` y `ng build` no dependen del backend: se ejecutan igual.

## 08.1. El contrato: cuatro respuestas, no una

| Petición | Acceso | Devuelve | Se guarda |
| --- | --- | --- | --- |
| `POST /api/auth/login/` | OPEN | `{access, refresh, tokenType, accessExpiresIn}` | el par |
| `GET /api/auth/profile/` | JWT | usuario **directo**, sin envoltorio | `user` |
| `GET /api/auth/permissions/` | JWT | `{permissions: […]}`, **envuelto** | `permissions` |
| `POST /api/auth/refresh/` | OPEN (`refresh` en el cuerpo) | el mismo cuerpo, con `refresh` nuevo | el par rotado |
| `POST /api/auth/logout/` | OPEN (`refresh` en el cuerpo) | `204`, sin cuerpo | se borra todo |

```json
{ "access": "<jwt>", "refresh": "<opaco>", "tokenType": "Bearer", "accessExpiresIn": 3600 }
{ "id": 1, "username": "admin", "email": "admin@movilcare.test", "firstName": "Ana", "lastName": "Torres", "status": "active" }
{ "permissions": [{ "method": "PATCH", "path": "api/customers/<int:pk>/", "roleId": 1, "roleName": "admin" }] }
```

- El login **no trae identidad**: esperar `user` o `roles` ahí obligaría a inventar campos que Django no envía.
- El refresh **rota**: `RefreshAPIView` marca el token presentado como `replaced_by` y emite otro de la misma familia; reutilizar uno ya rotado responde `401` y **revoca la familia** (`_revoke_family`) — de ahí que nunca se lancen dos refresh a la vez.
- La clave de permiso es `MÉTODO /ruta`, pero en MovilCare la ruta es la de Django: `api/customers/<int:pk>/` (sin barra inicial, con conversor). `canPermission('PATCH /api/customers/7')` tiene que reconocerla (sección 08.3).

**Agregar `GET /api/auth/permissions/` al backend**

Como MovilCare no lo trae, se agrega con estos **tres cambios** (backend; decide el desarrollador si los commitea junto al frontend):

**Cambio B1 - `apps/security/serializers.py` (al final del archivo)**

```python
class EffectivePermissionSerializer(serializers.Serializer):
    method = serializers.CharField()
    path = serializers.CharField()
    role_id = serializers.IntegerField()
    role_name = serializers.CharField()


class PermissionsResponseSerializer(serializers.Serializer):
    permissions = EffectivePermissionSerializer(many=True)
```

**Cambio B2 - `apps/security/auth_views.py`**

Ajusta los imports existentes:

```python
# antes
from rest_framework.permissions import AllowAny
...
from apps.security.models import RefreshToken
from apps.security.serializers import (
    LoginSerializer,
    LogoutSerializer,
    RefreshSerializer,
    TokenPairSerializer,
)

# después
from rest_framework.permissions import AllowAny, IsAuthenticated
...
from apps.security.models import RefreshToken, ResourceRole
from apps.security.serializers import (
    LoginSerializer,
    LogoutSerializer,
    PermissionsResponseSerializer,
    RefreshSerializer,
    TokenPairSerializer,
)
```

Y agrega la vista al final del archivo:

```python
class PermissionsAPIView(APIView):
    """Matriz efectiva del usuario autenticado.

    Repite los criterios de HasResourceAccess (concesión activa, recurso
    activo, rol activo y asignación activa) para que el frontend muestre
    exactamente lo que el backend va a autorizar.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: PermissionsResponseSerializer},
        tags=["auth"],
    )
    def get(self, request):
        grants = (
            ResourceRole.objects.filter(
                status=RecordStatus.ACTIVE,
                resource__status=RecordStatus.ACTIVE,
                role__status=RecordStatus.ACTIVE,
                role__assignments__user=request.user,
                role__assignments__status=RecordStatus.ACTIVE,
            )
            .select_related("resource", "role")
            .distinct()
        )
        return Response(
            {
                "permissions": [
                    {
                        "method": grant.resource.method,
                        "path": grant.resource.route,
                        "role_id": grant.role_id,
                        "role_name": grant.role.name,
                    }
                    for grant in grants
                ]
            },
            status=status.HTTP_200_OK,
        )
```

**Cambio B3 - `apps/security/urls.py`**

```python
# antes
from apps.security.auth_views import LoginAPIView, LogoutAPIView, RefreshAPIView
...
    path("auth/login/", LoginAPIView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshAPIView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth-logout"),
    path("auth/profile/", ProfileAPIView.as_view(), name="auth-profile"),

# después
from apps.security.auth_views import (
    LoginAPIView,
    LogoutAPIView,
    PermissionsAPIView,
    RefreshAPIView,
)
...
    path("auth/login/", LoginAPIView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshAPIView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth-logout"),
    path("auth/profile/", ProfileAPIView.as_view(), name="auth-profile"),
    path(
        "auth/permissions/",
        PermissionsAPIView.as_view(),
        name="auth-permissions",
    ),
```

**Notas:**

- El renderer camelCase global (`config/settings/__init__.py`) convierte `role_id` → `roleId` y `role_name` → `roleName`, así que la respuesta ya llega con la forma del frontend.
- `role__assignments` es el `related_name` de `RoleUser` hacia `Role` (el mismo que usa `HasResourceAccess`), así que la consulta devuelve **exactamente** lo que el backend va a autorizar.
- El endpoint no está en los `SAMPLES` de `seed_rbac`: los endpoints de auth nunca fueron RBAC, y este solo pide `IsAuthenticated`.
- Verificación rápida con el backend en `:8000`:

```bash
# 1) login
curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"<tu_usuario>","password":"<tu_password>"}'
# 2) con el access devuelto
curl -s http://127.0.0.1:8000/api/auth/permissions/ \
  -H "Authorization: Bearer <access>"
```

### Evidencia

- Captura del `curl` de login con las cuatro claves (sin usuario en la respuesta).
- Captura del `curl` de `/api/auth/permissions/` con al menos una concesión del rol `admin`.

## 08.2. Modelos: `auth.model.ts`

ISS-02 dejó `User`, `SessionTokens` y `EffectivePermission` en `src/app/core/models/auth.model.ts`; **nadie los importa aún** (verificado), así que el archivo se reescribe completo con los cuatro tipos del contrato:

```typescript
import { HttpMethod, Status } from './api.model';

/** El login acepta username, email o ambos: nunca un campo combinado. */
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

/** Lo único que devuelve el login y lo único que rota con el refresh. */
export interface TokenPair {
  access: string;
  refresh: string;
  tokenType: 'Bearer';
  accessExpiresIn: number;
}

/** `GET /api/auth/profile/` directo, sin envoltorio ni avatar. */
export interface SessionUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  status: Status;
}

/** Una fila de `GET /api/auth/permissions/`. */
export interface EffectivePermission {
  method: HttpMethod;
  path: string;
  roleId: number;
  roleName: string;
}
```

**Notas:**

- `User` → `SessionUser`: la guía le pone `avatar`, pero `ProfileSerializer` de MovilCare **no trae avatar** y tampoco trae `created_at`/`updated_at`, así que **no** extiende `Timestamps` (a diferencia de la guía). En cambio sí trae `first_name`/`last_name` → `firstName`/`lastName`.
- `SessionTokens` → `TokenPair` + `accessExpiresIn`: es lo que devuelve `token_payload()` y lo que rota; el nombre viejo además chocaría con el modelo de usuarios de la matriz RBAC.
- `EffectivePermission.method` se tipea con el `HttpMethod` que ya existe en `api.model.ts` (los valores del backend son exactamente esos cinco).
- `LoginRequest` es nuevo: el formulario manda `username` **o** `email` según lo escrito (el contrato de `LoginSerializer` no acepta un campo combinado tipo `identifier`).

### Evidencia

- Captura de `auth.model.ts` con los cuatro interfaces y sus campos.

## 08.3. `SessionStore`: signals, `computed` y persistencia

Crea `src/app/core/services/session-store.ts` (junto a `notification.ts`):

```typescript
import { Injectable, computed, signal } from '@angular/core';

import {
  EffectivePermission,
  SessionUser,
  TokenPair,
} from '../models/auth.model';

const STORAGE_KEY = 'movilcare.session.v1';

/** Única fuente de verdad de la sesión; el backend sigue siendo la autoridad. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly _accessToken = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);
  private readonly _user = signal<SessionUser | null>(null);
  private readonly _permissions = signal<EffectivePermission[]>([]);

  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();
  readonly user = this._user.asReadonly();
  readonly permissions = this._permissions.asReadonly();

  readonly isAuthenticated = computed(() => this._accessToken() !== null);
  readonly permissionCount = computed(() => this._permissions().length);
  /** Roles de la matriz efectiva: no hay endpoint de roles del usuario. */
  readonly roles = computed(() =>
    [...new Set(this._permissions().map((p) => p.roleName))].sort(),
  );

  constructor() {
    this.restore();
  }

  setTokens(tokens: TokenPair): void {
    this._accessToken.set(tokens.access);
    this._refreshToken.set(tokens.refresh);
    this.persist();
  }

  setUser(user: SessionUser, permissions: EffectivePermission[]): void {
    this._user.set(user);
    this._permissions.set(permissions);
    this.persist();
  }

  clear(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._user.set(null);
    this._permissions.set([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* sin almacenamiento */
    }
  }

  /** canPermission('PATCH /api/customers/7') contra `api/customers/<int:pk>/`. */
  canPermission(key: string): boolean {
    const separator = key.indexOf(' ');
    if (separator < 0) {
      return false;
    }
    const method = key.slice(0, separator).toUpperCase();
    return this._permissions().some(
      (p) => p.method === method && samePath(p.path, key.slice(separator + 1)),
    );
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const data = JSON.parse(raw) as {
        access: string;
        refresh: string;
        user: SessionUser | null;
        permissions: EffectivePermission[];
      };
      if (!Array.isArray(data.permissions)) {
        this.clear();
        return;
      }
      this._accessToken.set(data.access || null);
      this._refreshToken.set(data.refresh || null);
      this._user.set(data.user ?? null);
      this._permissions.set(data.permissions);
    } catch {
      this.clear();
    }
  }

  private persist(): void {
    const raw = JSON.stringify({
      access: this._accessToken() ?? '',
      refresh: this._refreshToken() ?? '',
      user: this._user(),
      permissions: this._permissions(),
    });
    try {
      localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      /* cuota llena */
    }
  }
}

/**
 * Compara la clave `MÉTODO /ruta` contra `resource.route`.
 *
 * En MovilCare la ruta es la de Django (`api/customers/<int:pk>/`, sin barra
 * inicial): se parte por segmentos, los conversores `<…>` (y `:id`, por si
 * acaso) valen por cualquier segmento, y la query y la barra final se ignoran.
 */
function samePath(pattern: string, path: string): boolean {
  const segments = (value: string): string[] =>
    value
      .split('?')[0]
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .split('/')
      .filter(Boolean);

  const expected = segments(pattern);
  const actual = segments(path);

  if (expected.length !== actual.length) {
    return false;
  }

  return expected.every((segment, index) => {
    const wildcard =
      (segment.startsWith('<') && segment.endsWith('>')) ||
      segment.startsWith(':');
    return wildcard || segment === actual[index];
  });
}
```

**Notas:**

- `signal` guarda lo mutable y `computed` lo derivado: `isAuthenticated` nunca se asigna, se deduce del token. Los nombres son los que pide la guía: cuatro `signal` (`accessToken`, `refreshToken`, `user`, `permissions`) y tres `computed` (`isAuthenticated`, `roles`, `permissionCount`).
- **Diferencia con la guía (misma que la nota de adaptación):** la guía arma un regex con `:id` sobre rutas como `/api/clients/:id`; en MovilCare `resource.route` es la cadena de `resolve()` — `api/customers/<int:pk>/` —, sin barra inicial y con conversor `<int:pk>`, así que `samePath()` compara **segmento a segmento** y trata `<…>` como comodín. `canPermission('GET /api/customers')` (sin barra) y `canPermission('PATCH /api/customers/7')` contra `api/customers/<int:pk>/` tienen que dar `true`.
- `roles()` sale de los `roleName` de la matriz efectiva: no existe endpoint de «roles del usuario», solo el de permisos (sección 08.1).
- `restore()` en el constructor mantiene la sesión tras `F5`; si el JSON está corrupto o `permissions` no es un arreglo, `clear()` borra la clave sucia.

### Evidencia

- Captura de `session-store.ts` con los cuatro `signal`, los tres `computed` y `samePath()`.

## 08.4. `AuthService`: el encadenamiento

Crea `src/app/core/services/auth.ts`:

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EffectivePermission,
  LoginRequest,
  SessionUser,
  TokenPair,
} from '../models/auth.model';
import { SessionStore } from './session-store';

/** Único punto de contacto con /api/auth/. El login solo devuelve el par. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);
  private readonly base = `${environment.apiUrl}/auth`;

  /** Login + perfil + permisos: no emite hasta que la sesión está completa. */
  login(credentials: LoginRequest): Observable<SessionUser> {
    return this.http
      .post<TokenPair>(`${this.base}/login/`, credentials)
      .pipe(
        tap((tokens) => this.session.setTokens(tokens)),
        switchMap(() =>
          this.me().pipe(
            catchError((error: unknown) => {
              this.session.clear();
              return throwError(() => error);
            }),
          ),
        ),
      );
  }

  /** GET /auth/profile/ (objeto directo) + GET /auth/permissions/ (envuelto). */
  me(): Observable<SessionUser> {
    return forkJoin({
      user: this.http.get<SessionUser>(`${this.base}/profile/`),
      permissions: this.http.get<{ permissions: EffectivePermission[] }>(
        `${this.base}/permissions/`,
      ),
    }).pipe(
      tap(({ user, permissions }) =>
        this.session.setUser(user, permissions.permissions),
      ),
      map(({ user }) => user),
    );
  }

  refresh(): Observable<TokenPair> {
    const refresh = this.session.refreshToken();
    if (!refresh) {
      return throwError(() => new Error('La sesión no tiene refresh token'));
    }
    return this.http
      .post<TokenPair>(`${this.base}/refresh/`, { refresh })
      .pipe(tap((tokens) => this.session.setTokens(tokens)));
  }

  logout(): Observable<unknown> {
    const refresh = this.session.refreshToken();
    const request = refresh
      ? this.http.post(`${this.base}/logout/`, { refresh })
      : of(null);
    return request.pipe(
      catchError(() => of(null)),
      finalize(() => this.session.clear()),
    );
  }
}
```

**Notas:**

- **El encadenamiento:** `tap` guarda el par pero **no** emite; `switchMap(() => this.me())` dispara `profile` y `permissions` en paralelo con `forkJoin`, y solo cuando ambas responden emite el `SessionUser`. El componente navega con la sesión armada, sin menús vacíos ni parpadeos.
- Si `profile` o `permissions` fallan, el `catchError` interno **limpia la sesión** (no queda un token sin identidad) y reenvía el error al formulario, que lo pinta con `toApiMessage`.
- `me()` es reutilizable: la pantalla de perfil lo llama con «Refrescar desde el backend» sin cerrar la sesión.
- `refresh()` manda `{ refresh }` en el cuerpo (el endpoint está `AllowAny` y **sin** Bearer: los encabezados de token los agrega el interceptor solo a las rutas de negocio). Si no hay refresh token, falla en el cliente sin abrir petición.
- `logout()` cierra aunque el backend esté caído: `catchError(() => of(null))` + `finalize(() => clear())`. Nota de MovilCare: `LogoutAPIView` responde `204` y **revoca solo ese refresh** (no la familia), distinto del refresh, que ante reuso revoca la familia entera.

### Evidencia

- Captura de `auth.ts` con `login()`, `me()`, `refresh()` y `logout()`.

## 08.5. Los dos interceptores

Genera los dos archivos funcionales con la CLI (o créalos directamente con estos contenidos):

```bash
ng generate interceptor core/interceptors/auth --functional --skip-tests --defaults
ng generate interceptor core/interceptors/error --functional --skip-tests --defaults
```

Si la CLI los nombra `auth.interceptor.ts` / `error.interceptor.ts`, renómbralos a `auth-interceptor.ts` / `error-interceptor.ts` para seguir el nombre de la guía.

**`src/app/core/interceptors/auth-interceptor.ts`** — adjunta el `Bearer`, refresca **una sola vez** ante `401` y reintenta:

```typescript
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';

import { TokenPair } from '../models/auth.model';
import { AuthService } from '../services/auth';
import { Notification } from '../services/notification';
import { SessionStore } from '../services/session-store';

/** Un único refresh en vuelo para todas las peticiones que reciban 401. */
let refreshInFlight: Observable<TokenPair> | null = null;
/** Rutas que emiten o revocan tokens: no llevan Bearer ni se reintentan. */
const TOKEN_ENDPOINTS = ['/auth/login/', '/auth/refresh/', '/auth/logout/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(Notification);

  const isTokenEndpoint = TOKEN_ENDPOINTS.some((endpoint) =>
    req.url.includes(endpoint),
  );
  const access = session.accessToken();
  const request =
    access && !isTokenEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${access}` } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        isTokenEndpoint
      ) {
        return throwError(() => error);
      }
      if (!session.refreshToken()) {
        redirectToLogin(session, router, notify);
        return throwError(() => error);
      }
      // `??=`: si ya hay un refresh en vuelo se comparte, no se abre otro.
      refreshInFlight ??= auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          redirectToLogin(session, router, notify);
          return throwError(() => refreshError);
        }),
        finalize(() => {
          refreshInFlight = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      // Reintento con el access nuevo; si vuelve a fallar no se reejecuta
      // este catchError (evita el bucle infinito de refrescos).
      return refreshInFlight.pipe(
        switchMap(() => {
          const renewed = session.accessToken();
          return next(
            renewed
              ? req.clone({
                  setHeaders: { Authorization: `Bearer ${renewed}` },
                })
              : req,
          );
        }),
      );
    }),
  );
};

function redirectToLogin(
  session: SessionStore,
  router: Router,
  notify: Notification,
): void {
  session.clear();
  notify.error('Sesión vencida', 'Vuelve a iniciar sesión.');
  // En MovilCare el inicio es /clientes (el comodín `''` redirige allí).
  const returnUrl = router.url.startsWith('/login') ? '/clientes' : router.url;
  void router.navigate(['/login'], { queryParams: { returnUrl } });
}
```

**`src/app/core/interceptors/error-interceptor.ts`** — el aviso único de errores que no son del formulario ni de la sesión:

```typescript
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { Notification } from '../services/notification';

/** Rutas de sesión: su error se explica en el formulario, no en un toast. */
const AUTH_ENTRY = ['/auth/login/', '/auth/refresh/', '/auth/logout/'];
const MENSAJES: Record<number, [string, string]> = {
  0: [
    'Sin conexión con la API',
    'Verifica que Django esté en http://127.0.0.1:8000.',
  ],
  403: [
    'Acceso denegado',
    'Tu rol no tiene el permiso que exige esta operación.',
  ],
  404: ['Registro no encontrado', 'El registro ya no existe.'],
  409: ['Dato duplicado', 'Ese valor ya está registrado.'],
};
let lastToast = { key: '', at: 0 };

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(Notification);
  return next(req).pipe(
    catchError((error: unknown) => {
      // 400: lo pinta el formulario con toApiMessage. 401: lo resuelve
      // authInterceptor. 401/400 no están en MENSAJES, así que no toastea.
      if (
        error instanceof HttpErrorResponse &&
        !AUTH_ENTRY.some((endpoint) => req.url.includes(endpoint))
      ) {
        const message = MENSAJES[error.status];
        if (message) {
          toastOnce(`${error.status}-${req.url}`, () =>
            notify.error(message[0], message[1]),
          );
        } else if (error.status >= 500) {
          toastOnce(`server-${error.status}`, () =>
            notify.error('Error del servidor', 'Revisa la consola de Django.'),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};

/** Un mismo fallo repetido en ráfaga produce un solo aviso. */
function toastOnce(key: string, show: () => void): void {
  const now = Date.now();
  if (lastToast.key === key && now - lastToast.at < 4000) {
    return;
  }
  lastToast = { key, at: now };
  show();
}
```

**Registrarlos en `src/app/app.config.ts`.** Aquí hay una **diferencia con la guía**: la guía «sustituye» el `provideHttpClient()` que trajo su ISS-02, pero en MovilCare **no existe** `provideHttpClient` (Angular 22 declara `HttpClient` con `providedIn: 'root'` y `HttpBackend → FetchBackend` por defecto, por eso la app funcionaba sin él). Con interceptores funcionales sí hace falta declararlo, así que se **agrega por primera vez**:

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';

// dentro de `providers`, después de provideRouter(...):
// el orden importa — auth va primero (es el más externo): añade el Bearer y
// reintenta; error queda detrás y ve el 401 crudo antes del refresco.
provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
```

**Notas:**

- **Un responsable por código.** `errorInterceptor` va *detrás* de `authInterceptor`, así que ve el `401` crudo antes del refresco: no avisa, porque el aviso definitivo lo da el interceptor de sesión al limpiar («Sesión vencida»). El `400` lo pinta el formulario con `toApiMessage`; `403`, `404`, `409`, red (`0`) y `5xx` se anuncian aquí, una vez por ráfaga (`toastOnce`).
- El `403` es el caso propio de MovilCare: con sesión pero **sin** el rol `admin`, `HasResourceAccess` responde «No tiene autorización para ejecutar esta operación.» y el toast traduce a «Acceso denegado».
- `TOKEN_ENDPOINTS` y `AUTH_ENTRY` usan las tres rutas de sesión reales de `apps/security/urls.py` (`auth/login/`, `auth/refresh/`, `auth/logout/`): ahí no se pone `Authorization` (el refresh va en el cuerpo) y sus errores se explican en el formulario.
- El single-flight (`??=` + `shareReplay`) garantiza que dos `401` simultáneos produzcan **un solo** `POST /api/auth/refresh/`; `finalize` libera el candado aunque el refresh falle.

### Evidencia

- Captura de `auth-interceptor.ts` con el single-flight y `redirectToLogin()`.
- Captura de `app.config.ts` con `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`.

## 08.6. Pantallas: `/login` y `/perfil`

Genera los dos componentes (van en una carpeta nueva `features/auth/`):

```bash
ng generate component features/auth/login --skip-tests --defaults
ng generate component features/auth/profile --skip-tests --defaults
```

**`login.ts`** — un campo para usuario o correo; el JSON se arma según lo escrito, porque `identifier` **no existe** en el contrato:

```typescript
import { Component, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { LoginRequest } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth';
import { toApiMessage } from '../../../core/utils/to-api-message';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
  host: { class: 'block' },
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { identifier, password } = this.form.getRawValue();
    // Django acepta `username`, `email` o ambos: se envía uno, nunca `identifier`.
    const value = identifier.trim();
    const credentials: LoginRequest = value.includes('@')
      ? { email: value, password }
      : { username: value, password };

    this.auth.login(credentials).subscribe({
      next: () => {
        void this.router.navigateByUrl(this.returnUrl());
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(toApiMessage(error));
      },
    });
  }

  /** `returnUrl` lo escribe el interceptor; solo se acepta una ruta interna. */
  private returnUrl(): string {
    const requested =
      this.route.snapshot.queryParamMap.get('returnUrl') ?? '/clientes';
    return requested.startsWith('/') && !requested.startsWith('/login')
      ? requested
      : '/clientes';
  }
}
```

**`login.html`** — `p-card` envuelve el formulario; `p-password` lleva `[toggleMask]="true"` y `[fluid]="true"`, el error de credenciales sale en `p-message` y el botón usa `[loading]`:

```html
<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
  <p-card header="Iniciar sesión" class="w-full max-w-md">
    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="flex flex-col gap-4"
    >
      <div class="flex flex-col gap-2">
        <label for="identifier" class="text-sm font-medium">
          Usuario o correo
        </label>
        <input
          pInputText
          id="identifier"
          formControlName="identifier"
          autocomplete="username"
          placeholder="admin o admin@movilcare.test"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="password" class="text-sm font-medium">
          Contraseña
        </label>
        <p-password
          id="password"
          formControlName="password"
          [toggleMask]="true"
          [fluid]="true"
          [feedback]="false"
          autocomplete="current-password"
        />
      </div>

      @if (error()) {
        <p-message
          severity="error"
          [text]="error()"
          styleClass="w-full"
        />
      }

      <button
        pButton
        type="submit"
        [loading]="loading()"
        class="w-full"
      >
        <span pButtonLabel>Entrar</span>
      </button>
    </form>
  </p-card>
</div>
```

**`profile.ts`** — lee del `SessionStore` y ofrece las dos acciones:

```typescript
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { AuthService } from '../../../core/services/auth';
import { Notification } from '../../../core/services/notification';
import { SessionStore } from '../../../core/services/session-store';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';

@Component({
  selector: 'app-profile',
  imports: [
    ButtonModule,
    CardModule,
    PageHeader,
    StatusTag,
    TagModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  host: { class: 'block' },
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(Notification);
  private readonly router = inject(Router);
  readonly session = inject(SessionStore);

  readonly refreshing = signal(false);

  /** Vuelve a pedir /auth/profile/ y /auth/permissions/ sin cerrar sesión. */
  refresh(): void {
    this.refreshing.set(true);
    this.auth.me().subscribe({
      next: () => {
        this.refreshing.set(false);
        this.notify.success('Sesión sincronizada');
      },
      error: () => this.refreshing.set(false),
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.notify.info('Sesión cerrada');
        void this.router.navigate(['/login']);
      },
    });
  }
}
```

**`profile.html`** — sus dos acciones cuelgan del `app-page-header` (que ya existe en `shared/ui/page-header`) y sus tarjetas solo leen `signal`s:

```html
<app-page-header
  title="Mi sesión"
  [subtitle]="session.user()?.username ?? ''"
>
  <button
    pButton
    severity="secondary"
    outlined
    [loading]="refreshing()"
    (click)="refresh()"
  >
    <i pButtonIcon class="pi pi-refresh"></i>
    <span pButtonLabel>Refrescar desde el backend</span>
  </button>

  <button pButton severity="danger" outlined (click)="logout()">
    <i pButtonIcon class="pi pi-sign-out"></i>
    <span pButtonLabel>Salir</span>
  </button>
</app-page-header>

<div class="mt-6 grid gap-4 md:grid-cols-2">
  <p-card header="Usuario">
    <dl class="flex flex-col gap-3 text-sm">
      <div class="flex items-center justify-between gap-4">
        <dt class="text-slate-500">Usuario</dt>
        <dd class="font-medium">{{ session.user()?.username }}</dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-slate-500">Correo</dt>
        <dd class="font-medium">{{ session.user()?.email }}</dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-slate-500">Nombre</dt>
        <dd class="font-medium">
          {{ session.user()?.firstName }}
          {{ session.user()?.lastName }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-slate-500">Estado</dt>
        <dd>
          @if (session.user(); as user) {
            <app-status-tag [status]="user.status" />
          }
        </dd>
      </div>
    </dl>
  </p-card>

  <p-card header="Roles y permisos">
    <p class="m-0 text-sm text-slate-500">
      {{ session.permissionCount() }} permisos efectivos
    </p>

    <div class="mt-3 flex flex-wrap gap-2">
      @for (role of session.roles(); track role) {
        <p-tag [value]="role" severity="info" [rounded]="true" />
      } @empty {
        <p-tag value="Sin rol" severity="secondary" [rounded]="true" />
      }
    </div>
  </p-card>
</div>
```

**Rutas** (`src/app/app.routes.ts`), sobre el estado **post-ISS-07**:

```typescript
// antes de la ruta '' que monta Shell (junto a 'construir')
{
  path: 'login',
  title: 'Iniciar sesión · MovilCare',
  loadComponent: () =>
    import('./features/auth/login/login').then((m) => m.Login),
},

// dentro de `children`, después de 'dashboard'
{
  path: 'perfil',
  title: 'Mi sesión · MovilCare',
  loadComponent: () =>
    import('./features/auth/profile/profile').then((m) => m.Profile),
},
```

**Notas:**

- `/login` va **fuera** del `Shell` (se ve a pantalla completa, sin menú ni toast); `/perfil` entra como hija de `Shell` (con encabezado, menú y `p-toast`).
- El respaldo del `returnUrl` es **`/clientes`** (adaptado: en MovilCare el comodín `''` redirige a `/clientes`, no a `/dashboard`); además se rechaza cualquier `returnUrl` que no empiece por `/` o que apunte a `/login` (evita redirecciones externas).
- **El menú no se toca en este ISS** (los guards y el filtrado de ítems son el ISS-09): `/perfil` se llega escribiendo la URL, como en la guía.
- `login.css` y `profile.css` quedan **sin reglas** (todo es Tailwind + PrimeNG, igual que el resto del proyecto).
- Los módulos `CardModule`, `PasswordModule` y `TagModule` existen en PrimeNG 22 (`p-card`, `p-password` con `toggleMask`/`fluid`, `p-tag`), y `p-message` con `severity`/`text` ya se usa en los formularios de la Fase I.

### Evidencia

- Captura de `/login` con el formulario y el `p-message` de error.
- Captura de `/perfil` con usuario, «N permisos efectivos» y los tags de rol.
- Captura de `app.routes.ts` con las rutas `login` (fuera de `Shell`) y `perfil` (dentro de `children`).

## 08.7. La sesión en el shell

`aside.ts`/`aside.html` de MovilCare **ya traían** el bloque de sesión preparado (`showSession`, `username`, `roleLabel`, `permissionCount` y la salida `logoutRequested`), pero `Shell` no le pasaba nada: el bloque nunca se pintaba. Este ISS lo alimenta con el `SessionStore` y conecta el botón de cierre del lateral.

**`src/app/layout/shell/shell.ts`** — tres inyectables nuevos, un `computed` y un método:

```typescript
import { AuthService } from '../../core/services/auth';
import { Notification } from '../../core/services/notification';
import { SessionStore } from '../../core/services/session-store';

// junto a los demás inject de la clase Shell (público: se usa en la plantilla)
readonly session = inject(SessionStore);
private readonly auth = inject(AuthService);
private readonly notify = inject(Notification);

// en el mapa de pageTitle, además de las entradas del ISS-07
'/perfil': 'Mi sesión',

// computed nuevo
readonly roleLabel = computed(() =>
  this.session.roles().join(', ') || 'Sin rol',
);

// método nuevo
logout(): void {
  this.auth.logout().subscribe({
    next: () => {
      this.notify.info('Sesión cerrada');
      void this.router.navigate(['/login']);
    },
  });
}
```

**`src/app/layout/shell/shell.html`** — el bloque `<app-aside>` pasa a recibir la sesión:

```html
<!-- antes -->
<app-aside
  [appName]="'MovilCare'"
  [items]="menuItems"
  (navigated)="closeMenu()"
/>

<!-- después -->
<app-aside
  [appName]="'MovilCare'"
  [items]="menuItems"
  [showSession]="session.isAuthenticated()"
  [username]="session.user()?.username ?? ''"
  [roleLabel]="roleLabel()"
  [permissionCount]="session.permissionCount()"
  (navigated)="closeMenu()"
  (logoutRequested)="logout()"
/>
```

**Notas:**

- `showSession` es `isAuthenticated()`: **sin sesión el bloque no se pinta** (nunca se ve «Invitado» con la app en frío).
- El «Salir» del lateral y el «Salir» de `/perfil` comparten `AuthService.logout()`: mandan `POST /api/auth/logout/` con el refresh, reciben `204`, `finalize` limpia `movilcare.session.v1` aunque el backend falle, y se navega a `/login`.
- `roleLabel` junta los `roles()` con coma («admin») o muestra «Sin rol» si la matriz vino vacía; `permissionCount` es el mismo `computed` que lee `/perfil`.
- **El menú (`menuItems`) sigue completo en este ISS**: filtrar ítems por `canPermission` es ISS-09. Aquí solo se muestra/oculta el bloque de sesión y se cierra la sesión.
- `pageTitle` agrega `'/perfil'` para que el encabezado del shell no diga «MovilCare» genérico dentro de `/perfil` (mismo criterio que las rutas del ISS-07).

### Evidencia

- Captura del lateral con el bloque de sesión (usuario, rol y «N permisos») tras iniciar sesión.
- Captura de `shell.html` con los cinco inputs y `logoutRequested` conectados.
- Captura de `/perfil` con el título «Mi sesión» en el encabezado del shell.

## 08.8. Pruebas

Como los componentes se generaron con `--skip-tests`, creo manualmente los archivos junto a cada pieza:

- `src/app/core/services/auth.spec.ts`
- `src/app/core/services/session-store.spec.ts`
- `src/app/core/interceptors/auth-interceptor.spec.ts`

Las **cuatro** pruebas se centran en: el encadenamiento del login, la limpieza cuando perfil/permisos fallan, `samePath()` con rutas Django + restauración en el constructor, y el single-flight del refresh. Todas usan el mismo arranque de `TestBed` que `customer-api.spec.ts` (`provideHttpClient()` + `provideHttpClientTesting()`); la del interceptor añade `provideRouter([])` y `withInterceptors([authInterceptor])`.

**`core/services/auth.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import {
  EffectivePermission,
  SessionUser,
  TokenPair,
} from '../models/auth.model';
import { AuthService } from './auth';
import { SessionStore } from './session-store';

const PAR: TokenPair = {
  access: 'a1',
  refresh: 'r1',
  tokenType: 'Bearer',
  accessExpiresIn: 3600,
};

const USER: SessionUser = {
  id: 1,
  username: 'admin',
  email: 'admin@movilcare.test',
  firstName: 'Ana',
  lastName: 'Torres',
  status: 'active',
};

const PERMISO: EffectivePermission = {
  method: 'GET',
  path: 'api/customers/',
  roleId: 1,
  roleName: 'admin',
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should store the pair and only then load profile and permissions', () => {
    let emitted: SessionUser | undefined;

    auth
      .login({ username: 'admin', password: 'Admin123!' })
      .subscribe((user) => (emitted = user));

    http
      .expectOne('http://127.0.0.1:8000/api/auth/login/')
      .flush(PAR);

    // el par ya está guardado…
    expect(TestBed.inject(SessionStore).accessToken()).toBe('a1');
    // …pero login() no emite todavía.
    expect(emitted).toBeUndefined();

    http
      .expectOne('http://127.0.0.1:8000/api/auth/profile/')
      .flush(USER);
    http
      .expectOne('http://127.0.0.1:8000/api/auth/permissions/')
      .flush({ permissions: [PERMISO] });

    expect(emitted).toEqual(USER);
    expect(TestBed.inject(SessionStore).permissionCount()).toBe(1);
    expect(TestBed.inject(SessionStore).user()).toEqual(USER);
  });

  it('should clear the session when profile fails after the login', () => {
    // ya había una sesión: el fallo posterior tiene que dejar todo limpio.
    TestBed.inject(SessionStore).setTokens(PAR);

    let failed = false;
    auth
      .login({ username: 'admin', password: 'x' })
      .subscribe({ error: () => (failed = true) });

    http
      .expectOne('http://127.0.0.1:8000/api/auth/login/')
      .flush(PAR);

    // forkJoin lanza profile y permissions en paralelo: se resuelve primero
    // la de permisos para que la rama de perfil sea la que falla.
    http
      .expectOne('http://127.0.0.1:8000/api/auth/permissions/')
      .flush({ permissions: [] });
    http
      .expectOne('http://127.0.0.1:8000/api/auth/profile/')
      .flush(
        { detail: 'Token expirado.' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(failed).toBe(true);
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false);
    expect(TestBed.inject(SessionStore).user()).toBeNull();
  });
});
```

**`core/services/session-store.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import {
  EffectivePermission,
  SessionUser,
  TokenPair,
} from '../models/auth.model';
import { SessionStore } from './session-store';

const PAR: TokenPair = {
  access: 'a1',
  refresh: 'r1',
  tokenType: 'Bearer',
  accessExpiresIn: 3600,
};

const USER: SessionUser = {
  id: 1,
  username: 'admin',
  email: 'admin@movilcare.test',
  firstName: 'Ana',
  lastName: 'Torres',
  status: 'active',
};

const PERMISO: EffectivePermission = {
  method: 'GET',
  path: 'api/customers/',
  roleId: 1,
  roleName: 'admin',
};

describe('SessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => localStorage.clear());

  it('should match <int:pk>, ignore the trailing slash and restore the session', () => {
    const store = TestBed.inject(SessionStore);

    store.setTokens(PAR);
    store.setUser(USER, [
      PERMISO,
      { ...PERMISO, method: 'PATCH', path: 'api/customers/<int:pk>/' },
    ]);

    // `resource.route` es la ruta Django: sin barra inicial, con conversor.
    expect(store.canPermission('GET /api/customers')).toBe(true);
    expect(store.canPermission('PATCH /api/customers/7')).toBe(true);
    expect(store.canPermission('DELETE /api/customers/7')).toBe(false);
    expect(store.roles()).toEqual(['admin']);
    expect(store.permissionCount()).toBe(2);
    expect(store.isAuthenticated()).toBe(true);

    // El constructor de SessionStore restaura desde localStorage.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const restored = TestBed.inject(SessionStore);
    expect(restored.accessToken()).toBe('a1');
    expect(restored.user()).toEqual(USER);
    expect(restored.canPermission('GET /api/customers')).toBe(true);
  });
});
```

**`core/interceptors/auth-interceptor.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CustomerApi } from '../../features/customers/customer-api';
import { TokenPair } from '../models/auth.model';
import { SessionStore } from '../services/session-store';
import { authInterceptor } from './auth-interceptor';

const PAR: TokenPair = {
  access: 'a1',
  refresh: 'r1',
  tokenType: 'Bearer',
  accessExpiresIn: 3600,
};

describe('authInterceptor', () => {
  let store: SessionStore;
  let api: CustomerApi;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    store = TestBed.inject(SessionStore);
    api = TestBed.inject(CustomerApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should attach Bearer and refresh only once for two 401', () => {
    store.setTokens({ ...PAR, access: 'viejo' });

    api.list().subscribe();
    api.list().subscribe();

    const original = http.match('http://127.0.0.1:8000/api/customers/');
    expect(original.length).toBe(2);
    expect(original[0].request.headers.get('Authorization')).toBe(
      'Bearer viejo',
    );

    original[0].flush(
      { detail: 'vencido' },
      { status: 401, statusText: 'Unauthorized' },
    );
    original[1].flush(
      { detail: 'vencido' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // Single-flight: una sola llamada al refresh para las dos peticiones,
    // y sin Authorization (el refresh va en el cuerpo).
    const refresh = http.expectOne('http://127.0.0.1:8000/api/auth/refresh/');
    expect(refresh.request.body).toEqual({ refresh: 'r1' });
    expect(refresh.request.headers.get('Authorization')).toBeNull();
    refresh.flush({ ...PAR, access: 'nuevo', refresh: 'r2' });

    const retried = http.match('http://127.0.0.1:8000/api/customers/');
    expect(retried.length).toBe(2);
    retried.forEach((request) => {
      expect(request.request.headers.get('Authorization')).toBe(
        'Bearer nuevo',
      );
      request.flush([]);
    });
  });
});
```

**Notas:**

- Si el single-flight se rompe, el `expectOne` del refresh falla con «expected one matching request, found 2»: la prueba nombra el defecto antes de que aparezca en la pestaña Network.
- En la segunda prueba de `auth.spec.ts` se resuelve **primero** `permissions` y luego `profile`: `forkJoin` emite solo si las dos completan, así que el `401` del perfil es el que dispara el `catchError` que limpia la sesión (y `permissions`, ya completada, no queda en vuelo para `http.verify()`).
- Los specs llaman `localStorage.clear()` antes y después: `SessionStore` es raíz y su constructor restaura de `localStorage`, así que una sesión de otra prueba contaminaría la siguiente.
- Ejecuta `ng test --watch=false` (las cuatro pruebas nuevas se suman a la suite) y `ng build` (debe terminar en código **0**; el aviso de presupuesto de los 550 kB que ya aparecía sigue siendo solo un aviso).

### Evidencia

- Captura de la salida de `ng test --watch=false` con las cuatro pruebas nuevas en verde.
- Captura de `ng build` terminando en código 0.

## Cómo probarlo

**Previo:** backend en `:8000`, usuario `active` con el rol `admin` (`python manage.py seed_rbac --username <tu_usuario>` desde `app-movilcare/backend`) y los toggles `AllowAny` provisionales restaurados («Adelanto importante» del Objetivo). Realiza las verificaciones en el siguiente orden:

1. `curl -s -X POST http://127.0.0.1:8000/api/auth/login/ -H 'Content-Type: application/json' -d '{"username":"<tu_usuario>","password":"<tu_password>"}'` → **cuatro** claves: `access`, `refresh`, `tokenType`, `accessExpiresIn`; el cuerpo **no** trae el usuario.
2. Con ese `access`: `curl -s http://127.0.0.1:8000/api/auth/profile/ -H "Authorization: Bearer <access>"` → el usuario directo (`firstName`/`lastName`, sin avatar); `curl -s http://127.0.0.1:8000/api/auth/permissions/ -H "Authorization: Bearer <access>"` → `{"permissions":[…]}` con las concesiones del rol `admin`.
3. Repite el refresh dos veces con el mismo valor: el primero da `200` con par nuevo (el anterior queda `replaced_by`); el segundo, `401` «Refresh inválido.», porque la familia entera se revocó por reuso.
4. Network tras iniciar sesión en la UI: `POST /api/auth/login/` seguido de `GET /api/auth/profile/` y `GET /api/auth/permissions/` **en paralelo** (las dos a la vez, no en cadena).
5. Con la sesión borrada (`localStorage` limpio o ventana incógnita), entra a `http://localhost:4200/clientes`: la primera petición de negocio responde `401`, aparece el toast «Sesión vencida» y acabas en `/login?returnUrl=/clientes`. Entra con tus credenciales y el `returnUrl` te devuelve a `/clientes`.
6. Escribe una contraseña mala en `/login`: te quedas en la pantalla con el `p-message` «Credenciales inválidas.» y en Network **no** hay `GET /auth/profile/` ni `GET /auth/permissions/` (el login no emitió).
7. Con sesión válida, cambia el valor de `access` dentro de `movilcare.session.v1` por basura y navega: `401` → **un solo** `POST /api/auth/refresh/` → los reintentos salen con el `access` nuevo (`200`). Si el refresh también falla, se limpia la sesión y vuelves a `/login?returnUrl=…`.
8. Entra a `/perfil` por URL: muestra usuario, correo, nombre, estado con `app-status-tag`, «N permisos efectivos» y los tags de rol; el lateral muestra el mismo bloque de sesión. Pulsa «Refrescar desde el backend»: la red repite `GET /auth/profile/` + `GET /auth/permissions/` y aparece «Sesión sincronizada». Recarga con `F5`: la sesión sobrevive (`movilcare.session.v1`).
9. Pulsa «Salir» (en `/perfil` o en el botón del lateral): `POST /api/auth/logout/` con `204`, `movilcare.session.v1` desaparece, vuelves a `/login` y el bloque de sesión del lateral se esconde. *(Caso 403: con un usuario **sin** el rol `admin`, cualquier operación de negocio responde `403` y el toast «Acceso denegado» lo anuncia.)*
10. Ejecuta `ng test --watch=false` y `ng build`.

## Criterios de aceptación

| Código | Criterio | Resultado |
|---|---|---|
| AC-08-01 | El login envía `{username\|email, password}` y recibe **solo** `{access, refresh, tokenType, accessExpiresIn}` (sin identidad en la respuesta). | Pendiente de verificación |
| AC-08-02 | `login()` guarda el par y **no emite** hasta que responden `/auth/profile/` y `/auth/permissions/`; si alguna falla, limpia la sesión. | Pendiente de verificación |
| AC-08-03 | `SessionStore` expone los cuatro `signal` (`accessToken`, `refreshToken`, `user`, `permissions`) y los tres `computed` (`isAuthenticated`, `roles`, `permissionCount`). | Pendiente de verificación |
| AC-08-04 | **Adaptada:** `canPermission` compara `MÉTODO /ruta` contra las rutas Django de MovilCare (`api/customers/<int:pk>/`, sin barra inicial), resolviendo `<…>`/`:id` como comodín e ignorando la barra final. | Pendiente de verificación |
| AC-08-05 | La sesión se guarda en `movilcare.session.v1` y se restaura en el constructor (sobrevive `F5`). | Pendiente de verificación |
| AC-08-06 | Toda petición de negocio lleva `Authorization: Bearer <access>`; `login`, `refresh` y `logout` **no**. | Pendiente de verificación |
| AC-08-07 | Dos `401` simultáneos producen **un** `POST /api/auth/refresh/` y **dos** reintentos con el `access` nuevo. | Pendiente de verificación |
| AC-08-08 | Si el refresh falla (o no hay refresh token), se limpia la sesión y se navega a `/login` con `returnUrl`. | Pendiente de verificación |
| AC-08-09 | `errorInterceptor` avisa de `403`, `404`, `409`, red y `5xx`, sin duplicar el `400` (lo pinta el formulario) ni el `401` (lo resuelve el interceptor de sesión). | Pendiente de verificación |
| AC-08-10 | `/login` valida, muestra el error en `p-message` y vuelve al `returnUrl` (respaldo `/clientes`); `/perfil` muestra usuario, roles, permisos y los botones «Refrescar desde el backend» y «Salir»; el lateral muestra el bloque de sesión y cierra con su «Salir». | Pendiente de verificación |
| AC-08-11 | Las cuatro pruebas nuevas pasan con `ng test --watch=false`, `ng build` termina en código 0 y los CSS de `login` y `profile` no tienen reglas. | Pendiente de verificación |

**Nota sobre las verificaciones:** AC-08-03, AC-08-04, AC-08-05, AC-08-07 y AC-08-11 se comprueban con las pruebas unitarias y en el navegador **sin** depender del backend; AC-08-01, AC-08-02, AC-08-06, AC-08-08, AC-08-09 y AC-08-10 necesitan el backend en `:8000` con los toggles `AllowAny` restaurados (sin sesión → `401` → `/login`; con sesión pero sin rol → `403`). El endpoint nuevo `GET /api/auth/permissions/` (sección 08.1) debe estar aplicado (`migrate` no lo necesita: no toca modelos) antes de verificar AC-08-01, AC-08-02, AC-08-07 y AC-08-10.

## Verificación del ISS

Antes de dar por finalizado el ISS-08, comprobaré cada criterio de aceptación y adjuntaré las capturas correspondientes (`image-125.png` en adelante). Con esta unidad arranca **Fase II · Auth con RBAC** del frontend: la sesión, los dos interceptores y las pantallas de login y perfil quedan operativas; los guards y el filtrado del menú serán el ISS-09.

El incremento se considerará aprobado cuando todas las verificaciones hayan finalizado correctamente.

```text
Todos los criterios AC-08 aprobados → Fase II abierta; avanzar al ISS-09.
Algún criterio AC-08 pendiente o fallido → corregir y repetir la prueba.
```
