# Informe técnico — Frontend Angular (MovilCare)

Este documento recoge el desarrollo por unidades del frontend del proyecto MovilCare, desde la instalacion de herramientas de node hastla creacion de interfaces. Cada unidad describe el objetivo, las acciones realizadas, el código resultante y las evidencias asociadas.

---

## Unidad ISS-00 — Requisitos previos
### Requisitos previos
```bash
node -v     # v20 o superior
npm -v      # 10 o superior
python3 --version   # 3.12 recomendado
```

### Evidencia
![alt text](image.png)

## Unidad ISS-01 — Bootstrap Angular 22 con CLI

### Creacion del workspace
```bash
npx @angular/cli@22 new frontend \
  --directory . \
  --style=tailwind \
  --ssr=false \s
  --routing \
  --zoneless \
  --skip-git \
  --package-manager=npm
```
### Evidencia
![alt text](image-1.png)


### Instalacion de Tailwind
```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

### Evidencia
![alt text](image-8.png)
![alt text](image-9.png)

### Instalacion de dependencias
```bash
npm install primeng @primeuix/themes primeicons @angular/cdk
```
### Evidencia
![alt text](image-2.png)

### Estilizado con Tailwind 4
`src/styles.css`
```css
@import "tailwindcss";
@import "primeicons/primeicons.css";

@layer base {
  html, body { height: 100%; }
  body {
    @apply bg-slate-100 text-slate-800 antialiased;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }
}
```
### Evidencia
![alt text](image-3.png)

### PrimeNG Aura
`src/app/app.config.ts`
```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    providePrimeNG({
      ripple: true,
      inputVariant: 'outlined',
      theme: {
        preset: Aura,
        options: { darkModeSelector: '.app-dark', cssLayer: false },
      },
    }),
    MessageService,
    ConfirmationService,
  ],
};
```
### Evidencia
![alt text](image-4.png)

### Ejecucion
`npm run start`
### Evidencia
![alt text](image-7.png)

### Clave de PrimeUI
### Evidencias
![alt text](image-6.png)
![alt text](image-5.png)

### Creacion de componente de ejemplo
```bash
ng generate component demo/ejemplo --standalone --style=css
```
#### `ejemplo.ts`
```ts
import { Component, signal, computed, effect } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

interface Producto {
  nombre: string;
  precio: number;
  activo: boolean;
}

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  imports: [CardModule, ButtonModule, TagModule],
  templateUrl: './ejemplo.html',
  styleUrl: './ejemplo.css',
  host: {
    class: 'block',
  },
})
export class Ejemplo {
  producto = signal<Producto>({
    nombre: 'Café molido 500 g',
    precio: 18000,
    activo: true,
  });

  iva = computed(() => this.producto().precio * 0.19);

  precioFinal = computed(
    () => this.producto().precio + this.iva()
  );

  estadoTexto = computed(
    () => this.producto().activo ? 'Activo' : 'Inactivo'
  );

  constructor() {
    effect(() => {
      const p = this.producto();

      console.log(
        `[ejemplo] ${p.nombre} · ${p.precio} · ${
          p.activo ? 'activo' : 'inactivo'
        }`
      );
    });
  }

  variarPrecio(): void {
    this.producto.update(actual => ({
      ...actual,
      precio: actual.precio + 1000,
    }));
  }

  cambiarEstado(): void {
    this.producto.update(actual => ({
      ...actual,
      activo: !actual.activo,
    }));
  }

  cambiarNombre(nombre: string): void {
    this.producto.update(actual => ({
      ...actual,
      nombre,
    }));
  }

  reiniciar(): void {
    this.producto.set({
      nombre: 'Café molido 500 g',
      precio: 18000,
      activo: true,
    });
  }
}
```
#### ejemplo.html
```html
<p-card header="Objeto producto">
  <div class="flex flex-col gap-4">

    <div>
      <label for="nombre" class="block mb-2 font-medium">
        Nombre del producto
      </label>

      <input
        id="nombre"
        type="text"
        class="w-full rounded-lg border border-slate-300 p-2"
        [value]="producto().nombre"
        (input)="cambiarNombre($any($event.target).value)"
      />

      <p class="mt-2 text-sm text-slate-500">
        Vista previa: {{ producto().nombre }}
      </p>
    </div>

    <div class="rounded-lg bg-slate-50 p-4">
      <p class="text-sm text-slate-500">Precio base</p>
      <p class="text-2xl font-semibold">
        {{ producto().precio }}
      </p>

      <p class="mt-2 text-sm text-slate-500">IVA (19 %)</p>
      <p>{{ iva() }}</p>

      <p class="mt-2 text-sm text-slate-500">Precio con IVA</p>
      <p class="text-xl font-semibold">{{ precioFinal() }}</p>

      <div class="mt-3">
        <p-tag
          [value]="estadoTexto()"
          [severity]="producto().activo ? 'success' : 'danger'"
        />
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <p-button
        label="+1000"
        icon="pi pi-plus"
        (onClick)="variarPrecio()"
      />

      <p-button
        label="Cambiar estado"
        severity="secondary"
        (onClick)="cambiarEstado()"
      />

      <p-button
        label="Reiniciar"
        severity="contrast"
        (onClick)="reiniciar()"
      />
    </div>

    @if (producto().activo) {
      <p class="text-sm text-green-700">
        El producto está activo y disponible.
      </p>
    } @else {
      <p class="text-sm text-red-700">
        Producto inactivo. Se simula un borrado lógico.
      </p>
    }

  </div>
</p-card>
```
#### ejemplo.css
```css
.ejemplo-alcance {
  border-left: 4px solid #429c94;
}
```
#### ejemplo.spec.ts
```ts

import { TestBed } from '@angular/core/testing';
import { Ejemplo } from './ejemplo';

describe('Ejemplo', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ejemplo],
    }).compileComponents();
  });

  it('crea el componente', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calcula el IVA y el precio final', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    const componente = fixture.componentInstance;

    expect(componente.iva()).toBe(3420);
    expect(componente.precioFinal()).toBe(21420);
  });

  it('incrementa el precio en 1000', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    const componente = fixture.componentInstance;

    componente.variarPrecio();

    expect(componente.producto().precio).toBe(19000);
    expect(componente.iva()).toBe(3610);
    expect(componente.precioFinal()).toBe(22610);
  });

  it('cambia el estado del producto', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    const componente = fixture.componentInstance;

    componente.cambiarEstado();

    expect(componente.estadoTexto()).toBe('Inactivo');
  });

  it('cambia el nombre y permite reiniciar', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    const componente = fixture.componentInstance;

    componente.cambiarNombre('Té verde');
    expect(componente.producto().nombre).toBe('Té verde');

    componente.reiniciar();
    expect(componente.producto().nombre).toBe('Café molido 500 g');
    expect(componente.producto().precio).toBe(18000);
    expect(componente.producto().activo).toBe(true);
  });
});
```
#### importacion en la app
```ts

import { Component } from '@angular/core';
import { Ejemplo } from './demo/ejemplo/ejemplo';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Ejemplo],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
```
```html
<main class="min-h-screen bg-slate-100 p-6 text-slate-900">
  <div class="mx-auto max-w-2xl">
    <h1 class="mb-6 text-2xl font-bold">
      Movilcare · Angular 22
    </h1>

    <app-ejemplo />
  </div>
</main>
```
### Evidencias
![alt text](image-12.png)
![alt text](image-13.png)
![alt text](image-14.png)
![alt text](image-15.png)

# Unidad ISS-02 — 
