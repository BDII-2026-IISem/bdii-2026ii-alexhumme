import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';

import { Footer } from '../footer/footer';
import { Header } from '../header/header';
import { Aside } from '../aside/aside';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuItem } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    Footer,
    Header,
    Aside,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);

  private readonly currentUrl = signal(this.router.url);

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

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.menuOpen.set(false);
      });
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}