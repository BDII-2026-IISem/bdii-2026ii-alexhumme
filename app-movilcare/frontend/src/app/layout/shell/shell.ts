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
import { AuthService } from '../../core/services/auth';
import { Notification } from '../../core/services/notification';
import { SessionStore } from '../../core/services/session-store';

import { visibleNav } from './nav.config';
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
  readonly session = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(Notification);

  readonly menuOpen = signal(false);

  private readonly currentUrl = signal(this.router.url);

  /** El menú se recalcula cuando cambian los permisos: sin recargar. */
  readonly navGroups = computed<MenuItem[]>(() =>
    visibleNav((permission) => this.session.canPermission(permission)).map(
      (group) => ({
        label: group.label,
        items: group.items.map<MenuItem>((item) => ({
          label: item.label,
          icon: item.icon,
          routerLink: item.routerLink,
        })),
      }),
    ),
  );

  readonly userItems = computed<MenuItem[]>(() => [
    {
      label: 'Mi sesión',
      icon: 'pi pi-user',
      routerLink: '/perfil',
    },
    {
      label: 'Actualizar permisos',
      icon: 'pi pi-refresh',
      command: () => this.refreshPermissions(),
    },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ]);

  readonly pageTitle = computed(() => {
    const url = this.currentUrl()
      .split('?')[0]
      .replace(/\/+$/, '');

    const titles: Record<string, string> = {
      '/dashboard': 'Panel',
      '/perfil': 'Mi sesion',
      '/clientes': 'Clientes',
      '/productos': 'Productos',
      '/unidades-serializadas': 'Unidades serializadas',
      '/ventas': 'Ventas',
      '/detalle-ventas': 'Líneas de venta',
      '/forbidden': 'Acceso denegado',
    };

    // `/ventas/61` no está en el mapa: se resuelve por prefijo.
    if (url.startsWith('/ventas/')) {
      return 'Detalle de venta';
    }

    return titles[url] ?? 'MovilCare';
  });

  readonly roleLabel = computed(() =>
    this.session.roles().join(', ') || 'Sin rol',
  );

  /** Iniciales del avatar del header: dos letras del usuario. */
  readonly initials = computed(() => {
    const name = this.session.user()?.username ?? '';
    return name.slice(0, 2).toUpperCase() || 'IN';
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

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.notify.info('Sesión cerrada');
        void this.router.navigate(['/login']);
      },
    });
  }

  /** GET /profile + /permissions otra vez: el menú se repinta solo. */
  refreshPermissions(): void {
    this.auth.me().subscribe({
      next: () =>
        this.notify.success(
          'Permisos actualizados',
          'Menú y botones leen la matriz otra vez.',
        ),
      error: () =>
        this.notify.error(
          'No se pudieron actualizar los permisos',
          'Vuelve a iniciar sesión.',
        ),
    });
  }
}