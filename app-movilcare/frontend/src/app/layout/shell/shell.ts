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
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Footer, Header, Aside],
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